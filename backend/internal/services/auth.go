package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/kreasinusantara/ui-generator-backend/internal/domain"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
	"github.com/kreasinusantara/ui-generator-backend/internal/repositories"
	"golang.org/x/crypto/bcrypt"
)

const (
	defaultAccessTokenTTL  = 15 * time.Minute
	defaultRefreshTokenTTL = 30 * 24 * time.Hour
	defaultJWTSecret       = "dev-only-change-me"
)

type RegisterInput struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshInput struct {
	RefreshToken string `json:"refreshToken"`
}

type refreshTokenRecord struct {
	UserID        string
	Hash          string
	ExpiresAt     time.Time
	RevokedAt     *time.Time
	RotatedFromID string
}

type tokenClaims struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

func (s *StudioService) seedUsers() {
	ctx := context.Background()
	passwordHash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	adminHash, _ := bcrypt.GenerateFromPassword([]byte("admin12345"), bcrypt.DefaultCost)

	now := time.Now().UTC()
	u1 := domain.User{ID: defaultUserID, Name: "Demo User", Email: "demo@example.com", PasswordHash: string(passwordHash), Role: "user", CreatedAt: now, UpdatedAt: now}
	u2 := domain.User{ID: "user_admin", Name: "Admin User", Email: "admin@example.com", PasswordHash: string(adminHash), Role: "admin", CreatedAt: now, UpdatedAt: now}

	_, _ = s.users.Create(ctx, u1)
	_, _ = s.users.Create(ctx, u2)

	_ = s.wallets.Upsert(ctx, domain.CreditWallet{UserID: u1.ID, Balance: 12})
	_ = s.wallets.Upsert(ctx, domain.CreditWallet{UserID: u2.ID, Balance: 100})
}

// seedAuthUsersDB ensures the demo (user) and admin accounts exist in Postgres,
// letting Postgres generate their UUID ids. Idempotent via ON CONFLICT(email).
func (s *StudioService) seedAuthUsersDB(ctx context.Context) {
	if s.pool == nil {
		return
	}
	seed := []struct {
		Name, Email, Password, Role string
		Credits                     int
	}{
		{"Demo User", "demo@example.com", "password123", "user", 12},
		{"Admin User", "admin@example.com", "admin12345", "admin", 100},
	}
	for _, u := range seed {
		hash, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			continue
		}
		_, _ = s.pool.Exec(ctx, `
			INSERT INTO users (name, email, password_hash, role)
			VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
			u.Name, u.Email, string(hash), u.Role)
		var id string
		if err := s.pool.QueryRow(ctx, `SELECT id FROM users WHERE email=$1`, u.Email).Scan(&id); err != nil {
			continue
		}
		_, _ = s.pool.Exec(ctx, `
			INSERT INTO credit_wallets (user_id, balance)
			VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`, id, u.Credits)
	}
}

func (s *StudioService) Register(input RegisterInput) (domain.AuthSession, error) {
	return s.RegisterWithContext(context.Background(), input)
}

func (s *StudioService) RegisterWithContext(ctx context.Context, input RegisterInput) (domain.AuthSession, error) {
	name := strings.TrimSpace(input.Name)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if name == "" || email == "" || len(input.Password) < 8 {
		return domain.AuthSession{}, apperrors.Validation("name, valid email, and password with at least 8 characters are required")
	}

	var session domain.AuthSession
	err := s.tx.WithTx(ctx, func(txCtx context.Context) error {
		_, err := s.users.FindByEmail(txCtx, email)
		if err == nil {
			return apperrors.Conflict("email is already registered")
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		uID, err := newID()
		if err != nil {
			return err
		}
		now := time.Now().UTC()
		user := domain.User{
			ID:           uID,
			Name:         name,
			Email:        email,
			PasswordHash: string(hash),
			Role:         "user",
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		user, err = s.users.Create(txCtx, user)
		if err != nil {
			return err
		}

		wallet := domain.CreditWallet{
			UserID:  user.ID,
			Balance: 12,
		}
		if err := s.wallets.Upsert(txCtx, wallet); err != nil {
			return err
		}

		txID, err := newID()
		if err != nil {
			return err
		}
		_, err = s.transactions.Create(txCtx, domain.CreditTransaction{
			ID:            txID,
			UserID:        user.ID,
			Type:          "topup",
			Amount:        12,
			BalanceAfter:  12,
			ReferenceType: "topup",
			ReferenceID:   user.ID,
			Description:   "Starter top-up",
		})
		if err != nil {
			return err
		}

		session, err = s.issueSessionLocked(txCtx, user, "")
		if err != nil {
			return err
		}

		auditID, err := newID()
		if err != nil {
			return err
		}
		_ = s.auditLogs.Create(txCtx, repositories.AuditLog{
			ID:           auditID,
			UserID:       user.ID,
			Action:       "register",
			ResourceType: "user",
			ResourceID:   user.ID,
			MetadataJSON: `{}`,
		})
		return nil
	})

	return session, err
}

func (s *StudioService) Login(input LoginInput) (domain.AuthSession, error) {
	return s.LoginWithContext(context.Background(), input)
}

func (s *StudioService) LoginWithContext(ctx context.Context, input LoginInput) (domain.AuthSession, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	var session domain.AuthSession
	err := s.tx.WithTx(ctx, func(txCtx context.Context) error {
		user, err := s.users.FindByEmail(txCtx, email)
		if err != nil {
			auditID, err2 := newID()
			if err2 == nil {
				_ = s.auditLogs.Create(txCtx, repositories.AuditLog{
					ID:           auditID,
					UserID:       "",
					Action:       "login_failed",
					ResourceType: "user",
					ResourceID:   "",
					MetadataJSON: `{"email":"` + email + `"}`,
				})
			}
			return apperrors.Unauthorized("invalid email or password")
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
			auditID, err2 := newID()
			if err2 == nil {
				_ = s.auditLogs.Create(txCtx, repositories.AuditLog{
					ID:           auditID,
					UserID:       user.ID,
					Action:       "login_failed",
					ResourceType: "user",
					ResourceID:   user.ID,
					MetadataJSON: `{"email":"` + email + `"}`,
				})
			}
			return apperrors.Unauthorized("invalid email or password")
		}

		session, err = s.issueSessionLocked(txCtx, user, "")
		if err != nil {
			return err
		}

		auditID, err := newID()
		if err == nil {
			_ = s.auditLogs.Create(txCtx, repositories.AuditLog{
				ID:           auditID,
				UserID:       user.ID,
				Action:       "login_success",
				ResourceType: "user",
				ResourceID:   user.ID,
				MetadataJSON: `{}`,
			})
		}
		return nil
	})

	return session, err
}

func (s *StudioService) Refresh(refreshToken string) (domain.AuthSession, error) {
	return s.RefreshWithContext(context.Background(), refreshToken)
}

func (s *StudioService) RefreshWithContext(ctx context.Context, refreshToken string) (domain.AuthSession, error) {
	hash := hashToken(refreshToken)
	var session domain.AuthSession
	err := s.tx.WithTx(ctx, func(txCtx context.Context) error {
		tokenRecord, err := s.refreshTokens.FindByHash(txCtx, hash)
		if err != nil {
			return apperrors.Unauthorized("invalid refresh token")
		}

		if tokenRecord.RevokedAt != nil {
			_ = s.refreshTokens.RevokeFamily(txCtx, tokenRecord.ID, time.Now().UTC())
			auditID, err := newID()
			if err == nil {
				_ = s.auditLogs.Create(txCtx, repositories.AuditLog{
					ID:           auditID,
					UserID:       tokenRecord.UserID,
					Action:       "refresh_reuse_detected",
					ResourceType: "refresh_token",
					ResourceID:   tokenRecord.ID,
					MetadataJSON: `{"token_id":"` + tokenRecord.ID + `"}`,
				})
			}
			return apperrors.Unauthorized("invalid refresh token")
		}

		if time.Now().UTC().After(tokenRecord.ExpiresAt) {
			return apperrors.Unauthorized("invalid refresh token")
		}

		now := time.Now().UTC()
		if err := s.refreshTokens.Revoke(txCtx, tokenRecord.ID, now); err != nil {
			return err
		}

		user, err := s.users.FindByID(txCtx, tokenRecord.UserID)
		if err != nil {
			return err
		}

		session, err = s.issueSessionLocked(txCtx, user, tokenRecord.ID)
		if err != nil {
			return err
		}

		auditID, err := newID()
		if err == nil {
			_ = s.auditLogs.Create(txCtx, repositories.AuditLog{
				ID:           auditID,
				UserID:       user.ID,
				Action:       "refresh_success",
				ResourceType: "refresh_token",
				ResourceID:   tokenRecord.ID,
				MetadataJSON: `{"token_id":"` + tokenRecord.ID + `"}`,
			})
		}
		return nil
	})

	return session, err
}

func (s *StudioService) Logout(refreshToken string) error {
	return s.LogoutWithContext(context.Background(), "", refreshToken)
}

func (s *StudioService) LogoutWithContext(ctx context.Context, userID string, refreshToken string) error {
	hash := hashToken(refreshToken)
	return s.tx.WithTx(ctx, func(txCtx context.Context) error {
		record, err := s.refreshTokens.FindByHash(txCtx, hash)
		if err != nil {
			return nil
		}
		if userID != "" && record.UserID != userID {
			return apperrors.Forbidden("refresh token does not belong to the authenticated user")
		}
		now := time.Now().UTC()
		if err := s.refreshTokens.Revoke(txCtx, record.ID, now); err != nil {
			return err
		}
		auditID, err := newID()
		if err == nil {
			_ = s.auditLogs.Create(txCtx, repositories.AuditLog{
				ID:           auditID,
				UserID:       record.UserID,
				Action:       "logout",
				ResourceType: "refresh_token",
				ResourceID:   record.ID,
				MetadataJSON: `{}`,
			})
		}
		return nil
	})
}

func (s *StudioService) VerifyAccessToken(token string) (domain.User, error) {
	return s.VerifyAccessTokenWithContext(context.Background(), token)
}

func (s *StudioService) VerifyAccessTokenWithContext(ctx context.Context, token string) (domain.User, error) {
	claims, err := s.parseAccessToken(token)
	if err != nil {
		return domain.User{}, err
	}

	user, err := s.users.FindByID(ctx, claims.Subject)
	if err != nil {
		return domain.User{}, err
	}
	if user.Role != claims.Role {
		return domain.User{}, errors.New("user role mismatch")
	}
	return user, nil
}


func (s *StudioService) issueSessionLocked(ctx context.Context, user domain.User, rotatedFromID string) (domain.AuthSession, error) {
	accessToken, err := s.signAccessToken(user.ID, user.Email, user.Role)
	if err != nil {
		return domain.AuthSession{}, err
	}

	refreshToken, err := randomToken()
	if err != nil {
		return domain.AuthSession{}, err
	}
	refreshTTL := s.refreshTokenTTL
	if refreshTTL <= 0 {
		refreshTTL = defaultRefreshTokenTTL
	}
	expiresAt := time.Now().UTC().Add(refreshTTL)

	recID, err := newID()
	if err != nil {
		return domain.AuthSession{}, err
	}

	record := repositories.RefreshToken{
		ID:            recID,
		UserID:        user.ID,
		Hash:          hashToken(refreshToken),
		ExpiresAt:     expiresAt,
		RotatedFromID: rotatedFromID,
	}

	if err := s.refreshTokens.Create(ctx, record); err != nil {
		return domain.AuthSession{}, err
	}


	return domain.AuthSession{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().UTC().Add(s.accessTokenTTL).UnixMilli(),
	}, nil
}

func (s *StudioService) signAccessToken(userID, email, role string) (string, error) {
	accessTTL := s.accessTokenTTL
	if accessTTL <= 0 {
		accessTTL = defaultAccessTokenTTL
	}
	tokID, err := newID()
	if err != nil {
		return "", err
	}
	now := time.Now().UTC()
	claims := tokenClaims{
		Role:  role,
		Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			Issuer:    "dashboardcraft",
			Audience:  jwt.ClaimStrings{"dashboardcraft-client"},
			ExpiresAt: jwt.NewNumericDate(now.Add(accessTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        tokID,
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := s.jwtSecret
	if strings.TrimSpace(secret) == "" {
		secret = defaultJWTSecret
	}
	return token.SignedString([]byte(secret))
}

func (s *StudioService) parseAccessToken(tokenStr string) (tokenClaims, error) {
	secret := s.jwtSecret
	if strings.TrimSpace(secret) == "" {
		secret = defaultJWTSecret
	}
	token, err := jwt.ParseWithClaims(tokenStr, &tokenClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return tokenClaims{}, err
	}
	claims, ok := token.Claims.(*tokenClaims)
	if !ok || !token.Valid {
		return tokenClaims{}, errors.New("invalid token")
	}
	return *claims, nil
}

func randomToken() (string, error) {
	var bytes [32]byte
	if _, err := io.ReadFull(rand.Reader, bytes[:]); err != nil {
		return "", fmt.Errorf("cryptographic randomness source failed: %w", err)
	}
	return hex.EncodeToString(bytes[:]), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

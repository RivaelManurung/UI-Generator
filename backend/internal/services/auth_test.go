package services

import (
	"context"
	"testing"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/platform/config"
)

func TestRegisterLoginAndVerifyAccessToken(t *testing.T) {
	studio := NewStudioService()

	session, err := studio.Register(RegisterInput{
		Name:     "New User",
		Email:    "new@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if session.User.ID == "" || session.AccessToken == "" || session.RefreshToken == "" {
		t.Fatal("expected complete auth session")
	}

	loggedIn, err := studio.Login(LoginInput{Email: "new@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	user, err := studio.VerifyAccessToken(loggedIn.AccessToken)
	if err != nil {
		t.Fatalf("verify access token: %v", err)
	}
	if user.Email != "new@example.com" {
		t.Fatalf("expected new user, got %s", user.Email)
	}
}

func TestRefreshRotatesTokenAndLogoutRevokes(t *testing.T) {
	studio := NewStudioService()
	session, err := studio.Login(LoginInput{Email: "demo@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	rotated, err := studio.Refresh(session.RefreshToken)
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	if rotated.RefreshToken == session.RefreshToken {
		t.Fatal("expected rotated refresh token")
	}
	if _, err := studio.Refresh(session.RefreshToken); err == nil {
		t.Fatal("expected old refresh token to be revoked")
	}
	if err := studio.Logout(rotated.RefreshToken); err != nil {
		t.Fatalf("logout: %v", err)
	}
	if _, err := studio.Refresh(rotated.RefreshToken); err == nil {
		t.Fatal("expected logged out refresh token to be revoked")
	}
}

func TestProjectOwnershipBlocksOtherUsers(t *testing.T) {
	studio := NewStudioService()
	other, err := studio.Register(RegisterInput{
		Name:     "Other User",
		Email:    "other@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("register other user: %v", err)
	}
	ctx := context.Background()
	projects, err := studio.ListProjectsForUser(ctx, defaultUserID)
	if err != nil {
		t.Fatalf("list projects: %v", err)
	}
	if len(projects) == 0 {
		t.Fatal("expected demo projects")
	}

	if _, _, err := studio.GetProjectForUser(ctx, other.User.ID, projects[0].ID); err == nil {
		t.Fatal("expected ownership check to block project access")
	}
}

func TestAccessTokenUsesConfiguredSecret(t *testing.T) {
	cfgA := config.Config{JWTSecret: "secret-a-which-is-long-enough", AccessTokenTTL: time.Minute, RefreshTokenTTL: time.Hour}
	cfgB := config.Config{JWTSecret: "secret-b-which-is-long-enough", AccessTokenTTL: time.Minute, RefreshTokenTTL: time.Hour}
	studioA := NewStudioServiceWithConfig(cfgA)
	studioB := NewStudioServiceWithConfig(cfgB)

	session, err := studioA.Login(LoginInput{Email: "demo@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if _, err := studioA.VerifyAccessToken(session.AccessToken); err != nil {
		t.Fatalf("expected token to verify with signing secret: %v", err)
	}
	if _, err := studioB.VerifyAccessToken(session.AccessToken); err == nil {
		t.Fatal("expected token signed with another secret to be rejected")
	}
}

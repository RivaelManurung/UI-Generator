package repositories

import (
	"context"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/domain"
)

type UserRepository interface {
	Create(ctx context.Context, user domain.User) (domain.User, error)
	FindByID(ctx context.Context, id string) (domain.User, error)
	FindByEmail(ctx context.Context, email string) (domain.User, error)
	List(ctx context.Context) ([]domain.User, error)
}

type RefreshTokenRepository interface {
	Create(ctx context.Context, token RefreshToken) error
	FindByHash(ctx context.Context, hash string) (RefreshToken, error)
	Revoke(ctx context.Context, id string, revokedAt time.Time) error
	RevokeFamily(ctx context.Context, rotatedFromID string, revokedAt time.Time) error
}

type ProjectRepository interface {
	ListByUser(ctx context.Context, userID string) ([]domain.Project, error)
	Create(ctx context.Context, project domain.Project) (domain.Project, error)
	FindOwned(ctx context.Context, userID string, projectID string) (domain.Project, error)
	UpdateOwned(ctx context.Context, userID string, project domain.Project) (domain.Project, error)
	SoftDeleteOwned(ctx context.Context, userID string, projectID string) error
}

type PageRepository interface {
	CreateOwned(ctx context.Context, userID string, page domain.Page) (domain.Page, error)
	FindOwned(ctx context.Context, userID string, pageID string) (domain.Page, error)
	ListByOwnedProject(ctx context.Context, userID string, projectID string) ([]domain.Page, error)
	SetCurrentVersion(ctx context.Context, userID string, pageID string, versionID string) error
	UpdateOwned(ctx context.Context, userID string, page domain.Page) (domain.Page, error)
	SoftDeleteOwned(ctx context.Context, userID string, pageID string) error
}

type PageVersionRepository interface {
	Create(ctx context.Context, version domain.PageVersion) (domain.PageVersion, error)
	ListOwnedByPage(ctx context.Context, userID string, pageID string) ([]domain.PageVersion, error)
	FindOwned(ctx context.Context, userID string, pageID string, versionID string) (domain.PageVersion, error)
	NextVersionNumber(ctx context.Context, pageID string) (int, error)
	// UpdateGeneratedCode re-writes a version's rendered code in place (theme
	// switching re-renders the same schema with new tokens — no new version, no AI).
	UpdateGeneratedCode(ctx context.Context, versionID string, code string) error
}

type GenerationJobRepository interface {
	Create(ctx context.Context, job domain.GenerationJob) (domain.GenerationJob, error)
	FindOwned(ctx context.Context, userID string, jobID string) (domain.GenerationJob, error)
	ListForAdmin(ctx context.Context) ([]domain.GenerationJob, error)
	UpdateStatus(ctx context.Context, jobID string, status string, errorMessage string) error
}

type CreditWalletRepository interface {
	GetForUpdate(ctx context.Context, userID string) (domain.CreditWallet, error)
	Upsert(ctx context.Context, wallet domain.CreditWallet) error
}

type CreditTransactionRepository interface {
	Create(ctx context.Context, tx domain.CreditTransaction) (domain.CreditTransaction, error)
	ListByUser(ctx context.Context, userID string) ([]domain.CreditTransaction, error)
	FindByIdempotencyKey(ctx context.Context, userID string, key string) (domain.CreditTransaction, error)
}

type ThemeRepository interface {
	List(ctx context.Context) ([]domain.Theme, error)
}

type TemplateRepository interface {
	List(ctx context.Context) ([]domain.Template, error)
}

type AuditLogRepository interface {
	Create(ctx context.Context, log AuditLog) error
	ListForAdmin(ctx context.Context) ([]AuditLog, error)
}

type IdempotencyKeyRepository interface {
	Create(ctx context.Context, key IdempotencyKey) (IdempotencyKey, error)
	Find(ctx context.Context, userID string, operation string, requestKey string) (IdempotencyKey, error)
}

type TxManager interface {
	WithTx(ctx context.Context, fn func(ctx context.Context) error) error
}

type RefreshToken struct {
	ID            string
	UserID        string
	Hash          string
	RevokedAt     *time.Time
	ExpiresAt     time.Time
	RotatedFromID string
	CreatedAt     time.Time
}

type AuditLog struct {
	ID           string
	UserID       string
	Action       string
	ResourceType string
	ResourceID   string
	MetadataJSON string
	CreatedAt    time.Time
}

type IdempotencyKey struct {
	ID           string
	UserID       string
	Operation    string
	RequestKey   string
	ResourceType string
	ResourceID   string
	ResponseJSON []byte
	CreatedAt    time.Time
	ExpiresAt    time.Time
}

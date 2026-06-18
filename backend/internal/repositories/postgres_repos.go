package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kreasinusantara/ui-generator-backend/internal/domain"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/metrics"
	"github.com/kreasinusantara/ui-generator-backend/internal/repositories/db"
)

type txKeyType struct{}

var txKey txKeyType

type SQLTxManager struct {
	pool *pgxpool.Pool
}

func NewSQLTxManager(pool *pgxpool.Pool) *SQLTxManager {
	return &SQLTxManager{pool: pool}
}

func mapDBError(err error, resource string) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return apperrors.NotFound(fmt.Sprintf("%s not found", resource))
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505": // unique_violation
			return apperrors.Conflict(fmt.Sprintf("%s unique constraint violation", resource))
		case "23503": // foreign_key_violation
			return apperrors.Conflict(fmt.Sprintf("%s violates foreign key constraint", resource))
		case "23502": // not_null_violation
			return apperrors.BadRequest(fmt.Sprintf("%s column cannot be null", pgErr.ColumnName))
		case "22P02": // invalid_text_representation (invalid UUID, etc.)
			return apperrors.BadRequest(fmt.Sprintf("invalid %s format", resource))
		}
	}
	return err
}

func (m *SQLTxManager) WithTx(ctx context.Context, fn func(ctx context.Context) error) error {
	tx, err := m.pool.Begin(ctx)
	if err != nil {
		return mapDBError(err, "transaction")
	}
	defer tx.Rollback(ctx)

	q := db.New(tx)
	ctxWithTx := context.WithValue(ctx, txKey, q)
	if err := fn(ctxWithTx); err != nil {
		return err
	}

	return mapDBError(tx.Commit(ctx), "transaction")
}

func toUUID(s string) pgtype.UUID {
	var u pgtype.UUID
	if s == "" {
		return u
	}
	_ = u.Scan(s)
	return u
}

func fromUUID(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	var src [16]byte = u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", src[0:4], src[4:6], src[6:8], src[8:10], src[10:16])
}

func toText(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: s != ""}
}

func fromText(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

func toTimestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: !t.IsZero()}
}

func fromTimestamptz(pt pgtype.Timestamptz) time.Time {
	if !pt.Valid {
		return time.Time{}
	}
	return pt.Time
}

func toNumeric(f float64) pgtype.Numeric {
	var num pgtype.Numeric
	_ = num.Scan(fmt.Sprintf("%f", f))
	return num
}

func fromNumeric(n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0
	}
	f8, err := n.Float64Value()
	if err != nil {
		return 0
	}
	return f8.Float64
}

type PostgresUserRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPostgresUserRepository(pool *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *PostgresUserRepository) q(ctx context.Context) *db.Queries {
	if q, ok := ctx.Value(txKey).(*db.Queries); ok {
		return q
	}
	return r.queries
}

func (r *PostgresUserRepository) Create(ctx context.Context, u domain.User) (domain.User, error) {
	res, err := r.q(ctx).CreateUser(ctx, db.CreateUserParams{
		ID:           toUUID(u.ID),
		Name:         u.Name,
		Email:        u.Email,
		PasswordHash: u.PasswordHash,
		Role:         u.Role,
	})
	if err != nil {
		return domain.User{}, mapDBError(err, "user")
	}
	return domain.User{
		ID:           fromUUID(res.ID),
		Name:         res.Name,
		Email:        res.Email,
		PasswordHash: res.PasswordHash,
		Role:         res.Role,
		CreatedAt:    fromTimestamptz(res.CreatedAt),
		UpdatedAt:    fromTimestamptz(res.UpdatedAt),
	}, nil
}

func (r *PostgresUserRepository) FindByID(ctx context.Context, id string) (domain.User, error) {
	res, err := r.q(ctx).GetUserByID(ctx, toUUID(id))
	if err != nil {
		return domain.User{}, mapDBError(err, "user")
	}
	return domain.User{
		ID:           fromUUID(res.ID),
		Name:         res.Name,
		Email:        res.Email,
		PasswordHash: res.PasswordHash,
		Role:         res.Role,
		CreatedAt:    fromTimestamptz(res.CreatedAt),
		UpdatedAt:    fromTimestamptz(res.UpdatedAt),
	}, nil
}

func (r *PostgresUserRepository) FindByEmail(ctx context.Context, email string) (domain.User, error) {
	res, err := r.q(ctx).GetUserByEmail(ctx, email)
	if err != nil {
		return domain.User{}, mapDBError(err, "user")
	}
	return domain.User{
		ID:           fromUUID(res.ID),
		Name:         res.Name,
		Email:        res.Email,
		PasswordHash: res.PasswordHash,
		Role:         res.Role,
		CreatedAt:    fromTimestamptz(res.CreatedAt),
		UpdatedAt:    fromTimestamptz(res.UpdatedAt),
	}, nil
}

func (r *PostgresUserRepository) List(ctx context.Context) ([]domain.User, error) {
	list, err := r.q(ctx).ListUsers(ctx)
	if err != nil {
		return nil, mapDBError(err, "user")
	}
	res := make([]domain.User, len(list))
	for i, item := range list {
		res[i] = domain.User{
			ID:           fromUUID(item.ID),
			Name:         item.Name,
			Email:        item.Email,
			PasswordHash: item.PasswordHash,
			Role:         item.Role,
			CreatedAt:    fromTimestamptz(item.CreatedAt),
			UpdatedAt:    fromTimestamptz(item.UpdatedAt),
		}
	}
	return res, nil
}

type PostgresRefreshTokenRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPostgresRefreshTokenRepository(pool *pgxpool.Pool) *PostgresRefreshTokenRepository {
	return &PostgresRefreshTokenRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *PostgresRefreshTokenRepository) q(ctx context.Context) *db.Queries {
	if q, ok := ctx.Value(txKey).(*db.Queries); ok {
		return q
	}
	return r.queries
}

func (r *PostgresRefreshTokenRepository) Create(ctx context.Context, token RefreshToken) error {
	err := r.q(ctx).CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
		ID:            toUUID(token.ID),
		UserID:        toUUID(token.UserID),
		TokenHash:     token.Hash,
		ExpiresAt:     toTimestamptz(token.ExpiresAt),
		RotatedFromID: toUUID(token.RotatedFromID),
	})
	return mapDBError(err, "refresh token")
}

func (r *PostgresRefreshTokenRepository) FindByHash(ctx context.Context, hash string) (RefreshToken, error) {
	res, err := r.q(ctx).GetRefreshTokenByHash(ctx, hash)
	if err != nil {
		return RefreshToken{}, mapDBError(err, "refresh token")
	}
	var revokedAt *time.Time
	if res.RevokedAt.Valid {
		t := res.RevokedAt.Time
		revokedAt = &t
	}
	return RefreshToken{
		ID:            fromUUID(res.ID),
		UserID:        fromUUID(res.UserID),
		Hash:          res.TokenHash,
		RevokedAt:     revokedAt,
		ExpiresAt:     fromTimestamptz(res.ExpiresAt),
		RotatedFromID: fromUUID(res.RotatedFromID),
		CreatedAt:     fromTimestamptz(res.CreatedAt),
	}, nil
}

func (r *PostgresRefreshTokenRepository) Revoke(ctx context.Context, id string, revokedAt time.Time) error {
	err := r.q(ctx).RevokeRefreshToken(ctx, db.RevokeRefreshTokenParams{
		ID:        toUUID(id),
		RevokedAt: toTimestamptz(revokedAt),
	})
	return mapDBError(err, "refresh token")
}

func (r *PostgresRefreshTokenRepository) RevokeFamily(ctx context.Context, rotatedFromID string, revokedAt time.Time) error {
	err := r.q(ctx).RevokeRefreshTokenFamily(ctx, db.RevokeRefreshTokenFamilyParams{
		ID:        toUUID(rotatedFromID),
		RevokedAt: toTimestamptz(revokedAt),
	})
	return mapDBError(err, "refresh token")
}

type PostgresProjectRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPostgresProjectRepository(pool *pgxpool.Pool) *PostgresProjectRepository {
	return &PostgresProjectRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *PostgresProjectRepository) q(ctx context.Context) *db.Queries {
	if q, ok := ctx.Value(txKey).(*db.Queries); ok {
		return q
	}
	return r.queries
}

func (r *PostgresProjectRepository) ListByUser(ctx context.Context, userID string) ([]domain.Project, error) {
	list, err := r.q(ctx).ListProjectsByUser(ctx, toUUID(userID))
	if err != nil {
		return nil, mapDBError(err, "project")
	}
	res := make([]domain.Project, len(list))
	for i, item := range list {
		res[i] = domain.Project{
			ID:               fromUUID(item.ID),
			UserID:           fromUUID(item.UserID),
			Name:             item.Name,
			Description:      item.Description,
			Domain:           item.Domain,
			DefaultThemeSlug: item.DefaultThemeSlug,
			CreatedAt:        fromTimestamptz(item.CreatedAt),
			UpdatedAt:        fromTimestamptz(item.UpdatedAt),
		}
	}
	return res, nil
}

func (r *PostgresProjectRepository) Create(ctx context.Context, project domain.Project) (domain.Project, error) {
	res, err := r.q(ctx).CreateProject(ctx, db.CreateProjectParams{
		ID:               toUUID(project.ID),
		UserID:           toUUID(project.UserID),
		Name:             project.Name,
		Description:      project.Description,
		Domain:           project.Domain,
		DefaultThemeSlug: project.DefaultThemeSlug,
	})
	if err != nil {
		return domain.Project{}, mapDBError(err, "project")
	}
	return domain.Project{
		ID:               fromUUID(res.ID),
		UserID:           fromUUID(res.UserID),
		Name:             res.Name,
		Description:      res.Description,
		Domain:           res.Domain,
		DefaultThemeSlug: res.DefaultThemeSlug,
		CreatedAt:        fromTimestamptz(res.CreatedAt),
		UpdatedAt:        fromTimestamptz(res.UpdatedAt),
	}, nil
}

func (r *PostgresProjectRepository) FindOwned(ctx context.Context, userID string, projectID string) (domain.Project, error) {
	res, err := r.q(ctx).GetOwnedProject(ctx, db.GetOwnedProjectParams{
		ID:     toUUID(projectID),
		UserID: toUUID(userID),
	})
	if err != nil {
		return domain.Project{}, mapDBError(err, "project")
	}
	return domain.Project{
		ID:               fromUUID(res.ID),
		UserID:           fromUUID(res.UserID),
		Name:             res.Name,
		Description:      res.Description,
		Domain:           res.Domain,
		DefaultThemeSlug: res.DefaultThemeSlug,
		CreatedAt:        fromTimestamptz(res.CreatedAt),
		UpdatedAt:        fromTimestamptz(res.UpdatedAt),
	}, nil
}

func (r *PostgresProjectRepository) UpdateOwned(ctx context.Context, userID string, project domain.Project) (domain.Project, error) {
	res, err := r.q(ctx).UpdateOwnedProject(ctx, db.UpdateOwnedProjectParams{
		ID:               toUUID(project.ID),
		UserID:           toUUID(userID),
		Name:             project.Name,
		Description:      project.Description,
		Domain:           project.Domain,
		DefaultThemeSlug: project.DefaultThemeSlug,
	})
	if err != nil {
		return domain.Project{}, mapDBError(err, "project")
	}
	return domain.Project{
		ID:               fromUUID(res.ID),
		UserID:           fromUUID(res.UserID),
		Name:             res.Name,
		Description:      res.Description,
		Domain:           res.Domain,
		DefaultThemeSlug: res.DefaultThemeSlug,
		CreatedAt:        fromTimestamptz(res.CreatedAt),
		UpdatedAt:        fromTimestamptz(res.UpdatedAt),
	}, nil
}

func (r *PostgresProjectRepository) SoftDeleteOwned(ctx context.Context, userID string, projectID string) error {
	err := r.q(ctx).SoftDeleteOwnedProject(ctx, db.SoftDeleteOwnedProjectParams{
		ID:     toUUID(projectID),
		UserID: toUUID(userID),
	})
	return mapDBError(err, "project")
}

type PostgresPageRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPostgresPageRepository(pool *pgxpool.Pool) *PostgresPageRepository {
	return &PostgresPageRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *PostgresPageRepository) q(ctx context.Context) *db.Queries {
	if q, ok := ctx.Value(txKey).(*db.Queries); ok {
		return q
	}
	return r.queries
}

func (r *PostgresPageRepository) CreateOwned(ctx context.Context, userID string, page domain.Page) (domain.Page, error) {
	res, err := r.q(ctx).CreatePage(ctx, db.CreatePageParams{
		ID:       toUUID(page.ID),
		ID_2:     toUUID(page.ProjectID),
		Name:     page.Name,
		Slug:     page.Slug,
		PageType: page.PageType,
		UserID:   toUUID(userID),
	})
	if err != nil {
		return domain.Page{}, mapDBError(err, "page")
	}
	return domain.Page{
		ID:               fromUUID(res.ID),
		ProjectID:        fromUUID(res.ProjectID),
		Name:             res.Name,
		Slug:             res.Slug,
		PageType:         res.PageType,
		CurrentVersionID: fromUUID(res.CurrentVersionID),
		CreatedAt:        fromTimestamptz(res.CreatedAt),
		UpdatedAt:        fromTimestamptz(res.UpdatedAt),
	}, nil
}

func (r *PostgresPageRepository) FindOwned(ctx context.Context, userID string, pageID string) (domain.Page, error) {
	res, err := r.q(ctx).GetOwnedPage(ctx, db.GetOwnedPageParams{
		ID:     toUUID(pageID),
		UserID: toUUID(userID),
	})
	if err != nil {
		return domain.Page{}, mapDBError(err, "page")
	}
	return domain.Page{
		ID:               fromUUID(res.ID),
		ProjectID:        fromUUID(res.ProjectID),
		Name:             res.Name,
		Slug:             res.Slug,
		PageType:         res.PageType,
		CurrentVersionID: fromUUID(res.CurrentVersionID),
		CreatedAt:        fromTimestamptz(res.CreatedAt),
		UpdatedAt:        fromTimestamptz(res.UpdatedAt),
	}, nil
}

func (r *PostgresPageRepository) ListByOwnedProject(ctx context.Context, userID string, projectID string) ([]domain.Page, error) {
	list, err := r.q(ctx).ListOwnedProjectPages(ctx, db.ListOwnedProjectPagesParams{
		ProjectID: toUUID(projectID),
		UserID:    toUUID(userID),
	})
	if err != nil {
		return nil, mapDBError(err, "page")
	}
	res := make([]domain.Page, len(list))
	for i, item := range list {
		res[i] = domain.Page{
			ID:               fromUUID(item.ID),
			ProjectID:        fromUUID(item.ProjectID),
			Name:             item.Name,
			Slug:             item.Slug,
			PageType:         item.PageType,
			CurrentVersionID: fromUUID(item.CurrentVersionID),
			CreatedAt:        fromTimestamptz(item.CreatedAt),
			UpdatedAt:        fromTimestamptz(item.UpdatedAt),
		}
	}
	return res, nil
}

func (r *PostgresPageRepository) SetCurrentVersion(ctx context.Context, userID string, pageID string, versionID string) error {
	err := r.q(ctx).SetCurrentVersion(ctx, db.SetCurrentVersionParams{
		CurrentVersionID: toUUID(versionID),
		ID:               toUUID(pageID),
		UserID:           toUUID(userID),
	})
	return mapDBError(err, "page")
}

func (r *PostgresPageRepository) UpdateOwned(ctx context.Context, userID string, page domain.Page) (domain.Page, error) {
	res, err := r.q(ctx).UpdateOwnedPage(ctx, db.UpdateOwnedPageParams{
		ID:       toUUID(page.ID),
		UserID:   toUUID(userID),
		Name:     page.Name,
		Slug:     page.Slug,
		PageType: page.PageType,
	})
	if err != nil {
		return domain.Page{}, mapDBError(err, "page")
	}
	return domain.Page{
		ID:               fromUUID(res.ID),
		ProjectID:        fromUUID(res.ProjectID),
		Name:             res.Name,
		Slug:             res.Slug,
		PageType:         res.PageType,
		CurrentVersionID: fromUUID(res.CurrentVersionID),
		CreatedAt:        fromTimestamptz(res.CreatedAt),
		UpdatedAt:        fromTimestamptz(res.UpdatedAt),
	}, nil
}

func (r *PostgresPageRepository) SoftDeleteOwned(ctx context.Context, userID string, pageID string) error {
	err := r.q(ctx).SoftDeleteOwnedPage(ctx, db.SoftDeleteOwnedPageParams{
		ID:     toUUID(pageID),
		UserID: toUUID(userID),
	})
	return mapDBError(err, "page")
}

type PostgresPageVersionRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPostgresPageVersionRepository(pool *pgxpool.Pool) *PostgresPageVersionRepository {
	return &PostgresPageVersionRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *PostgresPageVersionRepository) q(ctx context.Context) *db.Queries {
	if q, ok := ctx.Value(txKey).(*db.Queries); ok {
		return q
	}
	return r.queries
}

func (r *PostgresPageVersionRepository) Create(ctx context.Context, version domain.PageVersion) (domain.PageVersion, error) {
	schemaBytes, err := json.Marshal(version.SchemaJSON)
	if err != nil {
		return domain.PageVersion{}, err
	}
	res, err := r.q(ctx).CreatePageVersion(ctx, db.CreatePageVersionParams{
		ID:            toUUID(version.ID),
		PageID:        toUUID(version.PageID),
		VersionNumber: int32(version.VersionNumber),
		Prompt:        version.Prompt,
		SchemaJson:    schemaBytes,
		GeneratedCode: version.GeneratedCode,
		QualityScore:  toNumeric(version.QualityScore),
		CreatedBy:     toUUID(version.CreatedBy),
	})
	if err != nil {
		return domain.PageVersion{}, mapDBError(err, "page version")
	}
	var schemaMap map[string]interface{}
	_ = json.Unmarshal(res.SchemaJson, &schemaMap)
	return domain.PageVersion{
		ID:            fromUUID(res.ID),
		PageID:        fromUUID(res.PageID),
		VersionNumber: int(res.VersionNumber),
		Prompt:        res.Prompt,
		SchemaJSON:    schemaMap,
		GeneratedCode: res.GeneratedCode,
		QualityScore:  fromNumeric(res.QualityScore),
		CreatedBy:     fromUUID(res.CreatedBy),
		CreatedAt:     fromTimestamptz(res.CreatedAt),
	}, nil
}

func (r *PostgresPageVersionRepository) UpdateGeneratedCode(ctx context.Context, versionID string, code string) error {
	if _, err := r.pool.Exec(ctx, "UPDATE page_versions SET generated_code=$1 WHERE id=$2::uuid", code, versionID); err != nil {
		return mapDBError(err, "page version")
	}
	return nil
}

func (r *PostgresPageVersionRepository) ListOwnedByPage(ctx context.Context, userID string, pageID string) ([]domain.PageVersion, error) {
	list, err := r.q(ctx).ListOwnedPageVersions(ctx, db.ListOwnedPageVersionsParams{
		PageID: toUUID(pageID),
		UserID: toUUID(userID),
	})
	if err != nil {
		return nil, mapDBError(err, "page version")
	}
	res := make([]domain.PageVersion, len(list))
	for i, item := range list {
		var schemaMap map[string]interface{}
		_ = json.Unmarshal(item.SchemaJson, &schemaMap)
		res[i] = domain.PageVersion{
			ID:            fromUUID(item.ID),
			PageID:        fromUUID(item.PageID),
			VersionNumber: int(item.VersionNumber),
			Prompt:        item.Prompt,
			SchemaJSON:    schemaMap,
			GeneratedCode: item.GeneratedCode,
			QualityScore:  fromNumeric(item.QualityScore),
			CreatedBy:     fromUUID(item.CreatedBy),
			CreatedAt:     fromTimestamptz(item.CreatedAt),
		}
	}
	return res, nil
}

func (r *PostgresPageVersionRepository) FindOwned(ctx context.Context, userID string, pageID string, versionID string) (domain.PageVersion, error) {
	res, err := r.q(ctx).GetOwnedPageVersion(ctx, db.GetOwnedPageVersionParams{
		ID:     toUUID(versionID),
		PageID: toUUID(pageID),
		UserID: toUUID(userID),
	})
	if err != nil {
		return domain.PageVersion{}, mapDBError(err, "page version")
	}
	var schemaMap map[string]interface{}
	_ = json.Unmarshal(res.SchemaJson, &schemaMap)
	return domain.PageVersion{
		ID:            fromUUID(res.ID),
		PageID:        fromUUID(res.PageID),
		VersionNumber: int(res.VersionNumber),
		Prompt:        res.Prompt,
		SchemaJSON:    schemaMap,
		GeneratedCode: res.GeneratedCode,
		QualityScore:  fromNumeric(res.QualityScore),
		CreatedBy:     fromUUID(res.CreatedBy),
		CreatedAt:     fromTimestamptz(res.CreatedAt),
	}, nil
}

func (r *PostgresPageVersionRepository) NextVersionNumber(ctx context.Context, pageID string) (int, error) {
	res, err := r.q(ctx).NextVersionNumber(ctx, toUUID(pageID))
	if err != nil {
		return 0, mapDBError(err, "page version")
	}
	return int(res), nil
}

type PostgresGenerationJobRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPostgresGenerationJobRepository(pool *pgxpool.Pool) *PostgresGenerationJobRepository {
	return &PostgresGenerationJobRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *PostgresGenerationJobRepository) q(ctx context.Context) *db.Queries {
	if q, ok := ctx.Value(txKey).(*db.Queries); ok {
		return q
	}
	return r.queries
}

func (r *PostgresGenerationJobRepository) Create(ctx context.Context, job domain.GenerationJob) (domain.GenerationJob, error) {
	res, err := r.q(ctx).CreateGenerationJob(ctx, db.CreateGenerationJobParams{
		ID:         toUUID(job.ID),
		UserID:     toUUID(job.UserID),
		ProjectID:  toUUID(job.ProjectID),
		PageID:     toUUID(job.PageID),
		RequestID:  job.RequestID,
		Status:     job.Status,
		Prompt:     job.Prompt,
		PageType:   job.PageType,
		Domain:     job.Domain,
		ThemeSlug:  job.ThemeSlug,
		OutputMode: job.OutputMode,
		CreditCost: int32(job.CreditCost),
	})
	if err != nil {
		return domain.GenerationJob{}, mapDBError(err, "generation job")
	}
	metrics.IncJobStatus(res.Status)
	return domain.GenerationJob{
		ID:           fromUUID(res.ID),
		UserID:       fromUUID(res.UserID),
		ProjectID:    fromUUID(res.ProjectID),
		PageID:       fromUUID(res.PageID),
		RequestID:    res.RequestID,
		Status:       res.Status,
		Prompt:       res.Prompt,
		PageType:     res.PageType,
		Domain:       res.Domain,
		ThemeSlug:    res.ThemeSlug,
		OutputMode:   res.OutputMode,
		CreditCost:   int(res.CreditCost),
		ErrorMessage: fromText(res.ErrorMessage),
		RetryCount:   int(res.RetryCount),
		StartedAt:    fromTimestamptz(res.StartedAt),
		FinishedAt:   fromTimestamptz(res.FinishedAt),
		CreatedAt:    fromTimestamptz(res.CreatedAt),
		UpdatedAt:    fromTimestamptz(res.UpdatedAt),
	}, nil
}

func (r *PostgresGenerationJobRepository) FindByRequestID(ctx context.Context, requestID string) (domain.GenerationJob, error) {
	res, err := r.q(ctx).GetGenerationJobByRequestID(ctx, requestID)
	if err != nil {
		return domain.GenerationJob{}, mapDBError(err, "generation job")
	}
	return domain.GenerationJob{
		ID:           fromUUID(res.ID),
		UserID:       fromUUID(res.UserID),
		ProjectID:    fromUUID(res.ProjectID),
		PageID:       fromUUID(res.PageID),
		RequestID:    res.RequestID,
		Status:       res.Status,
		Prompt:       res.Prompt,
		PageType:     res.PageType,
		Domain:       res.Domain,
		ThemeSlug:    res.ThemeSlug,
		OutputMode:   res.OutputMode,
		CreditCost:   int(res.CreditCost),
		ErrorMessage: fromText(res.ErrorMessage),
		RetryCount:   int(res.RetryCount),
		StartedAt:    fromTimestamptz(res.StartedAt),
		FinishedAt:   fromTimestamptz(res.FinishedAt),
		CreatedAt:    fromTimestamptz(res.CreatedAt),
		UpdatedAt:    fromTimestamptz(res.UpdatedAt),
	}, nil
}

func (r *PostgresGenerationJobRepository) FindOwned(ctx context.Context, userID string, jobID string) (domain.GenerationJob, error) {
	res, err := r.q(ctx).GetOwnedGenerationJob(ctx, db.GetOwnedGenerationJobParams{
		ID:     toUUID(jobID),
		UserID: toUUID(userID),
	})
	if err != nil {
		return domain.GenerationJob{}, mapDBError(err, "generation job")
	}
	return domain.GenerationJob{
		ID:           fromUUID(res.ID),
		UserID:       fromUUID(res.UserID),
		ProjectID:    fromUUID(res.ProjectID),
		PageID:       fromUUID(res.PageID),
		RequestID:    res.RequestID,
		Status:       res.Status,
		Prompt:       res.Prompt,
		PageType:     res.PageType,
		Domain:       res.Domain,
		ThemeSlug:    res.ThemeSlug,
		OutputMode:   res.OutputMode,
		CreditCost:   int(res.CreditCost),
		ErrorMessage: fromText(res.ErrorMessage),
		RetryCount:   int(res.RetryCount),
		StartedAt:    fromTimestamptz(res.StartedAt),
		FinishedAt:   fromTimestamptz(res.FinishedAt),
		CreatedAt:    fromTimestamptz(res.CreatedAt),
		UpdatedAt:    fromTimestamptz(res.UpdatedAt),
	}, nil
}

func (r *PostgresGenerationJobRepository) ListForAdmin(ctx context.Context) ([]domain.GenerationJob, error) {
	list, err := r.q(ctx).ListGenerationJobsForAdmin(ctx)
	if err != nil {
		return nil, mapDBError(err, "generation job")
	}
	res := make([]domain.GenerationJob, len(list))
	for i, item := range list {
		res[i] = domain.GenerationJob{
			ID:           fromUUID(item.ID),
			UserID:       fromUUID(item.UserID),
			ProjectID:    fromUUID(item.ProjectID),
			PageID:       fromUUID(item.PageID),
			RequestID:    item.RequestID,
			Status:       item.Status,
			Prompt:       item.Prompt,
			PageType:     item.PageType,
			Domain:       item.Domain,
			ThemeSlug:    item.ThemeSlug,
			OutputMode:   item.OutputMode,
			CreditCost:   int(item.CreditCost),
			ErrorMessage: fromText(item.ErrorMessage),
			RetryCount:   int(item.RetryCount),
			StartedAt:    fromTimestamptz(item.StartedAt),
			FinishedAt:   fromTimestamptz(item.FinishedAt),
			CreatedAt:    fromTimestamptz(item.CreatedAt),
			UpdatedAt:    fromTimestamptz(item.UpdatedAt),
		}
	}
	return res, nil
}

func (r *PostgresGenerationJobRepository) UpdateStatus(ctx context.Context, jobID string, status string, errorMessage string) error {
	err := r.q(ctx).UpdateGenerationJobStatus(ctx, db.UpdateGenerationJobStatusParams{
		ID:           toUUID(jobID),
		Status:       status,
		ErrorMessage: toText(errorMessage),
	})
	if err == nil {
		metrics.IncJobStatus(status)
	}
	return mapDBError(err, "generation job")
}

type PostgresCreditWalletRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPostgresCreditWalletRepository(pool *pgxpool.Pool) *PostgresCreditWalletRepository {
	return &PostgresCreditWalletRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *PostgresCreditWalletRepository) q(ctx context.Context) *db.Queries {
	if q, ok := ctx.Value(txKey).(*db.Queries); ok {
		return q
	}
	return r.queries
}

func (r *PostgresCreditWalletRepository) GetForUpdate(ctx context.Context, userID string) (domain.CreditWallet, error) {
	res, err := r.q(ctx).GetWalletForUpdate(ctx, toUUID(userID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.CreditWallet{UserID: userID, Balance: 0}, nil
		}
		return domain.CreditWallet{}, mapDBError(err, "credit wallet")
	}
	return domain.CreditWallet{
		UserID:  fromUUID(res.UserID),
		Balance: int(res.Balance),
	}, nil
}

func (r *PostgresCreditWalletRepository) Upsert(ctx context.Context, wallet domain.CreditWallet) error {
	err := r.q(ctx).UpsertWallet(ctx, db.UpsertWalletParams{
		UserID:  toUUID(wallet.UserID),
		Balance: int32(wallet.Balance),
	})
	return mapDBError(err, "credit wallet")
}

type PostgresCreditTransactionRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPostgresCreditTransactionRepository(pool *pgxpool.Pool) *PostgresCreditTransactionRepository {
	return &PostgresCreditTransactionRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *PostgresCreditTransactionRepository) q(ctx context.Context) *db.Queries {
	if q, ok := ctx.Value(txKey).(*db.Queries); ok {
		return q
	}
	return r.queries
}

func (r *PostgresCreditTransactionRepository) Create(ctx context.Context, tx domain.CreditTransaction) (domain.CreditTransaction, error) {
	res, err := r.q(ctx).CreateCreditTransaction(ctx, db.CreateCreditTransactionParams{
		ID:             toUUID(tx.ID),
		UserID:         toUUID(tx.UserID),
		Type:           tx.Type,
		Amount:         int32(tx.Amount),
		BalanceAfter:   int32(tx.BalanceAfter),
		ReferenceType:  toText(tx.ReferenceType),
		ReferenceID:    toUUID(tx.ReferenceID),
		IdempotencyKey: toText(tx.IdempotencyKey),
		Description:    toText(tx.Description),
	})
	if err != nil {
		return domain.CreditTransaction{}, mapDBError(err, "credit transaction")
	}
	return domain.CreditTransaction{
		ID:             fromUUID(res.ID),
		UserID:         fromUUID(res.UserID),
		Type:           res.Type,
		Amount:         int(res.Amount),
		BalanceAfter:   int(res.BalanceAfter),
		ReferenceType:  fromText(res.ReferenceType),
		ReferenceID:    fromUUID(res.ReferenceID),
		IdempotencyKey: fromText(res.IdempotencyKey),
		Description:    fromText(res.Description),
		CreatedAt:      fromTimestamptz(res.CreatedAt),
	}, nil
}

func (r *PostgresCreditTransactionRepository) ListByUser(ctx context.Context, userID string) ([]domain.CreditTransaction, error) {
	list, err := r.q(ctx).ListCreditTransactionsByUser(ctx, toUUID(userID))
	if err != nil {
		return nil, mapDBError(err, "credit transaction")
	}
	res := make([]domain.CreditTransaction, len(list))
	for i, item := range list {
		res[i] = domain.CreditTransaction{
			ID:             fromUUID(item.ID),
			UserID:         fromUUID(item.UserID),
			Type:           item.Type,
			Amount:         int(item.Amount),
			BalanceAfter:   int(item.BalanceAfter),
			ReferenceType:  fromText(item.ReferenceType),
			ReferenceID:    fromUUID(item.ReferenceID),
			IdempotencyKey: fromText(item.IdempotencyKey),
			Description:    fromText(item.Description),
			CreatedAt:      fromTimestamptz(item.CreatedAt),
		}
	}
	return res, nil
}

func (r *PostgresCreditTransactionRepository) FindByIdempotencyKey(ctx context.Context, userID string, key string) (domain.CreditTransaction, error) {
	res, err := r.q(ctx).FindCreditTransactionByIdempotencyKey(ctx, db.FindCreditTransactionByIdempotencyKeyParams{
		UserID:         toUUID(userID),
		IdempotencyKey: toText(key),
	})
	if err != nil {
		return domain.CreditTransaction{}, mapDBError(err, "credit transaction")
	}
	return domain.CreditTransaction{
		ID:             fromUUID(res.ID),
		UserID:         fromUUID(res.UserID),
		Type:           res.Type,
		Amount:         int(res.Amount),
		BalanceAfter:   int(res.BalanceAfter),
		ReferenceType:  fromText(res.ReferenceType),
		ReferenceID:    fromUUID(res.ReferenceID),
		IdempotencyKey: fromText(res.IdempotencyKey),
		Description:    fromText(res.Description),
		CreatedAt:      fromTimestamptz(res.CreatedAt),
	}, nil
}

type PostgresThemeRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPostgresThemeRepository(pool *pgxpool.Pool) *PostgresThemeRepository {
	return &PostgresThemeRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *PostgresThemeRepository) q(ctx context.Context) *db.Queries {
	if q, ok := ctx.Value(txKey).(*db.Queries); ok {
		return q
	}
	return r.queries
}

func (r *PostgresThemeRepository) List(ctx context.Context) ([]domain.Theme, error) {
	list, err := r.q(ctx).ListThemes(ctx)
	if err != nil {
		return nil, mapDBError(err, "theme")
	}
	res := make([]domain.Theme, len(list))
	for i, item := range list {
		res[i] = domain.Theme{
			Slug:   item.Slug,
			Name:   item.Name,
			Accent: item.Accent,
		}
	}
	return res, nil
}

type PostgresTemplateRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPostgresTemplateRepository(pool *pgxpool.Pool) *PostgresTemplateRepository {
	return &PostgresTemplateRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *PostgresTemplateRepository) q(ctx context.Context) *db.Queries {
	if q, ok := ctx.Value(txKey).(*db.Queries); ok {
		return q
	}
	return r.queries
}

func (r *PostgresTemplateRepository) List(ctx context.Context) ([]domain.Template, error) {
	list, err := r.q(ctx).ListTemplates(ctx)
	if err != nil {
		return nil, mapDBError(err, "template")
	}
	res := make([]domain.Template, len(list))
	for i, item := range list {
		res[i] = domain.Template{
			ID:            item.ID,
			Name:          item.Name,
			Domain:        item.Domain,
			PageType:      item.PageType,
			ComponentHint: int(item.ComponentHint),
			Tier:          item.Tier,
			Description:   item.Description,
		}
	}
	return res, nil
}

type PostgresAuditLogRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPostgresAuditLogRepository(pool *pgxpool.Pool) *PostgresAuditLogRepository {
	return &PostgresAuditLogRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *PostgresAuditLogRepository) q(ctx context.Context) *db.Queries {
	if q, ok := ctx.Value(txKey).(*db.Queries); ok {
		return q
	}
	return r.queries
}

func (r *PostgresAuditLogRepository) Create(ctx context.Context, log AuditLog) error {
	err := r.q(ctx).CreateAuditLog(ctx, db.CreateAuditLogParams{
		ID:           toUUID(log.ID),
		UserID:       toUUID(log.UserID),
		Action:       log.Action,
		ResourceType: log.ResourceType,
		ResourceID:   toText(log.ResourceID),
		Metadata:     []byte(log.MetadataJSON),
	})
	return mapDBError(err, "audit log")
}

func (r *PostgresAuditLogRepository) ListForAdmin(ctx context.Context) ([]AuditLog, error) {
	list, err := r.q(ctx).ListAuditLogsForAdmin(ctx)
	if err != nil {
		return nil, mapDBError(err, "audit log")
	}
	res := make([]AuditLog, len(list))
	for i, item := range list {
		res[i] = AuditLog{
			ID:           fromUUID(item.ID),
			UserID:       fromUUID(item.UserID),
			Action:       item.Action,
			ResourceType: item.ResourceType,
			ResourceID:   fromText(item.ResourceID),
			MetadataJSON: string(item.Metadata),
			CreatedAt:    fromTimestamptz(item.CreatedAt),
		}
	}
	return res, nil
}

type PostgresIdempotencyKeyRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPostgresIdempotencyKeyRepository(pool *pgxpool.Pool) *PostgresIdempotencyKeyRepository {
	return &PostgresIdempotencyKeyRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *PostgresIdempotencyKeyRepository) q(ctx context.Context) *db.Queries {
	if q, ok := ctx.Value(txKey).(*db.Queries); ok {
		return q
	}
	return r.queries
}

func (r *PostgresIdempotencyKeyRepository) Create(ctx context.Context, key IdempotencyKey) (IdempotencyKey, error) {
	res, err := r.q(ctx).CreateIdempotencyKey(ctx, db.CreateIdempotencyKeyParams{
		ID:           toUUID(key.ID),
		UserID:       toUUID(key.UserID),
		Operation:    key.Operation,
		RequestKey:   key.RequestKey,
		ResourceType: key.ResourceType,
		ResourceID:   toText(key.ResourceID),
		ResponseJson: key.ResponseJSON,
		ExpiresAt:    toTimestamptz(key.ExpiresAt),
	})
	if err != nil {
		return IdempotencyKey{}, mapDBError(err, "idempotency key")
	}
	return IdempotencyKey{
		ID:           fromUUID(res.ID),
		UserID:       fromUUID(res.UserID),
		Operation:    res.Operation,
		RequestKey:   res.RequestKey,
		ResourceType: res.ResourceType,
		ResourceID:   fromText(res.ResourceID),
		ResponseJSON: res.ResponseJson,
		CreatedAt:    fromTimestamptz(res.CreatedAt),
		ExpiresAt:    fromTimestamptz(res.ExpiresAt),
	}, nil
}

func (r *PostgresIdempotencyKeyRepository) Find(ctx context.Context, userID string, operation string, requestKey string) (IdempotencyKey, error) {
	res, err := r.q(ctx).GetIdempotencyKey(ctx, db.GetIdempotencyKeyParams{
		UserID:     toUUID(userID),
		Operation:  operation,
		RequestKey: requestKey,
	})
	if err != nil {
		return IdempotencyKey{}, mapDBError(err, "idempotency key")
	}
	return IdempotencyKey{
		ID:           fromUUID(res.ID),
		UserID:       fromUUID(res.UserID),
		Operation:    res.Operation,
		RequestKey:   res.RequestKey,
		ResourceType: res.ResourceType,
		ResourceID:   fromText(res.ResourceID),
		ResponseJSON: res.ResponseJson,
		CreatedAt:    fromTimestamptz(res.CreatedAt),
		ExpiresAt:    fromTimestamptz(res.ExpiresAt),
	}, nil
}

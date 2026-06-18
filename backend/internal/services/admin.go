package services

import (
	"context"
	"strings"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/domain"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
)

// errAdminNeedsDB is returned for admin mutations when running without a
// database (mock mode). Admin CRUD is a database-backed, production feature.
func errAdminNeedsDB() error {
	return apperrors.Conflict("this admin operation requires a database-backed deployment")
}

// ---- Users ----------------------------------------------------------------

type AdminUserUpdate struct {
	Role    *string `json:"role"`
	Status  *string `json:"status"`
	Credits *int    `json:"credits"`
}

func (f *FrontendService) AdminUpdateUser(ctx context.Context, userID string, in AdminUserUpdate) (AdminUserDTO, error) {
	if f.s.pool == nil {
		return AdminUserDTO{}, errAdminNeedsDB()
	}
	if in.Role != nil {
		role := strings.ToLower(strings.TrimSpace(*in.Role))
		if role != "user" && role != "admin" {
			return AdminUserDTO{}, apperrors.Validation("role must be 'user' or 'admin'")
		}
		if _, err := f.s.pool.Exec(ctx, "UPDATE users SET role=$1, updated_at=now() WHERE id=$2", role, userID); err != nil {
			return AdminUserDTO{}, err
		}
	}
	if in.Status != nil {
		status := strings.ToLower(strings.TrimSpace(*in.Status))
		switch status {
		case "active", "review", "suspended":
		default:
			return AdminUserDTO{}, apperrors.Validation("status must be active, review, or suspended")
		}
		if _, err := f.s.pool.Exec(ctx, "UPDATE users SET status=$1, updated_at=now() WHERE id=$2", status, userID); err != nil {
			return AdminUserDTO{}, err
		}
	}
	if in.Credits != nil {
		credits := *in.Credits
		if credits < 0 {
			return AdminUserDTO{}, apperrors.Validation("credits cannot be negative")
		}
		err := f.s.tx.WithTx(ctx, func(txCtx context.Context) error {
			w, err := f.s.wallets.GetForUpdate(txCtx, userID)
			if err != nil {
				return err
			}
			delta := credits - w.Balance
			w.Balance = credits
			if err := f.s.wallets.Upsert(txCtx, w); err != nil {
				return err
			}
			txID, err := newID()
			if err != nil {
				return err
			}
			_, err = f.s.transactions.Create(txCtx, domain.CreditTransaction{
				ID:            txID,
				UserID:        userID,
				Type:          "adjustment",
				Amount:        delta,
				BalanceAfter:  credits,
				ReferenceType: "admin",
				Description:   "Admin credit adjustment",
			})
			return err
		})
		if err != nil {
			return AdminUserDTO{}, err
		}
	}
	return f.adminUserByID(ctx, userID)
}

func (f *FrontendService) AdminDeleteUser(ctx context.Context, userID string) error {
	if f.s.pool == nil {
		return errAdminNeedsDB()
	}
	tag, err := f.s.pool.Exec(ctx, "DELETE FROM users WHERE id=$1", userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("User not found.")
	}
	return nil
}

func (f *FrontendService) adminUserByID(ctx context.Context, userID string) (AdminUserDTO, error) {
	user, err := f.s.users.FindByID(ctx, userID)
	if err != nil {
		return AdminUserDTO{}, apperrors.NotFound("User not found.")
	}
	credits := 0
	if w, err := f.s.wallets.GetForUpdate(ctx, userID); err == nil {
		credits = w.Balance
	}
	projects, pages := 0, 0
	status := "active"
	if f.s.pool != nil {
		_ = f.s.pool.QueryRow(ctx, "SELECT count(*) FROM projects WHERE user_id=$1 AND deleted_at IS NULL", userID).Scan(&projects)
		_ = f.s.pool.QueryRow(ctx, "SELECT count(*) FROM page_versions WHERE created_by=$1", userID).Scan(&pages)
		_ = f.s.pool.QueryRow(ctx, "SELECT COALESCE(status,'active') FROM users WHERE id=$1", userID).Scan(&status)
	}
	return AdminUserDTO{
		ID: user.ID, Name: user.Name, Email: user.Email, Role: user.Role,
		Credits: credits, Projects: projects, PagesGenerated: pages,
		JoinedAt: isoTime(user.CreatedAt), Status: status,
	}, nil
}

// ---- Projects -------------------------------------------------------------

type AdminProjectDTO struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	Domain         string  `json:"domain"`
	Status         string  `json:"status"`
	Owner          string  `json:"owner"`
	OwnerEmail     string  `json:"ownerEmail"`
	PagesCount     int     `json:"pagesCount"`
	QualityAverage float64 `json:"qualityAverage"`
	CreatedAt      string  `json:"createdAt"`
	UpdatedAt      string  `json:"updatedAt"`
}

func (f *FrontendService) AdminListProjects(ctx context.Context) ([]AdminProjectDTO, error) {
	out := []AdminProjectDTO{}
	if f.s.pool == nil {
		return out, nil
	}
	rows, err := f.s.pool.Query(ctx, `
		SELECT p.id, p.name, p.domain, COALESCE(p.status,'active'), u.name, u.email,
		  (SELECT count(*) FROM project_pages pg WHERE pg.project_id=p.id AND pg.deleted_at IS NULL) AS pages_count,
		  COALESCE((SELECT AVG(v.quality_score) FROM project_pages pg
		    JOIN page_versions v ON v.id=pg.current_version_id
		    WHERE pg.project_id=p.id AND pg.deleted_at IS NULL), 0) AS quality_avg,
		  p.created_at, p.updated_at
		FROM projects p JOIN users u ON u.id=p.user_id
		WHERE p.deleted_at IS NULL
		ORDER BY p.updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var d AdminProjectDTO
		var quality float64
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&d.ID, &d.Name, &d.Domain, &d.Status, &d.Owner, &d.OwnerEmail, &d.PagesCount, &quality, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		d.QualityAverage = round1(quality)
		d.CreatedAt = isoTime(createdAt)
		d.UpdatedAt = isoTime(updatedAt)
		out = append(out, d)
	}
	return out, rows.Err()
}

func (f *FrontendService) AdminDeleteProject(ctx context.Context, projectID string) error {
	if f.s.pool == nil {
		return errAdminNeedsDB()
	}
	tag, err := f.s.pool.Exec(ctx, "UPDATE projects SET deleted_at=now() WHERE id=$1 AND deleted_at IS NULL", projectID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("Project not found.")
	}
	return nil
}

// ---- Generations ----------------------------------------------------------

func (f *FrontendService) AdminRetryGeneration(ctx context.Context, jobID string) error {
	if f.s.pool == nil {
		return errAdminNeedsDB()
	}
	var userID, status string
	if err := f.s.pool.QueryRow(ctx, "SELECT user_id, status FROM generation_jobs WHERE id=$1", jobID).Scan(&userID, &status); err != nil {
		return apperrors.NotFound("Generation job not found.")
	}
	// Reset to queued so the idempotency guard allows reprocessing, then run inline.
	if _, err := f.s.pool.Exec(ctx, "UPDATE generation_jobs SET status='queued', error_message=NULL, updated_at=now() WHERE id=$1", jobID); err != nil {
		return err
	}
	f.s.processInline(ctx, jobID, userID, operationGenerate, 0)
	return nil
}

// ---- Templates ------------------------------------------------------------

type TemplateDTO struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Domain        string `json:"domain"`
	PageType      string `json:"pageType"`
	ComponentHint int    `json:"componentHint"`
	Tier          string `json:"tier"`
	Description   string `json:"description"`
}

type TemplateInput struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Domain        string `json:"domain"`
	PageType      string `json:"pageType"`
	ComponentHint int    `json:"componentHint"`
	Tier          string `json:"tier"`
	Description   string `json:"description"`
}

func (f *FrontendService) AdminListTemplates(ctx context.Context) ([]TemplateDTO, error) {
	templates, err := f.s.templatesRepo.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]TemplateDTO, 0, len(templates))
	for _, t := range templates {
		out = append(out, TemplateDTO(t))
	}
	return out, nil
}

func (f *FrontendService) AdminCreateTemplate(ctx context.Context, in TemplateInput) (TemplateDTO, error) {
	if f.s.pool == nil {
		return TemplateDTO{}, errAdminNeedsDB()
	}
	if strings.TrimSpace(in.Name) == "" {
		return TemplateDTO{}, apperrors.Validation("name is required")
	}
	id := strings.TrimSpace(in.ID)
	if id == "" {
		id = slugify(in.Name)
	}
	t := normalizeTemplate(in, id)
	_, err := f.s.pool.Exec(ctx, `
		INSERT INTO templates (id, name, domain, page_type, component_hint, tier, description, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7, now())`,
		t.ID, t.Name, t.Domain, t.PageType, t.ComponentHint, t.Tier, t.Description)
	if err != nil {
		return TemplateDTO{}, mapAdminWriteError(err, "template")
	}
	return t, nil
}

func (f *FrontendService) AdminUpdateTemplate(ctx context.Context, id string, in TemplateInput) (TemplateDTO, error) {
	if f.s.pool == nil {
		return TemplateDTO{}, errAdminNeedsDB()
	}
	t := normalizeTemplate(in, id)
	tag, err := f.s.pool.Exec(ctx, `
		UPDATE templates SET name=$2, domain=$3, page_type=$4, component_hint=$5, tier=$6, description=$7
		WHERE id=$1`, id, t.Name, t.Domain, t.PageType, t.ComponentHint, t.Tier, t.Description)
	if err != nil {
		return TemplateDTO{}, err
	}
	if tag.RowsAffected() == 0 {
		return TemplateDTO{}, apperrors.NotFound("Template not found.")
	}
	return t, nil
}

func (f *FrontendService) AdminDeleteTemplate(ctx context.Context, id string) error {
	if f.s.pool == nil {
		return errAdminNeedsDB()
	}
	tag, err := f.s.pool.Exec(ctx, "DELETE FROM templates WHERE id=$1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("Template not found.")
	}
	return nil
}

func normalizeTemplate(in TemplateInput, id string) TemplateDTO {
	tier := "Free"
	if strings.EqualFold(strings.TrimSpace(in.Tier), "Premium") {
		tier = "Premium"
	}
	pageType := strings.TrimSpace(in.PageType)
	if pageType == "" {
		pageType = "dashboard"
	}
	hint := in.ComponentHint
	if hint < 0 {
		hint = 0
	}
	return TemplateDTO{
		ID:            id,
		Name:          strings.TrimSpace(in.Name),
		Domain:        strings.ToLower(strings.TrimSpace(in.Domain)),
		PageType:      pageType,
		ComponentHint: hint,
		Tier:          tier,
		Description:   strings.TrimSpace(in.Description),
	}
}

// ---- Themes ---------------------------------------------------------------

type ThemeInput struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Accent      string `json:"accent"`
	Library     string `json:"library"`
	Description string `json:"description"`
}

var allowedLibraries = map[string]bool{
	"shadcn": true, "reui": true, "antd": true, "mui": true, "chakra": true,
}

func normalizeLibrary(library string) string {
	l := strings.ToLower(strings.TrimSpace(library))
	if allowedLibraries[l] {
		return l
	}
	return "shadcn"
}

func (f *FrontendService) AdminListThemes(ctx context.Context) ([]domain.Theme, error) {
	return f.s.ThemesWithLibrary(ctx)
}

func (f *FrontendService) AdminCreateTheme(ctx context.Context, in ThemeInput) (domain.Theme, error) {
	if f.s.pool == nil {
		return domain.Theme{}, errAdminNeedsDB()
	}
	slug := slugify(fallback(in.Slug, in.Name))
	if slug == "" || strings.TrimSpace(in.Name) == "" {
		return domain.Theme{}, apperrors.Validation("slug and name are required")
	}
	t := domain.Theme{
		Slug:        slug,
		Name:        strings.TrimSpace(in.Name),
		Accent:      fallback(in.Accent, "#334eac"),
		Library:     normalizeLibrary(in.Library),
		Description: strings.TrimSpace(in.Description),
	}
	_, err := f.s.pool.Exec(ctx, `
		INSERT INTO themes (slug, name, accent, library, description, created_at) VALUES ($1,$2,$3,$4,$5, now())`,
		t.Slug, t.Name, t.Accent, t.Library, t.Description)
	if err != nil {
		return domain.Theme{}, mapAdminWriteError(err, "theme")
	}
	return t, nil
}

func (f *FrontendService) AdminUpdateTheme(ctx context.Context, slug string, in ThemeInput) (domain.Theme, error) {
	if f.s.pool == nil {
		return domain.Theme{}, errAdminNeedsDB()
	}
	t := domain.Theme{
		Slug:        slug,
		Name:        strings.TrimSpace(in.Name),
		Accent:      fallback(in.Accent, "#334eac"),
		Library:     normalizeLibrary(in.Library),
		Description: strings.TrimSpace(in.Description),
	}
	tag, err := f.s.pool.Exec(ctx, "UPDATE themes SET name=$2, accent=$3, library=$4, description=$5 WHERE slug=$1",
		t.Slug, t.Name, t.Accent, t.Library, t.Description)
	if err != nil {
		return domain.Theme{}, err
	}
	if tag.RowsAffected() == 0 {
		return domain.Theme{}, apperrors.NotFound("Theme not found.")
	}
	return t, nil
}

func (f *FrontendService) AdminDeleteTheme(ctx context.Context, slug string) error {
	if f.s.pool == nil {
		return errAdminNeedsDB()
	}
	tag, err := f.s.pool.Exec(ctx, "DELETE FROM themes WHERE slug=$1", slug)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("Theme not found.")
	}
	return nil
}

// ---- Billing --------------------------------------------------------------

type AdminBillingSummary struct {
	TotalBalance  int `json:"totalBalance"`
	CreditsUsed   int `json:"creditsUsed"`
	RefundsIssued int `json:"refundsIssued"`
	Topups        int `json:"topups"`
}

func (f *FrontendService) AdminBillingSummary(ctx context.Context) (AdminBillingSummary, error) {
	var s AdminBillingSummary
	if f.s.pool == nil {
		return s, nil
	}
	_ = f.s.pool.QueryRow(ctx, "SELECT COALESCE(SUM(balance),0) FROM credit_wallets").Scan(&s.TotalBalance)
	_ = f.s.pool.QueryRow(ctx, "SELECT COALESCE(-SUM(amount),0) FROM credit_transactions WHERE amount<0").Scan(&s.CreditsUsed)
	_ = f.s.pool.QueryRow(ctx, "SELECT COALESCE(SUM(amount),0) FROM credit_transactions WHERE type='refund'").Scan(&s.RefundsIssued)
	_ = f.s.pool.QueryRow(ctx, "SELECT COALESCE(SUM(amount),0) FROM credit_transactions WHERE type='topup'").Scan(&s.Topups)
	return s, nil
}

type AdminTransactionDTO struct {
	ID           string `json:"id"`
	User         string `json:"user"`
	Type         string `json:"type"`
	Amount       int    `json:"amount"`
	BalanceAfter int    `json:"balanceAfter"`
	Description  string `json:"description"`
	CreatedAt    string `json:"createdAt"`
}

func (f *FrontendService) AdminTransactions(ctx context.Context) ([]AdminTransactionDTO, error) {
	out := []AdminTransactionDTO{}
	if f.s.pool == nil {
		return out, nil
	}
	rows, err := f.s.pool.Query(ctx, `
		SELECT t.id, COALESCE(u.email,''), t.type, t.amount, t.balance_after, COALESCE(t.description,''), t.created_at
		FROM credit_transactions t LEFT JOIN users u ON u.id=t.user_id
		ORDER BY t.created_at DESC LIMIT 200`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var d AdminTransactionDTO
		var createdAt time.Time
		if err := rows.Scan(&d.ID, &d.User, &d.Type, &d.Amount, &d.BalanceAfter, &d.Description, &createdAt); err != nil {
			return nil, err
		}
		d.Type = mapTransactionType(d.Type, d.Amount)
		d.CreatedAt = isoTime(createdAt)
		out = append(out, d)
	}
	return out, rows.Err()
}

// reconcileStaleJobs marks generation jobs that have been stuck in a
// non-terminal state for more than a few minutes as failed. This cleans up
// orphans (e.g. jobs queued before an async worker existed) so analytics and
// the funnel reflect reality instead of an ever-growing "queued" count.
func (s *StudioService) reconcileStaleJobs(ctx context.Context) {
	if s.pool == nil {
		return
	}
	_, _ = s.pool.Exec(ctx, `
		UPDATE generation_jobs
		SET status='failed',
		    error_message=COALESCE(NULLIF(error_message, ''), 'Stale job reconciled at startup'),
		    finished_at=COALESCE(finished_at, now()),
		    updated_at=now()
		WHERE status IN ('queued','processing','analyzing','generating_schema','validating_schema','rendering_code')
		  AND created_at < now() - interval '5 minutes'`)
}

func mapAdminWriteError(err error, resource string) error {
	if err == nil {
		return nil
	}
	if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "23505") {
		return apperrors.Conflict(resource + " with that id/slug already exists")
	}
	return err
}

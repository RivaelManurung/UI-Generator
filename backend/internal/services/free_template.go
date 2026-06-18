package services

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
)

// FreeTemplateService manages "freebies": generated pages an admin publishes as
// free, downloadable templates shown on the public templates page. A free
// template snapshots the source page's schema + generated code so it stays
// stable even if the source project changes. Uses raw pool queries.
type FreeTemplateService struct {
	s *StudioService
}

func NewFreeTemplateService(s *StudioService) *FreeTemplateService {
	return &FreeTemplateService{s: s}
}

// FreeTemplateDTO is the public shape (includes schema for the live preview
// thumbnail, but not the generated code).
type FreeTemplateDTO struct {
	Slug             string          `json:"slug"`
	Title            string          `json:"title"`
	Description      string          `json:"description"`
	PageType         string          `json:"pageType"`
	Category         string          `json:"category"`
	DesignSystemSlug string          `json:"designSystemSlug"`
	Brand            string          `json:"brand"`
	Schema           json.RawMessage `json:"schema"`
	Downloads        int             `json:"downloads"`
	Published        bool            `json:"published"`
	CreatedAt        string          `json:"createdAt"`
}

// FreeTemplateDetailDTO adds the generated TSX (for the code tab).
type FreeTemplateDetailDTO struct {
	FreeTemplateDTO
	GeneratedCode string `json:"generatedCode"`
}

// AdminFreeTemplateDTO is the lighter admin-list shape (id for CRUD, no schema/code).
type AdminFreeTemplateDTO struct {
	ID          string `json:"id"`
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Description string `json:"description"`
	PageType    string `json:"pageType"`
	Category    string `json:"category"`
	Published   bool   `json:"published"`
	Downloads   int    `json:"downloads"`
	CreatedAt   string `json:"createdAt"`
}

type PublishFreeTemplateInput struct {
	Title        string `json:"title"`
	Description  string `json:"description"`
	Category     string `json:"category"`
	SourcePageID string `json:"sourcePageId"`
}

type UpdateFreeTemplateInput struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Category    *string `json:"category"`
	Published   *bool   `json:"published"`
}

// ListPublic returns published free templates (with schema for thumbnails).
func (f *FreeTemplateService) ListPublic(ctx context.Context) ([]FreeTemplateDTO, error) {
	rows, err := f.s.pool.Query(ctx,
		`SELECT slug, title, description, page_type, category, design_system_slug, brand,
		        schema_json::text, downloads, published, created_at::text
		 FROM free_templates WHERE published = true ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []FreeTemplateDTO{}
	for rows.Next() {
		dto, err := scanPublic(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, dto)
	}
	return out, rows.Err()
}

// GetBySlug returns a published free template including its generated code.
func (f *FreeTemplateService) GetBySlug(ctx context.Context, slug string) (FreeTemplateDetailDTO, error) {
	var dto FreeTemplateDetailDTO
	var schemaText string
	err := f.s.pool.QueryRow(ctx,
		`SELECT slug, title, description, page_type, category, design_system_slug, brand,
		        schema_json::text, downloads, published, created_at::text, generated_code
		 FROM free_templates WHERE slug = $1 AND published = true`, slug,
	).Scan(&dto.Slug, &dto.Title, &dto.Description, &dto.PageType, &dto.Category,
		&dto.DesignSystemSlug, &dto.Brand, &schemaText, &dto.Downloads, &dto.Published,
		&dto.CreatedAt, &dto.GeneratedCode)
	if errors.Is(err, pgx.ErrNoRows) {
		return FreeTemplateDetailDTO{}, apperrors.NotFound("free template not found")
	}
	if err != nil {
		return FreeTemplateDetailDTO{}, err
	}
	dto.Schema = json.RawMessage(schemaText)
	return dto, nil
}

// IncrementDownloads bumps the counter (best-effort; published only).
func (f *FreeTemplateService) IncrementDownloads(ctx context.Context, slug string) error {
	_, err := f.s.pool.Exec(ctx,
		`UPDATE free_templates SET downloads = downloads + 1 WHERE slug = $1 AND published = true`, slug)
	return err
}

// Publish snapshots an admin-owned generated page into a new free template.
func (f *FreeTemplateService) Publish(ctx context.Context, adminID string, in PublishFreeTemplateInput) (AdminFreeTemplateDTO, error) {
	title := strings.TrimSpace(in.Title)
	if title == "" {
		return AdminFreeTemplateDTO{}, apperrors.Validation("title is required")
	}
	if strings.TrimSpace(in.SourcePageID) == "" {
		return AdminFreeTemplateDTO{}, apperrors.Validation("sourcePageId is required")
	}

	// Authoritative snapshot of the page's current version (must be owned by the admin).
	var schemaText, generatedCode, pageType, themeSlug, brand string
	err := f.s.pool.QueryRow(ctx,
		`SELECT pv.schema_json::text, pv.generated_code, pp.page_type, pr.default_theme_slug, pr.name
		 FROM project_pages pp
		 JOIN page_versions pv ON pp.current_version_id = pv.id
		 JOIN projects pr ON pp.project_id = pr.id
		 WHERE pp.id = $1 AND pr.user_id = $2 AND pr.deleted_at IS NULL`,
		in.SourcePageID, adminID,
	).Scan(&schemaText, &generatedCode, &pageType, &themeSlug, &brand)
	if errors.Is(err, pgx.ErrNoRows) {
		return AdminFreeTemplateDTO{}, apperrors.NotFound("source page not found, not owned by you, or has no generated version")
	}
	if err != nil {
		return AdminFreeTemplateDTO{}, err
	}

	slug, err := f.uniqueSlug(ctx, title)
	if err != nil {
		return AdminFreeTemplateDTO{}, err
	}
	category := strings.TrimSpace(in.Category)
	if category == "" {
		category = pageType
	}

	var dto AdminFreeTemplateDTO
	err = f.s.pool.QueryRow(ctx,
		`INSERT INTO free_templates
		   (slug, title, description, page_type, design_system_slug, brand, category,
		    schema_json, generated_code, source_page_id, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)
		 RETURNING id, slug, title, description, page_type, category, published, downloads, created_at::text`,
		slug, title, strings.TrimSpace(in.Description), pageType, themeSlug, brand, category,
		schemaText, generatedCode, in.SourcePageID, adminID,
	).Scan(&dto.ID, &dto.Slug, &dto.Title, &dto.Description, &dto.PageType, &dto.Category,
		&dto.Published, &dto.Downloads, &dto.CreatedAt)
	if err != nil {
		return AdminFreeTemplateDTO{}, err
	}
	return dto, nil
}

// AdminList returns every free template (published or not).
func (f *FreeTemplateService) AdminList(ctx context.Context) ([]AdminFreeTemplateDTO, error) {
	rows, err := f.s.pool.Query(ctx,
		`SELECT id, slug, title, description, page_type, category, published, downloads, created_at::text
		 FROM free_templates ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []AdminFreeTemplateDTO{}
	for rows.Next() {
		var dto AdminFreeTemplateDTO
		if err := rows.Scan(&dto.ID, &dto.Slug, &dto.Title, &dto.Description, &dto.PageType,
			&dto.Category, &dto.Published, &dto.Downloads, &dto.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, dto)
	}
	return out, rows.Err()
}

// Update applies partial changes (nil fields are left unchanged via COALESCE).
func (f *FreeTemplateService) Update(ctx context.Context, id string, in UpdateFreeTemplateInput) (AdminFreeTemplateDTO, error) {
	var dto AdminFreeTemplateDTO
	err := f.s.pool.QueryRow(ctx,
		`UPDATE free_templates SET
		   title = COALESCE($2, title),
		   description = COALESCE($3, description),
		   category = COALESCE($4, category),
		   published = COALESCE($5, published),
		   updated_at = now()
		 WHERE id = $1
		 RETURNING id, slug, title, description, page_type, category, published, downloads, created_at::text`,
		id, in.Title, in.Description, in.Category, in.Published,
	).Scan(&dto.ID, &dto.Slug, &dto.Title, &dto.Description, &dto.PageType, &dto.Category,
		&dto.Published, &dto.Downloads, &dto.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return AdminFreeTemplateDTO{}, apperrors.NotFound("free template not found")
	}
	if err != nil {
		return AdminFreeTemplateDTO{}, err
	}
	return dto, nil
}

func (f *FreeTemplateService) Delete(ctx context.Context, id string) error {
	_, err := f.s.pool.Exec(ctx, `DELETE FROM free_templates WHERE id = $1`, id)
	return err
}

func (f *FreeTemplateService) uniqueSlug(ctx context.Context, title string) (string, error) {
	base := slugify(title)
	if base == "" {
		base = "template"
	}
	var exists bool
	if err := f.s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM free_templates WHERE slug = $1)`, base).Scan(&exists); err != nil {
		return "", err
	}
	if !exists {
		return base, nil
	}
	id, err := newID()
	if err != nil {
		return "", err
	}
	suffix := strings.ReplaceAll(id, "-", "")
	if len(suffix) > 8 {
		suffix = suffix[:8]
	}
	return base + "-" + suffix, nil
}

func scanPublic(rows pgx.Rows) (FreeTemplateDTO, error) {
	var dto FreeTemplateDTO
	var schemaText string
	if err := rows.Scan(&dto.Slug, &dto.Title, &dto.Description, &dto.PageType, &dto.Category,
		&dto.DesignSystemSlug, &dto.Brand, &schemaText, &dto.Downloads, &dto.Published, &dto.CreatedAt); err != nil {
		return FreeTemplateDTO{}, err
	}
	dto.Schema = json.RawMessage(schemaText)
	return dto, nil
}

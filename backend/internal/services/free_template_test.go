package services

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/ai"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/config"
)

// TestPublishFreeTemplate verifies publishing snapshots an admin-owned page's
// schema + generated code, generates a unique slug, surfaces in the public list,
// and rejects a page the user does not own. Requires a real Postgres.
func TestPublishFreeTemplate(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("skipping free template test; DATABASE_URL not set")
	}
	cfg := config.Config{
		DatabaseURL:     dbURL,
		JWTSecret:       "super-secret-key-32-characters-long-to-be-valid-in-prod",
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 30 * 24 * time.Hour,
		Environment:     "development",
	}
	studio := NewStudioServiceWithConfig(cfg)
	ft := NewFreeTemplateService(studio)
	ctx := context.Background()

	email := fmt.Sprintf("ftadmin-%d@example.com", time.Now().UnixNano())
	session, err := studio.Register(RegisterInput{Name: "FT Admin", Email: email, Password: "password123"})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	userID := session.User.ID
	defer func() {
		_, _ = studio.pool.Exec(ctx, `DELETE FROM free_templates WHERE created_by = $1`, userID)
		_, _ = studio.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID)
	}()

	// Generate a real page (project -> page -> saved version with schema + code).
	project, err := studio.CreateProjectForUser(ctx, userID, CreateProjectInput{Name: "FT Project", DefaultThemeSlug: "shadcn"})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	page, err := studio.CreatePageForUser(ctx, userID, project.ID, CreatePageInput{Name: "Overview", PageType: "dashboard"})
	if err != nil {
		t.Fatalf("create page: %v", err)
	}
	resp, err := ai.NewMockProvider().GenerateSchema(ctx, ai.GenerateRequest{Prompt: "ops dashboard", PageType: "dashboard", Domain: "hospital", ThemeSlug: "shadcn"})
	if err != nil {
		t.Fatalf("mock schema: %v", err)
	}
	if _, err := studio.SavePageVersion(ctx, userID, page.ID, "ops dashboard", resp.Schema, "shadcn"); err != nil {
		t.Fatalf("save version: %v", err)
	}

	// Publish.
	dto, err := ft.Publish(ctx, userID, PublishFreeTemplateInput{Title: "My Free Template", Description: "desc", SourcePageID: page.ID})
	if err != nil {
		t.Fatalf("publish: %v", err)
	}
	if dto.Slug == "" || dto.Title != "My Free Template" || !dto.Published {
		t.Fatalf("unexpected published dto: %+v", dto)
	}

	// Surfaces in public list with a non-empty schema.
	pub, err := ft.ListPublic(ctx)
	if err != nil {
		t.Fatalf("list public: %v", err)
	}
	var found bool
	for _, p := range pub {
		if p.Slug == dto.Slug {
			found = true
			if len(p.Schema) < 3 {
				t.Fatalf("public schema looks empty: %s", string(p.Schema))
			}
		}
	}
	if !found {
		t.Fatal("published template not in public list")
	}

	// Detail includes the generated code.
	detail, err := ft.GetBySlug(ctx, dto.Slug)
	if err != nil {
		t.Fatalf("get by slug: %v", err)
	}
	if detail.GeneratedCode == "" {
		t.Fatal("expected non-empty generated code")
	}

	// Same title -> different unique slug.
	dto2, err := ft.Publish(ctx, userID, PublishFreeTemplateInput{Title: "My Free Template", SourcePageID: page.ID})
	if err != nil {
		t.Fatalf("publish 2: %v", err)
	}
	if dto2.Slug == dto.Slug {
		t.Fatalf("expected a unique slug, got duplicate %q", dto2.Slug)
	}

	// Unknown / non-owned page -> error (no snapshot).
	if _, err := ft.Publish(ctx, userID, PublishFreeTemplateInput{Title: "x", SourcePageID: "00000000-0000-0000-0000-000000000000"}); err == nil {
		t.Fatal("expected an error publishing an unknown page")
	}
}

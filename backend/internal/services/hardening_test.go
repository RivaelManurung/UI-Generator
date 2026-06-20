package services

import (
	"context"
	"errors"
	"testing"

	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
)

// TestUpdateJSONColumn_RejectsUnknownColumn verifies the allowlist closes the
// SQL-injection vector: a column outside the fixed set is rejected before any
// query is built. Runs in mock mode (no DB needed).
func TestUpdateJSONColumn_RejectsUnknownColumn(t *testing.T) {
	studio := NewStudioService()
	f := NewFrontendService(studio)
	ctx := context.Background()

	session, err := studio.Register(RegisterInput{Name: "U", Email: "allow@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	cases := []string{
		"role",                               // a real-but-forbidden column
		"workspace = '{}'; DROP TABLE users", // injection attempt
		"",
	}
	for _, col := range cases {
		_, err := f.updateJSONColumn(ctx, session.User.ID, col, map[string]any{"x": 1})
		if err == nil {
			t.Fatalf("expected rejection for column %q, got nil", col)
		}
		var appErr *apperrors.Error
		if !errors.As(err, &appErr) || appErr.Status != 422 {
			t.Fatalf("expected 422 validation error for column %q, got %v", col, err)
		}
	}
}

// TestUpdateJSONColumn_AllowsKnownColumns confirms the three legitimate columns
// still pass the allowlist (mock mode persists nothing but must not error).
func TestUpdateJSONColumn_AllowsKnownColumns(t *testing.T) {
	studio := NewStudioService()
	f := NewFrontendService(studio)
	ctx := context.Background()

	session, err := studio.Register(RegisterInput{Name: "U", Email: "allow2@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	for _, col := range []string{"generation_preferences", "workspace", "security"} {
		if _, err := f.updateJSONColumn(ctx, session.User.ID, col, map[string]any{"x": 1}); err != nil {
			t.Fatalf("expected column %q to be allowed, got %v", col, err)
		}
	}
}

// TestDeleteProject_NotOwnedReturnsNotFound verifies the SoftDeleteOwned fix:
// deleting a project the user does not own (or that does not exist) returns a
// 404 instead of a false success. Runs against the in-memory mock repo.
func TestDeleteProject_NotOwnedReturnsNotFound(t *testing.T) {
	studio := NewStudioService()
	ctx := context.Background()

	owner, err := studio.Register(RegisterInput{Name: "Owner", Email: "owner@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("register owner: %v", err)
	}
	other, err := studio.Register(RegisterInput{Name: "Other", Email: "other@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("register other: %v", err)
	}
	project, err := studio.CreateProjectForUser(ctx, owner.User.ID, CreateProjectInput{Name: "P", DefaultThemeSlug: "shadcn"})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}

	// Non-existent project id -> 404.
	if err := studio.DeleteProjectForUser(ctx, owner.User.ID, "does-not-exist"); !isNotFound(err) {
		t.Fatalf("deleting unknown project: expected 404, got %v", err)
	}
	// Another user deleting someone else's project -> 404 (no false 200).
	if err := studio.DeleteProjectForUser(ctx, other.User.ID, project.ID); !isNotFound(err) {
		t.Fatalf("deleting non-owned project: expected 404, got %v", err)
	}
	// Owner deleting their own project -> success.
	if err := studio.DeleteProjectForUser(ctx, owner.User.ID, project.ID); err != nil {
		t.Fatalf("owner delete should succeed, got %v", err)
	}
}

func isNotFound(err error) bool {
	var appErr *apperrors.Error
	return errors.As(err, &appErr) && appErr.Status == 404
}

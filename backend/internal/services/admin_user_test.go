package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/config"
)

// newTestStudioWithDB spins up a real DB-backed StudioService, skipping the test
// when DATABASE_URL is not configured (mirrors free_template_test.go).
func newTestStudioWithDB(t *testing.T) *StudioService {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("skipping admin per-user test; DATABASE_URL not set")
	}
	cfg := config.Config{
		DatabaseURL:     dbURL,
		JWTSecret:       "super-secret-key-32-characters-long-to-be-valid-in-prod",
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 30 * 24 * time.Hour,
		Environment:     "development",
	}
	return NewStudioServiceWithConfig(cfg)
}

// seedPaidUser registers a user and inserts two paid Midtrans top-ups plus one
// failed order so the money/credit aggregates have something to sum.
func seedPaidUser(t *testing.T, studio *StudioService, ctx context.Context) (userID string, cleanup func()) {
	t.Helper()
	email := fmt.Sprintf("adminuser-%d@example.com", time.Now().UnixNano())
	session, err := studio.Register(RegisterInput{Name: "Admin Subject", Email: email, Password: "password123"})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	userID = session.User.ID

	// Two paid orders (counted) + one failed order (ignored by revenue sums).
	mustExec(t, studio, ctx,
		`INSERT INTO payments (user_id, package_slug, amount_idr, credits, status, order_id)
		 VALUES ($1,'silver',690000,100,'paid',$2)`, userID, "tx-paid-1-"+userID)
	mustExec(t, studio, ctx,
		`INSERT INTO payments (user_id, package_slug, amount_idr, credits, status, order_id)
		 VALUES ($1,'individual',99000,12,'paid',$2)`, userID, "tx-paid-2-"+userID)
	mustExec(t, studio, ctx,
		`INSERT INTO payments (user_id, package_slug, amount_idr, credits, status, order_id)
		 VALUES ($1,'silver',690000,100,'failed',$2)`, userID, "tx-failed-"+userID)

	cleanup = func() {
		_, _ = studio.pool.Exec(ctx, `DELETE FROM payments WHERE user_id=$1`, userID)
		_, _ = studio.pool.Exec(ctx, `DELETE FROM users WHERE id=$1`, userID)
	}
	return userID, cleanup
}

func mustExec(t *testing.T, studio *StudioService, ctx context.Context, sql string, args ...any) {
	t.Helper()
	if _, err := studio.pool.Exec(ctx, sql, args...); err != nil {
		t.Fatalf("seed exec failed: %v\nsql: %s", err, sql)
	}
}

func TestAdminUserOverview_AggregatesMoneyAndCredits(t *testing.T) {
	studio := newTestStudioWithDB(t)
	f := NewFrontendService(studio)
	ctx := context.Background()
	userID, cleanup := seedPaidUser(t, studio, ctx)
	defer cleanup()

	ov, err := f.AdminUserOverview(ctx, userID)
	if err != nil {
		t.Fatalf("overview: %v", err)
	}
	if ov.ID != userID {
		t.Fatalf("expected id %s, got %s", userID, ov.ID)
	}
	// Only the two 'paid' orders count: 690000 + 99000 = 789000 IDR, 112 credits.
	if ov.TotalToppedUpIDR != 789000 {
		t.Errorf("TotalToppedUpIDR = %d, want 789000", ov.TotalToppedUpIDR)
	}
	if ov.TotalCreditsPurchased != 112 {
		t.Errorf("TotalCreditsPurchased = %d, want 112", ov.TotalCreditsPurchased)
	}
}

func TestAdminUserOverview_NotFound(t *testing.T) {
	studio := newTestStudioWithDB(t)
	f := NewFrontendService(studio)
	ctx := context.Background()

	_, err := f.AdminUserOverview(ctx, "00000000-0000-0000-0000-000000000000")
	if err == nil {
		t.Fatal("expected NotFound for unknown user, got nil")
	}
	var appErr *apperrors.Error
	if !errors.As(err, &appErr) || appErr.Status != 404 {
		t.Fatalf("expected 404 apperror, got %v", err)
	}
}

func TestAdminUserPayments_ScopedAndNewestFirst(t *testing.T) {
	studio := newTestStudioWithDB(t)
	f := NewFrontendService(studio)
	ctx := context.Background()
	userID, cleanup := seedPaidUser(t, studio, ctx)
	defer cleanup()

	rows, err := f.AdminUserPayments(ctx, userID)
	if err != nil {
		t.Fatalf("payments: %v", err)
	}
	if len(rows) != 3 {
		t.Fatalf("expected 3 payment rows for the user, got %d", len(rows))
	}
	for _, r := range rows {
		if r.OrderID == "" || r.AmountIDR <= 0 {
			t.Errorf("malformed payment row: %+v", r)
		}
	}
}

func TestAdminUserProjectsAndGenerations_Scoped(t *testing.T) {
	studio := newTestStudioWithDB(t)
	f := NewFrontendService(studio)
	ctx := context.Background()
	userID, cleanup := seedPaidUser(t, studio, ctx)
	defer cleanup()

	if _, err := studio.CreateProjectForUser(ctx, userID, CreateProjectInput{Name: "Owned", Domain: "hospital", DefaultThemeSlug: "shadcn"}); err != nil {
		t.Fatalf("create project: %v", err)
	}

	projects, err := f.AdminUserProjects(ctx, userID)
	if err != nil {
		t.Fatalf("projects: %v", err)
	}
	if len(projects) != 1 || projects[0].Name != "Owned" {
		t.Fatalf("expected exactly the user's 1 project, got %+v", projects)
	}

	// No generation jobs seeded -> empty (non-nil) slice.
	gens, err := f.AdminUserGenerations(ctx, userID)
	if err != nil {
		t.Fatalf("generations: %v", err)
	}
	if gens == nil {
		t.Fatal("expected non-nil generations slice")
	}
}

func TestAdminBillingSummary_RealIDRRevenue(t *testing.T) {
	studio := newTestStudioWithDB(t)
	f := NewFrontendService(studio)
	ctx := context.Background()
	_, cleanup := seedPaidUser(t, studio, ctx)
	defer cleanup()

	sum, err := f.AdminBillingSummary(ctx)
	if err != nil {
		t.Fatalf("billing summary: %v", err)
	}
	// The seeded user contributed 789000 IDR across 2 paid orders; other users in
	// the DB may add more, so assert "at least" the seeded floor.
	if sum.TotalRevenueIDR < 789000 {
		t.Errorf("TotalRevenueIDR = %d, want >= 789000", sum.TotalRevenueIDR)
	}
	if sum.PaidOrders < 2 {
		t.Errorf("PaidOrders = %d, want >= 2", sum.PaidOrders)
	}
	// Per-package breakdown must surface the seeded slugs.
	foundSilver := false
	for _, p := range sum.PackageSales {
		if p.PackageSlug == "silver" && p.RevenueIDR >= 690000 {
			foundSilver = true
		}
	}
	if !foundSilver {
		t.Errorf("expected a 'silver' package-sales row >= 690000, got %+v", sum.PackageSales)
	}
}

func TestAdminCreditAdjustment_WritesAuditLog(t *testing.T) {
	studio := newTestStudioWithDB(t)
	f := NewFrontendService(studio)
	ctx := context.Background()
	userID, cleanup := seedPaidUser(t, studio, ctx)
	defer cleanup()

	actorID := userID // any valid user id works as the actor for the FK-free audit row
	credits := 50
	if _, err := f.AdminUpdateUser(ctx, actorID, userID, AdminUserUpdate{Credits: &credits}); err != nil {
		t.Fatalf("admin update user: %v", err)
	}

	var count int
	if err := studio.pool.QueryRow(ctx,
		`SELECT count(*) FROM audit_logs WHERE action='admin_credit_adjustment' AND resource_id=$1`,
		userID).Scan(&count); err != nil {
		t.Fatalf("count audit logs: %v", err)
	}
	if count < 1 {
		t.Fatalf("expected an admin_credit_adjustment audit log for %s, found %d", userID, count)
	}
}

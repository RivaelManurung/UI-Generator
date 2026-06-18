package postgres

import (
	"context"
	"os"
	"testing"
)

func TestMigrationsIdempotency(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("Skipping migration idempotency test; DATABASE_URL is not set")
	}

	ctx := context.Background()
	pool, err := Open(ctx, dbURL)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer pool.Close()

	migrationsDir := "../../../migrations"

	// 1. Run migrations
	err = RunMigrations(ctx, pool, migrationsDir)
	if err != nil {
		t.Fatalf("failed to run migrations (first time): %v", err)
	}

	// 2. Run migrations again (Idempotency check)
	err = RunMigrations(ctx, pool, migrationsDir)
	if err != nil {
		t.Fatalf("failed to run migrations (second time, idempotency check): %v", err)
	}

	// 3. Rollback migrations
	err = RollbackMigrations(ctx, pool, migrationsDir)
	if err != nil {
		t.Fatalf("failed to rollback migrations: %v", err)
	}

	// 4. Run migrations again (Up -> Down -> Up check)
	err = RunMigrations(ctx, pool, migrationsDir)
	if err != nil {
		t.Fatalf("failed to run migrations (third time, after rollback): %v", err)
	}
}

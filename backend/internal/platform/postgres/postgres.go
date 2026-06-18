package postgres

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Pool = pgxpool.Pool

func Open(ctx context.Context, databaseURL string) (*Pool, error) {
	if databaseURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 10
	cfg.MinConns = 1
	cfg.MaxConnLifetime = 30 * time.Minute
	cfg.MaxConnIdleTime = 5 * time.Minute
	return pgxpool.NewWithConfig(ctx, cfg)
}

func Ping(ctx context.Context, databaseURL string) error {
	pool, err := Open(ctx, databaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()
	return pool.Ping(ctx)
}

func RunMigrations(ctx context.Context, pool *Pool, migrationsDir string) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin migration transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Custom lock key 1337 to serialize startup schema operations
	_, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(1337)")
	if err != nil {
		return fmt.Errorf("failed to acquire pg_advisory_xact_lock: %w", err)
	}

	_, err = tx.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);
	`)
	if err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	files, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	type migrationFile struct {
		version int
		path    string
	}
	var upMigrations []migrationFile

	versionRegex := regexp.MustCompile(`^(\d+)_.*\.up\.sql$`)

	for _, file := range files {
		if file.IsDir() {
			continue
		}
		matches := versionRegex.FindStringSubmatch(file.Name())
		if len(matches) == 2 {
			v, err := strconv.Atoi(matches[1])
			if err != nil {
				continue
			}
			upMigrations = append(upMigrations, migrationFile{
				version: v,
				path:    filepath.Join(migrationsDir, file.Name()),
			})
		}
	}

	// Sort migrations ascending
	for i := 0; i < len(upMigrations); i++ {
		for j := i + 1; j < len(upMigrations); j++ {
			if upMigrations[i].version > upMigrations[j].version {
				upMigrations[i], upMigrations[j] = upMigrations[j], upMigrations[i]
			}
		}
	}

	for _, m := range upMigrations {
		var exists bool
		err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)", m.version).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check migration version: %w", err)
		}
		if exists {
			continue
		}

		sqlBytes, err := os.ReadFile(m.path)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", m.path, err)
		}

		_, err = tx.Exec(ctx, string(sqlBytes))
		if err != nil {
			return fmt.Errorf("failed to execute migration %s: %w", m.path, err)
		}

		_, err = tx.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", m.version)
		if err != nil {
			return fmt.Errorf("failed to record migration version %d: %w", m.version, err)
		}
	}

	return tx.Commit(ctx)
}

func RollbackMigrations(ctx context.Context, pool *Pool, migrationsDir string) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin rollback transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(1337)")
	if err != nil {
		return fmt.Errorf("failed to acquire pg_advisory_xact_lock: %w", err)
	}

	var tableExists bool
	err = tx.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_name = 'schema_migrations'
		)
	`).Scan(&tableExists)
	if err != nil {
		return err
	}
	if !tableExists {
		return nil
	}

	files, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	type migrationFile struct {
		version int
		path    string
	}
	var downMigrations []migrationFile

	versionRegex := regexp.MustCompile(`^(\d+)_.*\.down\.sql$`)

	for _, file := range files {
		if file.IsDir() {
			continue
		}
		matches := versionRegex.FindStringSubmatch(file.Name())
		if len(matches) == 2 {
			v, err := strconv.Atoi(matches[1])
			if err != nil {
				continue
			}
			downMigrations = append(downMigrations, migrationFile{
				version: v,
				path:    filepath.Join(migrationsDir, file.Name()),
			})
		}
	}

	// Sort migrations descending
	for i := 0; i < len(downMigrations); i++ {
		for j := i + 1; j < len(downMigrations); j++ {
			if downMigrations[i].version < downMigrations[j].version {
				downMigrations[i], downMigrations[j] = downMigrations[j], downMigrations[i]
			}
		}
	}

	for _, m := range downMigrations {
		var exists bool
		err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)", m.version).Scan(&exists)
		if err != nil {
			return err
		}
		if !exists {
			continue
		}

		sqlBytes, err := os.ReadFile(m.path)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", m.path, err)
		}

		_, err = tx.Exec(ctx, string(sqlBytes))
		if err != nil {
			return fmt.Errorf("failed to execute migration %s: %w", m.path, err)
		}

		_, err = tx.Exec(ctx, "DELETE FROM schema_migrations WHERE version = $1", m.version)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

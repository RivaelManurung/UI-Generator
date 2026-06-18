package services

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/ai"
	"github.com/kreasinusantara/ui-generator-backend/internal/domain"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/config"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/logger"
	"github.com/kreasinusantara/ui-generator-backend/internal/queue"
)

func TestIntegrationDatabaseAndWorkerFlow(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	redisURL := os.Getenv("REDIS_URL")
	if dbURL == "" || redisURL == "" {
		t.Skip("skipping integration test; DATABASE_URL or REDIS_URL not set")
	}

	cfg := config.Config{
		DatabaseURL:     dbURL,
		RedisURL:        redisURL,
		JWTSecret:       "super-secret-key-32-characters-long-to-be-valid-in-prod",
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 30 * 24 * time.Hour,
		Environment:     "development",
	}

	studio := NewStudioServiceWithConfig(cfg)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Register a test user
	userMail := fmt.Sprintf("integration-%d@example.com", time.Now().UnixNano())
	session, err := studio.Register(RegisterInput{
		Name:     "Integration User",
		Email:    userMail,
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("failed to register user: %v", err)
	}

	// Create project
	project, err := studio.CreateProjectForUser(ctx, session.User.ID, CreateProjectInput{
		Name:             "Integration Project",
		Domain:           "hospital",
		DefaultThemeSlug: "medical-clean",
	})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Create page
	page, err := studio.CreatePageForUser(ctx, session.User.ID, project.ID, CreatePageInput{
		Name:     "Operations",
		PageType: "dashboard",
	})
	if err != nil {
		t.Fatalf("failed to create page: %v", err)
	}

	// Run worker in the background
	log := logger.New()
	consumer := queue.NewConsumer(studio.redisClient, queue.DefaultGenerationStream, "integration-workers", "worker-int")
	aiProvider := ai.NewMockProvider()
	worker := NewGenerationWorker(log, consumer, studio, aiProvider)

	go func() {
		_ = worker.Start(ctx)
	}()

	// Wait for worker to connect
	time.Sleep(500 * time.Millisecond)

	// Call Generate (which will queue the job in Redis stream and reserve credit)
	res, err := studio.GenerateForUser(ctx, session.User.ID, page.ID, "integration-req-1", GenerateInput{
		Prompt:    "Hospital operations statistics",
		PageType:  "dashboard",
		Domain:    "hospital",
		ThemeSlug: "medical-clean",
	})
	if err != nil {
		t.Fatalf("failed to trigger generate: %v", err)
	}

	if res.Job.Status != "queued" {
		t.Fatalf("expected job status to be queued, got %s", res.Job.Status)
	}

	// Poll job status until it succeeds
	var finalJob domain.GenerationJob
	success := false
	for i := 0; i < 20; i++ {
		time.Sleep(200 * time.Millisecond)
		finalJob, err = studio.GetGenerationJobForUser(ctx, session.User.ID, res.Job.ID)
		if err != nil {
			t.Fatalf("failed to get job status: %v", err)
		}
		if finalJob.Status == "succeeded" {
			success = true
			break
		}
		if finalJob.Status == "failed" {
			t.Fatalf("job failed: %s", finalJob.ErrorMessage)
		}
	}

	if !success {
		t.Fatal("timed out waiting for worker to process job")
	}

	// Verify wallet balance is deducted (should be 11, starting from 12)
	wallet, err := studio.WalletForUser(ctx, session.User.ID)
	if err != nil {
		t.Fatalf("failed to get wallet: %v", err)
	}
	if wallet.Balance != 11 {
		t.Fatalf("expected wallet balance to be 11, got %d", wallet.Balance)
	}

	// Verify page version exists
	versions, err := studio.ListVersionsForUser(ctx, session.User.ID, page.ID)
	if err != nil {
		t.Fatalf("failed to list versions: %v", err)
	}
	if len(versions) != 1 {
		t.Fatalf("expected 1 page version, got %d", len(versions))
	}
}

func TestIntegrationQueuePELRecovery(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	redisURL := os.Getenv("REDIS_URL")
	if dbURL == "" || redisURL == "" {
		t.Skip("skipping integration queue recovery test; DATABASE_URL or REDIS_URL not set")
	}

	cfg := config.Config{
		DatabaseURL:     dbURL,
		RedisURL:        redisURL,
		JWTSecret:       "super-secret-key-32-characters-long-to-be-valid-in-prod",
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 30 * 24 * time.Hour,
		Environment:     "development",
	}

	studio := NewStudioServiceWithConfig(cfg)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Register user, project, page
	userMail := fmt.Sprintf("recovery-%d@example.com", time.Now().UnixNano())
	session, err := studio.Register(RegisterInput{
		Name:     "Recovery User",
		Email:    userMail,
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("failed to register: %v", err)
	}

	project, err := studio.CreateProjectForUser(ctx, session.User.ID, CreateProjectInput{
		Name:             "Recovery Project",
		Domain:           "hospital",
		DefaultThemeSlug: "medical-clean",
	})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	page, err := studio.CreatePageForUser(ctx, session.User.ID, project.ID, CreatePageInput{
		Name:     "Recovery Page",
		PageType: "dashboard",
	})
	if err != nil {
		t.Fatalf("failed to create page: %v", err)
	}

	// Trigger generate to queue a job
	res, err := studio.GenerateForUser(ctx, session.User.ID, page.ID, "recovery-req-1", GenerateInput{
		Prompt:    "Hospital operations",
		PageType:  "dashboard",
		Domain:    "hospital",
		ThemeSlug: "medical-clean",
	})
	if err != nil {
		t.Fatalf("failed to generate: %v", err)
	}

	// Consumer 1: Read the message but DO NOT ACK it (simulate crash)
	log := logger.New()
	stream := "recovery_jobs_" + fmt.Sprintf("%d", time.Now().UnixNano())
	
	// Re-route studio producer to this temporary stream so we can isolate
	studio.queueProducer = queue.NewProducer(studio.redisClient, stream)
	err = studio.queueProducer.EnqueueGeneration(ctx, queue.GenerationTask{
		JobID:        res.Job.ID,
		UserID:       session.User.ID,
		Operation:    "generate",
		SectionIndex: -1,
	})
	if err != nil {
		t.Fatalf("failed to enqueue: %v", err)
	}

	consumer1 := queue.NewConsumer(studio.redisClient, stream, "recovery-group", "crashed-worker")
	err = consumer1.EnsureGroup(ctx)
	if err != nil {
		t.Fatalf("failed to create group: %v", err)
	}

	msgs, err := consumer1.ReadPending(ctx, 1, 1*time.Second)
	if err != nil {
		t.Fatalf("failed to read pending: %v", err)
	}
	if len(msgs) != 1 {
		t.Fatal("expected to read 1 message")
	}

	// Now wait for a short MinIdleTime (e.g. 100ms)
	time.Sleep(150 * time.Millisecond)

	// Consumer 2: Real worker that recovers pending messages
	consumer2 := queue.NewConsumer(studio.redisClient, stream, "recovery-group", "recovering-worker")
	aiProvider := ai.NewMockProvider()
	worker := NewGenerationWorker(log, consumer2, studio, aiProvider)
	worker.MinIdleTime = 100 * time.Millisecond

	// Recover pending messages manually
	worker.recoverPending(ctx)

	// Poll job status until it succeeds
	success := false
	for i := 0; i < 20; i++ {
		time.Sleep(100 * time.Millisecond)
		job, err := studio.GetGenerationJobForUser(ctx, session.User.ID, res.Job.ID)
		if err != nil {
			t.Fatalf("failed to get job status: %v", err)
		}
		if job.Status == "succeeded" {
			success = true
			break
		}
	}

	if !success {
		t.Fatal("timed out waiting for worker to process recovered job")
	}
}

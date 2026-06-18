package main

import (
	"context"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/kreasinusantara/ui-generator-backend/internal/ai"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/config"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/logger"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/redis"
	"github.com/kreasinusantara/ui-generator-backend/internal/queue"
	"github.com/kreasinusantara/ui-generator-backend/internal/services"
)

func main() {
	log := logger.New()
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Error("invalid configuration", map[string]interface{}{"error": err.Error()})
		return
	}
	client, err := redis.Open(cfg.RedisURL)
	if err != nil {
		log.Error("failed to open redis", map[string]interface{}{"error": err.Error()})
		return
	}
	defer client.Close()

	studio := services.NewStudioServiceWithConfig(cfg)
	var aiProvider ai.Provider
	if strings.EqualFold(cfg.AIProvider, "gemini") {
		aiProvider = ai.NewGeminiProvider(cfg.GeminiAPIKey)
	} else {
		aiProvider = ai.NewMockProvider()
	}

	consumer := queue.NewConsumer(client, queue.DefaultGenerationStream, "generation-workers", "worker-1")
	worker := services.NewGenerationWorker(log, consumer, studio, aiProvider)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	log.Info("worker starting", map[string]interface{}{
		"queue": queue.DefaultGenerationStream,
		"group": "generation-workers",
	})

	if err := worker.Start(ctx); err != nil {
		log.Error("worker error", map[string]interface{}{"error": err.Error()})
	}
}

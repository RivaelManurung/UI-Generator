package main

import (
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/config"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/logger"
	"github.com/kreasinusantara/ui-generator-backend/internal/router"
)

func main() {
	cfg := config.Load()
	log := logger.New()
	if err := cfg.Validate(); err != nil {
		log.Error("invalid configuration", map[string]interface{}{"error": err.Error()})
		return
	}
	r := router.NewWithConfig(cfg)
	log.Info("api listening", map[string]interface{}{"port": cfg.Port})
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Error("api stopped", map[string]interface{}{"error": err.Error()})
	}
}

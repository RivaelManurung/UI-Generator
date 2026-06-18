package router

import (
	"context"
	"net/http"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kreasinusantara/ui-generator-backend/internal/handlers"
	"github.com/kreasinusantara/ui-generator-backend/internal/http/middleware"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/config"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/postgres"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/redis"
	"github.com/kreasinusantara/ui-generator-backend/internal/services"
)

// New builds the Gin engine with middleware and routes registered.
func New() *gin.Engine {
	return NewWithConfig(config.Load())
}

func NewWithConfig(cfg config.Config) *gin.Engine {
	r := gin.New()
	r.Use(
		middleware.RequestID(),
		middleware.Recovery(),
		middleware.Timeout(180*time.Second),
		middleware.BodySizeLimit(1<<20),
		middleware.SecurityHeaders(),
		middleware.AccessLog(),
	)
	var redisClient *redis.Client
	if cfg.RedisURL != "" {
		if c, err := redis.Open(cfg.RedisURL); err == nil {
			redisClient = c
		}
	}
	studio := services.NewStudioServiceWithConfig(cfg)
	frontend := services.NewFrontendService(studio)
	payments := services.NewPaymentService(studio, cfg)
	freeTemplates := services.NewFreeTemplateService(studio)
	h := handlers.New(studio, frontend, payments, freeTemplates)
	authLimiter := middleware.NewRateLimiter(redisClient, 20, time.Minute)
	generationLimiter := middleware.NewRateLimiter(redisClient, 12, time.Minute)

	// Allow the Next.js dev server to call the API directly during development.
	r.Use(corsMiddleware(cfg.AllowedCORSOrigins))
	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	r.GET("/readyz", func(c *gin.Context) {
		postgresStatus := "ok"
		redisStatus := "ok"
		isReady := true

		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		if cfg.DatabaseURL == "" {
			postgresStatus = "down"
			isReady = false
		} else if err := postgres.Ping(ctx, cfg.DatabaseURL); err != nil {
			postgresStatus = "down"
			isReady = false
		}

		if cfg.RedisURL == "" {
			if strings.EqualFold(cfg.Environment, "production") {
				redisStatus = "down"
				isReady = false
			} else {
				redisStatus = "not_configured"
			}
		} else if err := redis.Ping(ctx, cfg.RedisURL); err != nil {
			redisStatus = "down"
			isReady = false
		}

		status := "ok"
		httpStatus := http.StatusOK
		if !isReady {
			status = "down"
			httpStatus = http.StatusServiceUnavailable
		}

		c.JSON(httpStatus, gin.H{
			"status": status,
			"checks": gin.H{
				"postgres": postgresStatus,
				"redis":    redisStatus,
			},
		})
	})

	api := r.Group("/api")
	{
		api.GET("/health", h.Health)
		api.GET("/hello", h.Hello)
		registerV1(api.Group("/v1"), h, studio, authLimiter, generationLimiter)
	}
	registerV1(r.Group("/v1"), h, studio, authLimiter, generationLimiter)

	return r
}

func registerV1(v1 *gin.RouterGroup, h *handlers.Handler, verifier middleware.TokenVerifier, authLimiter *middleware.RateLimiter, generationLimiter *middleware.RateLimiter) {
	v1.POST("/auth/register", authLimiter.Middleware("auth_register"), h.Register)
	v1.POST("/auth/login", authLimiter.Middleware("auth_login"), h.Login)
	v1.POST("/auth/refresh", authLimiter.Middleware("auth_refresh"), h.Refresh)
	v1.GET("/themes", h.Themes)
	v1.GET("/design-systems", h.DesignSystems)
	v1.GET("/templates", h.Templates)
	v1.GET("/credit-packages", h.ListCreditPackages)
	// Public webhook — secured by Midtrans signature verification, not auth.
	v1.POST("/payments/midtrans/notification", h.MidtransNotification)
	// Public free templates (freebies).
	v1.GET("/free-templates", h.ListFreeTemplates)
	v1.GET("/free-templates/:slug", h.GetFreeTemplate)
	v1.POST("/free-templates/:slug/download", h.DownloadFreeTemplate)

	authenticated := v1.Group("", middleware.Auth(verifier))
	{
		authenticated.POST("/auth/logout", h.Logout)
		authenticated.GET("/auth/me", h.Me)

		// Projects (frontend contract: raw camelCase shapes).
		authenticated.GET("/projects", h.FEListProjects)
		authenticated.POST("/projects", h.FECreateProject)
		authenticated.GET("/projects/:id", validateUUIDParams("id"), h.FEGetProject)
		authenticated.PUT("/projects/:id", validateUUIDParams("id"), h.FEUpdateProject)
		authenticated.PATCH("/projects/:id", validateUUIDParams("id"), h.FEUpdateProject)
		authenticated.DELETE("/projects/:id", validateUUIDParams("id"), h.FEDeleteProject)

		// Project-level versions & generation.
		authenticated.GET("/projects/:id/versions", validateUUIDParams("id"), h.FEListVersions)
		authenticated.GET("/projects/:id/versions/:versionId", validateUUIDParams("id"), h.FEVersionByID)
		authenticated.GET("/projects/:id/versions/:versionId/files", validateUUIDParams("id"), h.FEVersionFiles)
		authenticated.POST("/projects/:id/versions/:versionId/restore", validateUUIDParams("id"), h.FERestoreVersion)
		authenticated.POST("/projects/:id/generations", validateUUIDParams("id"), generationLimiter.Middleware("generate"), h.FEGenerate)
		authenticated.POST("/projects/:id/generations/refine", validateUUIDParams("id"), generationLimiter.Middleware("refine"), h.FERefine)
		authenticated.POST("/projects/:id/generate-pages", validateUUIDParams("id"), generationLimiter.Middleware("generate"), h.FEGeneratePages)
		authenticated.GET("/projects/:id/app-pages", validateUUIDParams("id"), h.FEProjectPages)
		authenticated.GET("/projects/:id/export.zip", validateUUIDParams("id"), h.FEProjectExportZip)
		authenticated.GET("/generation-batches/:batchId", h.FEGetBatch)
		authenticated.GET("/generation-batches/:batchId/events", h.FEBatchEvents)

		// Internal page-centric routes (kept for compatibility/tests).
		authenticated.GET("/projects/:id/pages", validateUUIDParams("id"), h.ListProjectPages)
		authenticated.POST("/projects/:id/pages", validateUUIDParams("id"), h.CreatePage)
		authenticated.GET("/pages/:id", validateUUIDParams("id"), h.GetPage)
		authenticated.PATCH("/pages/:id", validateUUIDParams("id"), h.UpdatePage)
		authenticated.DELETE("/pages/:id", validateUUIDParams("id"), h.DeletePage)
		authenticated.POST("/pages/:id/generate", validateUUIDParams("id"), generationLimiter.Middleware("generate"), h.GeneratePage)
		authenticated.POST("/pages/:id/refine", validateUUIDParams("id"), generationLimiter.Middleware("refine"), h.RefinePage)
		authenticated.GET("/pages/:id/versions", validateUUIDParams("id"), h.ListVersions)
		authenticated.POST("/pages/:id/versions/:versionId/restore", validateUUIDParams("id", "versionId"), h.RestoreVersion)
		authenticated.GET("/generation-jobs/:id", validateUUIDParams("id"), h.GetGenerationJob)

		// Credits.
		authenticated.GET("/credits/balance", h.FECreditBalance)
		authenticated.GET("/credits/transactions", h.FECreditTransactions)
		authenticated.POST("/credits/preview-cost", h.FEPreviewCost)
		authenticated.POST("/credits/deduct", generationLimiter.Middleware("deduct"), h.FEDeductCredits)

		// Paid credit top-up via Midtrans (replaces the old free /credits/purchase).
		authenticated.POST("/payments/checkout", h.Checkout)
		authenticated.GET("/payments/:orderId", h.PaymentStatus)
		authenticated.GET("/billing/wallet", h.Wallet)
		authenticated.GET("/billing/transactions", h.BillingTransactions)

		// User settings.
		authenticated.GET("/user/profile", h.FEGetSettings)
		authenticated.PUT("/user/profile", h.FEUpdateProfile)
		authenticated.PUT("/user/generation-preferences", h.FEUpdateGenerationPreferences)
		authenticated.PUT("/user/workspace", h.FEUpdateWorkspace)
		authenticated.PUT("/user/security", h.FEUpdateSecurity)

		// API keys.
		authenticated.GET("/api-keys", h.FEListAPIKeys)
		authenticated.POST("/api-keys", h.FECreateAPIKey)
		authenticated.DELETE("/api-keys/:id", validateUUIDParams("id"), h.FERevokeAPIKey)

		admin := authenticated.Group("/admin", middleware.AdminOnly())
		admin.GET("/users", h.FEAdminUsers)
		admin.PATCH("/users/:id", validateUUIDParams("id"), h.FEAdminUpdateUser)
		admin.DELETE("/users/:id", validateUUIDParams("id"), h.FEAdminDeleteUser)
		admin.GET("/generation-jobs", h.FEAdminGenerationJobs)
		admin.POST("/generation-jobs/:id/retry", validateUUIDParams("id"), h.FEAdminRetryGeneration)
		admin.GET("/projects", h.FEAdminProjects)
		admin.DELETE("/projects/:id", validateUUIDParams("id"), h.FEAdminDeleteProject)
		admin.GET("/templates", h.FEAdminListTemplates)
		admin.POST("/templates", h.FEAdminCreateTemplate)
		admin.PUT("/templates/:id", h.FEAdminUpdateTemplate)
		admin.DELETE("/templates/:id", h.FEAdminDeleteTemplate)
		admin.GET("/free-templates", h.FEAdminListFreeTemplates)
		admin.POST("/free-templates", h.FEAdminPublishFreeTemplate)
		admin.PATCH("/free-templates/:id", validateUUIDParams("id"), h.FEAdminUpdateFreeTemplate)
		admin.DELETE("/free-templates/:id", validateUUIDParams("id"), h.FEAdminDeleteFreeTemplate)
		admin.GET("/themes", h.FEAdminListThemes)
		admin.POST("/themes", h.FEAdminCreateTheme)
		admin.PUT("/themes/:slug", h.FEAdminUpdateTheme)
		admin.DELETE("/themes/:slug", h.FEAdminDeleteTheme)
		admin.GET("/billing/summary", h.FEAdminBillingSummary)
		admin.GET("/billing/transactions", h.FEAdminTransactions)
		admin.GET("/audit-logs", h.AdminAuditLogs)
		admin.GET("/metrics/summary", h.AdminMetricsSummary)
		admin.GET("/analytics/kpis", h.FEAdminAnalyticsKPIs)
		admin.GET("/analytics/generation-funnel", h.FEAdminAnalyticsFunnel)
		admin.GET("/analytics/category-breakdown", h.FEAdminAnalyticsCategories)
	}
}

func corsMiddleware(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && slices.Contains(allowedOrigins, origin) {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, Idempotency-Key, X-Request-ID")
		c.Header("Vary", "Origin")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

var uuidRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
var rawHexRegex = regexp.MustCompile(`^[0-9a-fA-F]{32}$`)
var mockIDRegex = regexp.MustCompile(`^(proj|page|user|job|ver|tx|schema)_[a-zA-Z0-9_-]+$`)

func isValidUUID(uuid string) bool {
	return uuidRegex.MatchString(uuid) || rawHexRegex.MatchString(uuid) || mockIDRegex.MatchString(uuid)
}

func validateUUIDParams(params ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		for _, param := range params {
			val := c.Param(param)
			if val != "" && !isValidUUID(val) {
				c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
					"error": gin.H{
						"code":      "BAD_REQUEST",
						"message":   "invalid ID format for parameter: " + param,
						"requestId": middleware.RequestIDFrom(c),
					},
				})
				return
			}
		}
		c.Next()
	}
}

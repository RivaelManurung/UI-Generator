package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kreasinusantara/ui-generator-backend/internal/ai"
	"github.com/kreasinusantara/ui-generator-backend/internal/domain"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/config"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/logger"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/metrics"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/postgres"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/redis"
	"github.com/kreasinusantara/ui-generator-backend/internal/queue"
	"github.com/kreasinusantara/ui-generator-backend/internal/renderer"
	"github.com/kreasinusantara/ui-generator-backend/internal/repositories"
	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

const defaultUserID = "user_demo"

const maxPromptLength = 2000

const (
	operationGenerate = "generate"
	operationRefine   = "refine"
)

var allowedInputPageTypes = map[string]bool{
	"dashboard": true,
	"list":      true,
	"form":      true,
	"detail":    true,
	"login":     true,
	"analytics": true,
}

var allowedDomains = map[string]bool{
	"custom":     true,
	"hospital":   true,
	"medical":    true,
	"healthcare": true,
	"school":     true,
	"education":  true,
	"finance":    true,
	"inventory":  true,
	"government": true,
	"crm":        true,
	"pos":        true,
	"hr":         true,
}

var allowedOutputModes = map[string]bool{
	"":     true,
	"tsx":  true,
	"html": true,
	"json": true,
}

type CreateProjectInput struct {
	Name             string `json:"name"`
	Description      string `json:"description"`
	Domain           string `json:"domain"`
	DefaultThemeSlug string `json:"defaultThemeSlug"`
}

type CreatePageInput struct {
	Name     string `json:"name"`
	PageType string `json:"pageType"`
}

type UpdateProjectInput struct {
	Name             string `json:"name"`
	Description      string `json:"description"`
	Domain           string `json:"domain"`
	DefaultThemeSlug string `json:"defaultThemeSlug"`
}

type UpdatePageInput struct {
	Name     string `json:"name"`
	PageType string `json:"pageType"`
}

type GenerateInput struct {
	Prompt     string `json:"prompt"`
	PageType   string `json:"pageType"`
	ThemeSlug  string `json:"themeSlug"`
	Domain     string `json:"domain"`
	OutputMode string `json:"outputMode"`
}

type RefineInput struct {
	Prompt       string `json:"prompt"`
	SectionIndex int    `json:"sectionIndex"`
}

type GenerateResult struct {
	Job     domain.GenerationJob `json:"job"`
	Page    domain.Page          `json:"page"`
	Version domain.PageVersion   `json:"version"`
	Wallet  domain.CreditWallet  `json:"wallet"`
}

type StudioService struct {
	mu              sync.RWMutex
	jwtSecret       string
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration

	// Repositories
	users         repositories.UserRepository
	refreshTokens repositories.RefreshTokenRepository
	projects      repositories.ProjectRepository
	pages         repositories.PageRepository
	versions      repositories.PageVersionRepository
	jobs          repositories.GenerationJobRepository
	wallets       repositories.CreditWalletRepository
	transactions  repositories.CreditTransactionRepository
	themesRepo    repositories.ThemeRepository
	templatesRepo repositories.TemplateRepository
	auditLogs     repositories.AuditLogRepository
	idempotency   repositories.IdempotencyKeyRepository
	tx            repositories.TxManager
	queueProducer *queue.Producer
	aiProvider    ai.Provider
	redisClient   *redis.Client
	pool          *pgxpool.Pool
}

func NewStudioService() *StudioService {
	return NewStudioServiceWithConfig(config.Config{})
}

func NewStudioServiceWithConfig(cfg config.Config) *StudioService {

	s := &StudioService{
		jwtSecret:       cfg.JWTSecret,
		accessTokenTTL:  cfg.AccessTokenTTL,
		refreshTokenTTL: cfg.RefreshTokenTTL,
		aiProvider: func() ai.Provider {
			switch strings.ToLower(cfg.AIProvider) {
			case "gemini":
				return ai.NewGeminiProvider(cfg.GeminiAPIKey)
			case "openai", "tokenrouter", "openrouter", "commandcode", "9router", "ninerouter":
				return ai.NewOpenAIProvider(cfg.OpenAIAPIKey, cfg.OpenAIBaseURL, cfg.OpenAIModel)
			default:
				return ai.NewMockProvider()
			}
		}(),
	}

	if cfg.DatabaseURL == "" {
		// Initialize with Mocks for testing/local dev without DB
		s.tx = &repositories.MockTxManager{}
		s.users = repositories.NewMockUserRepository()
		s.refreshTokens = repositories.NewMockRefreshTokenRepository()
		s.projects = repositories.NewMockProjectRepository()
		s.pages = repositories.NewMockPageRepository()
		s.versions = repositories.NewMockPageVersionRepository()
		s.jobs = repositories.NewMockGenerationJobRepository()
		s.wallets = repositories.NewMockCreditWalletRepository()
		s.transactions = repositories.NewMockCreditTransactionRepository()
		s.auditLogs = repositories.NewMockAuditLogRepository()
		s.idempotency = repositories.NewMockIdempotencyKeyRepository()

		s.themesRepo = repositories.NewMockThemeRepository(seedThemes())

		templates := []domain.Template{
			{ID: "hospital-dashboard", Name: "Hospital Operations", Domain: "hospital", PageType: "dashboard", ComponentHint: 10, Tier: "Free", Description: "Appointments, doctors, departments, and patient flow."},
			{ID: "inventory-list", Name: "Inventory List", Domain: "inventory", PageType: "list", ComponentHint: 8, Tier: "Premium", Description: "SKU health, stock movement, and supplier alerts."},
			{ID: "finance-analytics", Name: "Finance Analytics", Domain: "finance", PageType: "dashboard", ComponentHint: 9, Tier: "Premium", Description: "Revenue, invoices, accounts, and cash-flow analytics."},
			{ID: "school-attendance", Name: "School Attendance", Domain: "education", PageType: "list", ComponentHint: 7, Tier: "Free", Description: "Attendance table, filters, and class-level summaries."},
			{ID: "village-management", Name: "Village Management", Domain: "government", PageType: "dashboard", ComponentHint: 9, Tier: "Free", Description: "Citizen services, cases, budgets, and activity reports."},
		}
		s.templatesRepo = repositories.NewMockTemplateRepository(templates)

		s.queueProducer = &queue.Producer{
			EnqueueFunc: func(ctx context.Context, task queue.GenerationTask) error {
				// Simulate async background worker in-memory
				go func() {
					worker := NewGenerationWorker(logger.New(), nil, s, s.aiProvider)
					_ = worker.ProcessJob(context.Background(), task.JobID, task.UserID, task.Operation, task.SectionIndex)
				}()
				return nil
			},
		}

		s.seedUsers()
		s.seedData()
	} else {

		ctx := context.Background()
		pool, err := postgres.Open(ctx, cfg.DatabaseURL)
		if err != nil {
			panic(fmt.Sprintf("failed to open database: %v", err))
		}
		migrationsDir := "migrations"
		for i := 0; i < 4; i++ {
			if _, err := os.Stat(migrationsDir); err == nil {
				break
			}
			migrationsDir = "../" + migrationsDir
		}
		if err := postgres.RunMigrations(ctx, pool, migrationsDir); err != nil {
			panic(fmt.Sprintf("failed to run migrations: %v", err))
		}
		s.pool = pool
		seedDB(ctx, pool)
		// Demo/admin accounts are a dev convenience only — never seed them in production.
		if !strings.EqualFold(cfg.Environment, "production") {
			s.seedAuthUsersDB(ctx)
		}
		s.reconcileStaleJobs(ctx)

		s.users = repositories.NewPostgresUserRepository(pool)
		s.refreshTokens = repositories.NewPostgresRefreshTokenRepository(pool)
		s.projects = repositories.NewPostgresProjectRepository(pool)
		s.pages = repositories.NewPostgresPageRepository(pool)
		s.versions = repositories.NewPostgresPageVersionRepository(pool)
		s.jobs = repositories.NewPostgresGenerationJobRepository(pool)
		s.wallets = repositories.NewPostgresCreditWalletRepository(pool)
		s.transactions = repositories.NewPostgresCreditTransactionRepository(pool)
		s.themesRepo = repositories.NewPostgresThemeRepository(pool)
		s.templatesRepo = repositories.NewPostgresTemplateRepository(pool)
		s.auditLogs = repositories.NewPostgresAuditLogRepository(pool)
		s.idempotency = repositories.NewPostgresIdempotencyKeyRepository(pool)
		s.tx = repositories.NewSQLTxManager(pool)

		// Only enable the async (Redis-backed) generation path when Redis is
		// actually reachable. go-redis connects lazily, so a successful Open()
		// does not mean a worker can drain the queue; without this check jobs
		// would sit "queued" forever on deployments that have no live Redis.
		if cfg.RedisURL != "" {
			pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
			reachable := redis.Ping(pingCtx, cfg.RedisURL) == nil
			cancel()
			if reachable {
				if redisClient, err := redis.Open(cfg.RedisURL); err == nil {
					s.queueProducer = queue.NewProducer(redisClient, queue.DefaultGenerationStream)
					s.redisClient = redisClient
				}
			}
		}
	}

	return s
}

func (s *StudioService) seedData() {
	ctx := context.Background()
	p, _ := s.projects.Create(ctx, domain.Project{
		ID:               "proj_demo",
		UserID:           defaultUserID,
		Name:             "My First Project",
		Description:      "Automated dashboard workspace",
		Domain:           "hospital",
		DefaultThemeSlug: "medical-clean",
		CreatedAt:        time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
	})
	s.pages.CreateOwned(ctx, defaultUserID, domain.Page{
		ID:        "page_demo",
		ProjectID: p.ID,
		Name:      "Operational Overview",
		Slug:      "overview",
		PageType:  "dashboard",
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	})
}

func (s *StudioService) IsFake() bool {
	_, ok := s.tx.(*repositories.MockTxManager)
	return ok
}

// seedThemes lists every theme slug the platform supports, including the
// planetary slugs the Next.js frontend offers in its theme picker.
// A theme is a dashboard UI kit that generation targets. The `Library` field
// drives which component system the generated code imports and renders.
func seedThemes() []domain.Theme {
	return []domain.Theme{
		{Slug: "shadcn", Name: "shadcn/ui", Accent: "#0f172a", Library: "shadcn", Description: "Radix primitives + Tailwind. Clean, neutral, accessible."},
		// Visual design systems — single source of truth is internal/designsystem
		// (token maps). They render through the token-driven renderer, not a kit.
		{Slug: "neobrutalism", Name: "Neobrutalism", Accent: "#ff5470", Library: "neobrutalism", Description: "Thick black borders, hard offset shadows, zero radius, bold color blocks."},
		{Slug: "doodle", Name: "Doodle / Sketch", Accent: "#5b8def", Library: "doodle", Description: "Hand-drawn feel: handwriting font, sketchy borders, playful pastels."},
		{Slug: "glass", Name: "Glassmorphism", Accent: "#4f46e5", Library: "glass", Description: "Frosted translucent panels, soft gradients, blur, light borders."},
		{Slug: "soft", Name: "Soft / Material", Accent: "#4f46e5", Library: "soft", Description: "Rounded corners, layered soft shadows, friendly Material elevation."},
		{Slug: "reui", Name: "ReUI", Accent: "#6d28d9", Library: "reui", Description: "Tailwind components on Radix with expressive styling."},
		{Slug: "antd", Name: "Ant Design", Accent: "#1677ff", Library: "antd", Description: "Enterprise component system imported from 'antd'."},
		{Slug: "mui", Name: "Material UI", Accent: "#1976d2", Library: "mui", Description: "Material Design via '@mui/material'."},
		{Slug: "chakra", Name: "Chakra UI", Accent: "#319795", Library: "chakra", Description: "Composable, themeable components from '@chakra-ui/react'."},
		// Legacy accent slugs kept so existing projects keep validating; they
		// render with the shadcn kit.
		{Slug: "medical-clean", Name: "Medical Clean", Accent: "#0891b2", Library: "shadcn", Description: "Legacy accent theme."},
		{Slug: "studio-neutral", Name: "Studio Neutral", Accent: "#475569", Library: "shadcn", Description: "Legacy accent theme."},
		{Slug: "jakarta", Name: "Jakarta", Accent: "#334eac", Library: "shadcn", Description: "Legacy accent theme."},
		{Slug: "jakarta-lite", Name: "Jakarta Lite", Accent: "#7096d1", Library: "shadcn", Description: "Legacy accent theme."},
		{Slug: "bandung", Name: "Bandung", Accent: "#0f766e", Library: "shadcn", Description: "Legacy accent theme."},
		{Slug: "bali", Name: "Bali", Accent: "#b45309", Library: "shadcn", Description: "Legacy accent theme."},
	}
}

func seedDB(ctx context.Context, pool *pgxpool.Pool) {
	for _, theme := range seedThemes() {
		_, _ = pool.Exec(ctx, `
			INSERT INTO themes (slug, name, accent, library, description, created_at)
			VALUES ($1, $2, $3, $4, $5, now())
			ON CONFLICT (slug) DO UPDATE SET library = EXCLUDED.library, description = EXCLUDED.description;
		`, theme.Slug, theme.Name, theme.Accent, theme.Library, theme.Description)
	}

	templates := []struct {
		ID            string
		Name          string
		Domain        string
		PageType      string
		ComponentHint int
		Tier          string
		Description   string
	}{
		{ID: "hospital-dashboard", Name: "Hospital Operations", Domain: "hospital", PageType: "dashboard", ComponentHint: 10, Tier: "Free", Description: "Appointments, doctors, departments, and patient flow."},
		{ID: "inventory-list", Name: "Inventory List", Domain: "inventory", PageType: "list", ComponentHint: 8, Tier: "Premium", Description: "SKU health, stock movement, and supplier alerts."},
		{ID: "finance-analytics", Name: "Finance Analytics", Domain: "finance", PageType: "dashboard", ComponentHint: 9, Tier: "Premium", Description: "Revenue, invoices, accounts, and cash-flow analytics."},
		{ID: "school-attendance", Name: "School Attendance", Domain: "education", PageType: "list", ComponentHint: 7, Tier: "Free", Description: "Attendance table, filters, and class-level summaries."},
		{ID: "village-management", Name: "Village Management", Domain: "government", PageType: "dashboard", ComponentHint: 9, Tier: "Free", Description: "Citizen services, cases, budgets, and activity reports."},
	}
	for _, tpl := range templates {
		_, _ = pool.Exec(ctx, `
			INSERT INTO templates (id, name, domain, page_type, component_hint, tier, description, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, now())
			ON CONFLICT (id) DO NOTHING;
		`, tpl.ID, tpl.Name, tpl.Domain, tpl.PageType, tpl.ComponentHint, tpl.Tier, tpl.Description)
	}
}

func (s *StudioService) ListProjects(ctx context.Context) ([]domain.Project, error) {
	return s.ListProjectsForUser(ctx, defaultUserID)
}

func (s *StudioService) ListProjectsForUser(ctx context.Context, userID string) ([]domain.Project, error) {
	return s.projects.ListByUser(ctx, userID)
}

func (s *StudioService) GetProject(ctx context.Context, id string) (domain.Project, []domain.Page, error) {
	return s.GetProjectForUser(ctx, defaultUserID, id)
}

func (s *StudioService) GetProjectForUser(ctx context.Context, userID string, id string) (domain.Project, []domain.Page, error) {
	project, err := s.projects.FindOwned(ctx, userID, id)
	if err != nil {
		return domain.Project{}, nil, apperrors.NotFound("Project not found or you do not have access.")
	}
	pages, err := s.pages.ListByOwnedProject(ctx, userID, id)
	if err != nil {
		return domain.Project{}, nil, err
	}
	for i := range pages {
		if pages[i].CurrentVersionID != "" {
			version, err := s.versions.FindOwned(ctx, userID, pages[i].ID, pages[i].CurrentVersionID)
			if err == nil {
				pages[i].CurrentVersion = &version
			}
		}
	}
	return project, pages, nil
}

func (s *StudioService) ListPagesForOwnedProject(ctx context.Context, userID string, projectID string) ([]domain.Page, error) {
	_, pages, err := s.GetProjectForUser(ctx, userID, projectID)
	return pages, err
}

func (s *StudioService) CreateProject(ctx context.Context, input CreateProjectInput) (domain.Project, error) {
	return s.CreateProjectForUser(ctx, defaultUserID, input)
}

func (s *StudioService) CreateProjectForUser(ctx context.Context, userID string, input CreateProjectInput) (domain.Project, error) {
	if strings.TrimSpace(input.Name) == "" {
		return domain.Project{}, apperrors.Validation("name is required")
	}
	if len(strings.TrimSpace(input.Name)) > 100 {
		return domain.Project{}, apperrors.Validation("name must be at most 100 characters")
	}
	if domainName := strings.TrimSpace(input.Domain); domainName != "" && !allowedDomains[strings.ToLower(domainName)] {
		return domain.Project{}, apperrors.Validation("domain is not supported")
	}
	if themeSlug := strings.TrimSpace(input.DefaultThemeSlug); themeSlug != "" && !s.themeExists(ctx, themeSlug) {
		return domain.Project{}, apperrors.Validation("defaultThemeSlug is not supported")
	}
	pID, err := newID()
	if err != nil {
		return domain.Project{}, err
	}
	now := time.Now().UTC()
	project := domain.Project{
		ID:               pID,
		UserID:           userID,
		Name:             strings.TrimSpace(input.Name),
		Description:      strings.TrimSpace(input.Description),
		Domain:           fallback(input.Domain, "custom"),
		DefaultThemeSlug: fallback(input.DefaultThemeSlug, "studio-neutral"),
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	return s.projects.Create(ctx, project)
}

func (s *StudioService) UpdateProjectForUser(ctx context.Context, userID string, projectID string, input UpdateProjectInput) (domain.Project, error) {
	if strings.TrimSpace(input.Name) == "" {
		return domain.Project{}, apperrors.Validation("name is required")
	}
	if len(strings.TrimSpace(input.Name)) > 100 {
		return domain.Project{}, apperrors.Validation("name must be at most 100 characters")
	}
	if domainName := strings.TrimSpace(input.Domain); domainName != "" && !allowedDomains[strings.ToLower(domainName)] {
		return domain.Project{}, apperrors.Validation("domain is not supported")
	}
	if themeSlug := strings.TrimSpace(input.DefaultThemeSlug); themeSlug != "" && !s.themeExists(ctx, themeSlug) {
		return domain.Project{}, apperrors.Validation("defaultThemeSlug is not supported")
	}

	project, err := s.projects.FindOwned(ctx, userID, projectID)
	if err != nil {
		return domain.Project{}, apperrors.NotFound("Project not found or you do not have access.")
	}
	project.Name = strings.TrimSpace(input.Name)
	project.Description = strings.TrimSpace(input.Description)
	project.Domain = fallback(input.Domain, project.Domain)
	project.DefaultThemeSlug = fallback(input.DefaultThemeSlug, project.DefaultThemeSlug)
	project.UpdatedAt = time.Now().UTC()

	return s.projects.UpdateOwned(ctx, userID, project)
}

func (s *StudioService) DeleteProjectForUser(ctx context.Context, userID string, projectID string) error {
	return s.projects.SoftDeleteOwned(ctx, userID, projectID)
}

func (s *StudioService) CreatePage(ctx context.Context, projectID string, input CreatePageInput) (domain.Page, error) {
	return s.CreatePageForUser(ctx, defaultUserID, projectID, input)
}

func (s *StudioService) CreatePageForUser(ctx context.Context, userID string, projectID string, input CreatePageInput) (domain.Page, error) {
	if strings.TrimSpace(input.Name) == "" {
		return domain.Page{}, apperrors.Validation("name is required")
	}
	if len(strings.TrimSpace(input.Name)) > 100 {
		return domain.Page{}, apperrors.Validation("name must be at most 100 characters")
	}
	if pageType := strings.TrimSpace(input.PageType); pageType != "" && !allowedInputPageTypes[pageType] {
		return domain.Page{}, apperrors.Validation("pageType is not supported")
	}

	_, err := s.projects.FindOwned(ctx, userID, projectID)
	if err != nil {
		return domain.Page{}, apperrors.NotFound("Project not found or you do not have access.")
	}

	pgID, err := newID()
	if err != nil {
		return domain.Page{}, err
	}
	now := time.Now().UTC()
	page := domain.Page{
		ID:        pgID,
		ProjectID: projectID,
		Name:      strings.TrimSpace(input.Name),
		Slug:      slugify(input.Name),
		PageType:  fallback(input.PageType, "dashboard"),
		CreatedAt: now,
		UpdatedAt: now,
	}
	return s.pages.CreateOwned(ctx, userID, page)
}

func (s *StudioService) UpdatePageForUser(ctx context.Context, userID string, pageID string, input UpdatePageInput) (domain.Page, error) {
	if strings.TrimSpace(input.Name) == "" {
		return domain.Page{}, apperrors.Validation("name is required")
	}
	if len(strings.TrimSpace(input.Name)) > 100 {
		return domain.Page{}, apperrors.Validation("name must be at most 100 characters")
	}
	if pageType := strings.TrimSpace(input.PageType); pageType != "" && !allowedInputPageTypes[pageType] {
		return domain.Page{}, apperrors.Validation("pageType is not supported")
	}

	page, err := s.pages.FindOwned(ctx, userID, pageID)
	if err != nil {
		return domain.Page{}, apperrors.NotFound("Page not found or you do not have access.")
	}
	page.Name = strings.TrimSpace(input.Name)
	page.Slug = slugify(input.Name)
	page.PageType = fallback(input.PageType, page.PageType)
	page.UpdatedAt = time.Now().UTC()

	updatedPage, err := s.pages.UpdateOwned(ctx, userID, page)
	if err != nil {
		return domain.Page{}, err
	}
	if updatedPage.CurrentVersionID != "" {
		version, err := s.versions.FindOwned(ctx, userID, updatedPage.ID, updatedPage.CurrentVersionID)
		if err == nil {
			updatedPage.CurrentVersion = &version
		}
	}
	return updatedPage, nil
}

func (s *StudioService) DeletePageForUser(ctx context.Context, userID string, pageID string) error {
	return s.pages.SoftDeleteOwned(ctx, userID, pageID)
}

func (s *StudioService) GetPage(ctx context.Context, pageID string) (domain.Page, error) {
	return s.GetPageForUser(ctx, defaultUserID, pageID)
}

func (s *StudioService) GetPageForUser(ctx context.Context, userID string, pageID string) (domain.Page, error) {
	page, err := s.pages.FindOwned(ctx, userID, pageID)
	if err != nil {
		return domain.Page{}, apperrors.NotFound("Page not found or you do not have access.")
	}
	if page.CurrentVersionID != "" {
		version, err := s.versions.FindOwned(ctx, userID, page.ID, page.CurrentVersionID)
		if err == nil {
			page.CurrentVersion = &version
		}
	}
	return page, nil
}

func (s *StudioService) ListVersions(ctx context.Context, pageID string) ([]domain.PageVersion, error) {
	return s.ListVersionsForUser(ctx, defaultUserID, pageID)
}

func (s *StudioService) ListVersionsForUser(ctx context.Context, userID string, pageID string) ([]domain.PageVersion, error) {
	_, err := s.pages.FindOwned(ctx, userID, pageID)
	if err != nil {
		return nil, apperrors.NotFound("Page not found or you do not have access.")
	}
	return s.versions.ListOwnedByPage(ctx, userID, pageID)
}

func (s *StudioService) Generate(ctx context.Context, pageID string, requestID string, input GenerateInput) (GenerateResult, error) {
	return s.GenerateForUser(ctx, defaultUserID, pageID, requestID, input)
}

func (s *StudioService) GenerateForUser(ctx context.Context, userID string, pageID string, requestID string, input GenerateInput) (GenerateResult, error) {
	if err := validatePrompt(input.Prompt, true); err != nil {
		return GenerateResult{}, err
	}
	if err := validateIdempotencyKey(requestID); err != nil {
		return GenerateResult{}, err
	}
	if err := s.validateGenerateInput(ctx, input); err != nil {
		return GenerateResult{}, err
	}

	idem, err := s.idempotency.Find(ctx, userID, operationGenerate, requestID)
	if err == nil {
		if idem.ResponseJSON != nil && len(idem.ResponseJSON) > 0 {
			var result GenerateResult
			if err := json.Unmarshal(idem.ResponseJSON, &result); err == nil {
				return result, nil
			}
		}
		job, err := s.jobs.FindOwned(ctx, userID, idem.ResourceID)
		if err != nil {
			return GenerateResult{}, err
		}
		if job.Status == "succeeded" {
			page, err := s.pages.FindOwned(ctx, userID, job.PageID)
			if err == nil {
				if page.CurrentVersionID != "" {
					version, err := s.versions.FindOwned(ctx, userID, page.ID, page.CurrentVersionID)
					if err == nil {
						page.CurrentVersion = &version
						wallet, _ := s.wallets.GetForUpdate(ctx, userID)
						return GenerateResult{Job: job, Page: page, Version: version, Wallet: wallet}, nil
					}
				}
			}
		}
		wallet, _ := s.wallets.GetForUpdate(ctx, userID)
		return GenerateResult{Job: job, Wallet: wallet}, nil
	}

	page, err := s.pages.FindOwned(ctx, userID, pageID)
	if err != nil {
		return GenerateResult{}, apperrors.NotFound("Page not found or you do not have access.")
	}
	project, err := s.projects.FindOwned(ctx, userID, page.ProjectID)
	if err != nil {
		return GenerateResult{}, apperrors.NotFound("Page not found or you do not have access.")
	}

	jobID, err := newID()
	if err != nil {
		return GenerateResult{}, err
	}

	started := time.Now().UTC()
	pageType := fallback(input.PageType, page.PageType)
	domainName := strings.ToLower(fallback(input.Domain, project.Domain))
	theme := fallback(input.ThemeSlug, project.DefaultThemeSlug)
	outputMode := fallback(input.OutputMode, "tsx")

	job := domain.GenerationJob{
		ID:         jobID,
		UserID:     userID,
		ProjectID:  page.ProjectID,
		PageID:     page.ID,
		RequestID:  requestID,
		Status:     "queued",
		Prompt:     strings.TrimSpace(input.Prompt),
		PageType:   pageType,
		Domain:     domainName,
		ThemeSlug:  theme,
		OutputMode: outputMode,
		CreditCost: 1,
		StartedAt:  started,
		CreatedAt:  started,
		UpdatedAt:  started,
	}

	var wallet domain.CreditWallet
	err = s.tx.WithTx(ctx, func(txCtx context.Context) error {
		w, err := s.wallets.GetForUpdate(txCtx, userID)
		if err != nil {
			return err
		}
		if w.Balance < 1 {
			return apperrors.PaymentRequired("insufficient credits")
		}
		w.Balance -= 1
		if err := s.wallets.Upsert(txCtx, w); err != nil {
			return err
		}
		wallet = w

		txID, err := newID()
		if err != nil {
			return err
		}
		_, err = s.transactions.Create(txCtx, domain.CreditTransaction{
			ID:             txID,
			UserID:         userID,
			Type:           "reserve",
			Amount:         -1,
			BalanceAfter:   w.Balance,
			ReferenceType:  "generation_job",
			ReferenceID:    job.ID,
			IdempotencyKey: requestID,
			Description:    "Reserve credit for page generation",
		})
		if err != nil {
			return err
		}

		job, err = s.jobs.Create(txCtx, job)
		if err != nil {
			return err
		}

		idemID, err := newID()
		if err != nil {
			return err
		}
		_, err = s.idempotency.Create(txCtx, repositories.IdempotencyKey{
			ID:           idemID,
			UserID:       userID,
			Operation:    operationGenerate,
			RequestKey:   requestID,
			ResourceType: "generation_job",
			ResourceID:   job.ID,
			CreatedAt:    started,
			ExpiresAt:    started.Add(24 * time.Hour),
		})
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return GenerateResult{}, err
	}

	if s.queueProducer != nil {
		_ = s.queueProducer.EnqueueGeneration(ctx, queue.GenerationTask{
			JobID:     job.ID,
			UserID:    userID,
			Operation: operationGenerate,
			QueuedAt:  time.Now().UTC(),
		})
	}

	return GenerateResult{Job: job, Wallet: wallet}, nil
}

func (s *StudioService) Refine(ctx context.Context, pageID string, requestID string, input RefineInput) (GenerateResult, error) {
	return s.RefineForUser(ctx, defaultUserID, pageID, requestID, input)
}

func (s *StudioService) RefineForUser(ctx context.Context, userID string, pageID string, requestID string, input RefineInput) (GenerateResult, error) {
	if err := validatePrompt(input.Prompt, true); err != nil {
		return GenerateResult{}, err
	}
	if err := validateIdempotencyKey(requestID); err != nil {
		return GenerateResult{}, err
	}

	idem, err := s.idempotency.Find(ctx, userID, operationRefine, requestID)
	if err == nil {
		if idem.ResponseJSON != nil && len(idem.ResponseJSON) > 0 {
			var result GenerateResult
			if err := json.Unmarshal(idem.ResponseJSON, &result); err == nil {
				return result, nil
			}
		}
		job, err := s.jobs.FindOwned(ctx, userID, idem.ResourceID)
		if err != nil {
			return GenerateResult{}, err
		}
		if job.Status == "succeeded" {
			page, err := s.pages.FindOwned(ctx, userID, job.PageID)
			if err == nil {
				if page.CurrentVersionID != "" {
					version, err := s.versions.FindOwned(ctx, userID, page.ID, page.CurrentVersionID)
					if err == nil {
						page.CurrentVersion = &version
						wallet, _ := s.wallets.GetForUpdate(ctx, userID)
						return GenerateResult{Job: job, Page: page, Version: version, Wallet: wallet}, nil
					}
				}
			}
		}
		wallet, _ := s.wallets.GetForUpdate(ctx, userID)
		return GenerateResult{Job: job, Wallet: wallet}, nil
	}

	page, err := s.pages.FindOwned(ctx, userID, pageID)
	if err != nil {
		return GenerateResult{}, apperrors.NotFound("Page not found or you do not have access.")
	}
	project, err := s.projects.FindOwned(ctx, userID, page.ProjectID)
	if err != nil {
		return GenerateResult{}, apperrors.NotFound("Page not found or you do not have access.")
	}
	if page.CurrentVersionID == "" {
		return GenerateResult{}, apperrors.Conflict("page has no active version to refine")
	}

	jobID, err := newID()
	if err != nil {
		return GenerateResult{}, err
	}

	started := time.Now().UTC()
	job := domain.GenerationJob{
		ID:         jobID,
		UserID:     userID,
		ProjectID:  page.ProjectID,
		PageID:     page.ID,
		RequestID:  requestID,
		Status:     "queued",
		Prompt:     strings.TrimSpace(input.Prompt),
		PageType:   page.PageType,
		Domain:     project.Domain,
		ThemeSlug:  project.DefaultThemeSlug,
		OutputMode: "tsx",
		CreditCost: 1,
		StartedAt:  started,
		CreatedAt:  started,
		UpdatedAt:  started,
	}

	var wallet domain.CreditWallet
	err = s.tx.WithTx(ctx, func(txCtx context.Context) error {
		w, err := s.wallets.GetForUpdate(txCtx, userID)
		if err != nil {
			return err
		}
		if w.Balance < 1 {
			return apperrors.PaymentRequired("insufficient credits")
		}
		w.Balance -= 1
		if err := s.wallets.Upsert(txCtx, w); err != nil {
			return err
		}
		wallet = w

		txID, err := newID()
		if err != nil {
			return err
		}
		_, err = s.transactions.Create(txCtx, domain.CreditTransaction{
			ID:             txID,
			UserID:         userID,
			Type:           "reserve",
			Amount:         -1,
			BalanceAfter:   w.Balance,
			ReferenceType:  "generation_job",
			ReferenceID:    job.ID,
			IdempotencyKey: requestID,
			Description:    "Reserve credit for page refinement",
		})
		if err != nil {
			return err
		}

		job, err = s.jobs.Create(txCtx, job)
		if err != nil {
			return err
		}

		idemID, err := newID()
		if err != nil {
			return err
		}
		_, err = s.idempotency.Create(txCtx, repositories.IdempotencyKey{
			ID:           idemID,
			UserID:       userID,
			Operation:    operationRefine,
			RequestKey:   requestID,
			ResourceType: "generation_job",
			ResourceID:   job.ID,
			CreatedAt:    started,
			ExpiresAt:    started.Add(24 * time.Hour),
		})
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return GenerateResult{}, err
	}

	if s.queueProducer != nil {
		_ = s.queueProducer.EnqueueGeneration(ctx, queue.GenerationTask{
			JobID:        job.ID,
			UserID:       userID,
			Operation:    operationRefine,
			SectionIndex: input.SectionIndex,
			QueuedAt:     time.Now().UTC(),
		})
	}

	return GenerateResult{Job: job, Wallet: wallet}, nil
}

// HasAsyncWorker reports whether an external (Redis-backed) worker is draining
// the generation queue. When false, generation must be processed inline.
func (s *StudioService) HasAsyncWorker() bool {
	return s.redisClient != nil
}

// processInline runs the generation worker logic in-process. It is used when no
// Redis-backed worker is available (e.g. local single-binary deployments), so
// jobs do not get stuck in the "queued" state forever.
func (s *StudioService) processInline(ctx context.Context, jobID string, userID string, operation string, sectionIndex int) {
	worker := NewGenerationWorker(logger.New(), nil, s, s.aiProvider)
	_ = worker.ProcessJob(ctx, jobID, userID, operation, sectionIndex)
}

func (s *StudioService) reloadResult(ctx context.Context, userID string, jobID string, pageID string) (GenerateResult, error) {
	job, err := s.jobs.FindOwned(ctx, userID, jobID)
	if err != nil {
		return GenerateResult{}, err
	}
	page, err := s.pages.FindOwned(ctx, userID, pageID)
	if err != nil {
		return GenerateResult{}, err
	}
	var version domain.PageVersion
	if page.CurrentVersionID != "" {
		if v, err := s.versions.FindOwned(ctx, userID, page.ID, page.CurrentVersionID); err == nil {
			version = v
			page.CurrentVersion = &v
		}
	}
	wallet, _ := s.wallets.GetForUpdate(ctx, userID)
	return GenerateResult{Job: job, Page: page, Version: version, Wallet: wallet}, nil
}

// ReprocessWithMock re-runs a failed job through the deterministic mock
// provider so a page is never left empty when the live AI provider fails
// validation. The credit was already refunded when the job first failed.
func (s *StudioService) ReprocessWithMock(ctx context.Context, userID, jobID string) {
	if err := s.jobs.UpdateStatus(ctx, jobID, "queued", ""); err != nil {
		return
	}
	worker := NewGenerationWorker(logger.New(), nil, s, ai.NewMockProvider())
	_ = worker.ProcessJob(ctx, jobID, userID, operationGenerate, 0)
}

// SavePageVersion renders + persists an already-generated page schema as a new
// version (no per-page LLM call). Used by the single-round-trip app generator,
// which produces all page schemas in one provider call. Charges 1 credit.
func (s *StudioService) SavePageVersion(ctx context.Context, userID, pageID, prompt string, pageSchema schema.PageSchema, themeSlug string) (domain.PageVersion, error) {
	if err := schema.Validate(pageSchema); err != nil {
		return domain.PageVersion{}, apperrors.Validation("invalid schema: " + err.Error())
	}
	library := s.themeLibrary(ctx, themeSlug)
	code := renderer.Generate(pageSchema, "tsx", library)
	score := scoreSchema(pageSchema)
	schemaMap, err := toMap(pageSchema)
	if err != nil {
		return domain.PageVersion{}, err
	}

	var version domain.PageVersion
	err = s.tx.WithTx(ctx, func(txCtx context.Context) error {
		w, err := s.wallets.GetForUpdate(txCtx, userID)
		if err != nil {
			return err
		}
		if w.Balance < 1 {
			return apperrors.PaymentRequired("insufficient credits")
		}
		w.Balance -= 1
		if err := s.wallets.Upsert(txCtx, w); err != nil {
			return err
		}
		txID, err := newID()
		if err != nil {
			return err
		}
		if _, err := s.transactions.Create(txCtx, domain.CreditTransaction{
			ID:            txID,
			UserID:        userID,
			Type:          "usage",
			Amount:        -1,
			BalanceAfter:  w.Balance,
			ReferenceType: "app_generation",
			ReferenceID:   pageID,
			Description:   "Page generation",
		}); err != nil {
			return err
		}
		vNum, err := s.versions.NextVersionNumber(txCtx, pageID)
		if err != nil {
			return err
		}
		vID, err := newID()
		if err != nil {
			return err
		}
		version = domain.PageVersion{
			ID:            vID,
			PageID:        pageID,
			VersionNumber: vNum,
			Prompt:        prompt,
			SchemaJSON:    schemaMap,
			GeneratedCode: code,
			QualityScore:  score,
			CreatedBy:     userID,
			CreatedAt:     time.Now().UTC(),
		}
		if _, err := s.versions.Create(txCtx, version); err != nil {
			return err
		}
		return s.pages.SetCurrentVersion(txCtx, userID, pageID, vID)
	})
	if err != nil {
		return domain.PageVersion{}, err
	}
	return version, nil
}

// GenerateSyncForUser reserves credit, creates a job, and—when no async worker
// is running—processes the job inline before returning the completed result.
func (s *StudioService) GenerateSyncForUser(ctx context.Context, userID string, pageID string, requestID string, input GenerateInput) (GenerateResult, error) {
	res, err := s.GenerateForUser(ctx, userID, pageID, requestID, input)
	if err != nil {
		return GenerateResult{}, err
	}
	if res.Version.ID != "" {
		return res, nil // already processed (idempotent replay)
	}
	// The frontend expects a completed version in the response, so process the
	// job inline. ProcessJob is idempotent (terminal-status guard), so this is
	// safe even if an external worker also drains the queue.
	s.processInline(ctx, res.Job.ID, userID, operationGenerate, 0)
	return s.reloadResult(ctx, userID, res.Job.ID, pageID)
}

// RefineSyncForUser is the synchronous counterpart of RefineForUser.
func (s *StudioService) RefineSyncForUser(ctx context.Context, userID string, pageID string, requestID string, input RefineInput) (GenerateResult, error) {
	res, err := s.RefineForUser(ctx, userID, pageID, requestID, input)
	if err != nil {
		return GenerateResult{}, err
	}
	if res.Version.ID != "" {
		return res, nil
	}
	s.processInline(ctx, res.Job.ID, userID, operationRefine, input.SectionIndex)
	return s.reloadResult(ctx, userID, res.Job.ID, pageID)
}

func (s *StudioService) RestoreVersion(ctx context.Context, pageID string, versionID string) (domain.Page, domain.PageVersion, error) {
	return s.RestoreVersionForUser(ctx, defaultUserID, pageID, versionID)
}

func (s *StudioService) RestoreVersionForUser(ctx context.Context, userID string, pageID string, versionID string) (domain.Page, domain.PageVersion, error) {
	page, err := s.pages.FindOwned(ctx, userID, pageID)
	if err != nil {
		return domain.Page{}, domain.PageVersion{}, apperrors.NotFound("Page not found or you do not have access.")
	}
	version, err := s.versions.FindOwned(ctx, userID, pageID, versionID)
	if err != nil {
		return domain.Page{}, domain.PageVersion{}, apperrors.NotFound("Version not found or you do not have access.")
	}

	err = s.tx.WithTx(ctx, func(txCtx context.Context) error {
		return s.pages.SetCurrentVersion(txCtx, userID, pageID, versionID)
	})
	if err != nil {
		return domain.Page{}, domain.PageVersion{}, err
	}

	page.CurrentVersionID = versionID
	page.CurrentVersion = &version
	return page, version, nil
}

func (s *StudioService) Wallet(ctx context.Context) (domain.CreditWallet, error) {
	return s.WalletForUser(ctx, defaultUserID)
}

func (s *StudioService) WalletForUser(ctx context.Context, userID string) (domain.CreditWallet, error) {
	return s.wallets.GetForUpdate(ctx, userID)
}

func (s *StudioService) CreditTransactionsForUser(ctx context.Context, userID string) ([]domain.CreditTransaction, error) {
	return s.transactions.ListByUser(ctx, userID)
}

func (s *StudioService) Themes(ctx context.Context) ([]domain.Theme, error) {
	return s.ThemesWithLibrary(ctx)
}

// ThemesWithLibrary returns themes including their UI library + description.
// Falls back to the sqlc list (library defaulted to shadcn) when there is no DB.
func (s *StudioService) ThemesWithLibrary(ctx context.Context) ([]domain.Theme, error) {
	if s.pool == nil {
		themes, err := s.themesRepo.List(ctx)
		if err != nil {
			return nil, err
		}
		for i := range themes {
			if themes[i].Library == "" {
				themes[i].Library = "shadcn"
			}
		}
		return themes, nil
	}
	rows, err := s.pool.Query(ctx, `
		SELECT slug, name, accent, COALESCE(library,'shadcn'), COALESCE(description,'')
		FROM themes ORDER BY (library <> 'shadcn'), slug`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	themes := []domain.Theme{}
	for rows.Next() {
		var t domain.Theme
		if err := rows.Scan(&t.Slug, &t.Name, &t.Accent, &t.Library, &t.Description); err != nil {
			return nil, err
		}
		themes = append(themes, t)
	}
	return themes, rows.Err()
}

// themeLibrary resolves the UI kit a theme slug targets (default "shadcn").
func (s *StudioService) themeLibrary(ctx context.Context, slug string) string {
	if s.pool == nil || strings.TrimSpace(slug) == "" {
		return "shadcn"
	}
	var library string
	if err := s.pool.QueryRow(ctx, "SELECT COALESCE(library,'shadcn') FROM themes WHERE slug=$1", slug).Scan(&library); err != nil || library == "" {
		return "shadcn"
	}
	return library
}

func (s *StudioService) Templates(ctx context.Context) ([]domain.Template, error) {
	return s.templatesRepo.List(ctx)
}

func (s *StudioService) AdminUsers(ctx context.Context) ([]domain.User, error) {
	return s.users.List(ctx)
}

func (s *StudioService) AdminGenerationJobs(ctx context.Context) ([]domain.GenerationJob, error) {
	return s.jobs.ListForAdmin(ctx)
}

func (s *StudioService) GetGenerationJobForUser(ctx context.Context, userID string, jobID string) (domain.GenerationJob, error) {
	return s.jobs.FindOwned(ctx, userID, jobID)
}

func (s *StudioService) AdminAuditLogs(ctx context.Context) ([]repositories.AuditLog, error) {
	return s.auditLogs.ListForAdmin(ctx)
}

func (s *StudioService) AdminMetricsSummary(ctx context.Context) (map[string]interface{}, error) {
	users, err := s.users.List(ctx)
	if err != nil {
		return nil, err
	}
	jobs, err := s.jobs.ListForAdmin(ctx)
	if err != nil {
		return nil, err
	}
	statusCounts := map[string]int{}
	for _, job := range jobs {
		statusCounts[job.Status]++
	}
	summary := map[string]interface{}{
		"users":                 len(users),
		"projects":              0,
		"pages":                 0,
		"generationJobs":        len(jobs),
		"generationJobStatuses": statusCounts,
		"telemetry":             metrics.GetSummary(),
	}
	return summary, nil
}

// scoreSchema rates a page on real richness — section density, TYPE variety,
// whether charts carry actual data, table depth, and KPI/sparkline completeness —
// not just the raw section count (which rewarded padding with empty panels).
func scoreSchema(page schema.PageSchema) float64 {
	score := 60.0
	types := map[string]bool{}
	for _, s := range page.Sections {
		types[s.Type] = true
		score += 3.0 // density
		switch s.Type {
		case "chartPanel":
			if len(s.Series) > 0 || len(s.Data) > 0 {
				score += 5 // a chart driven by real data
			} else {
				score += 1
			}
		case "dataTable":
			if len(s.Rows) >= 5 {
				score += 4
			} else {
				score += 1.5
			}
		case "statsGrid":
			n := len(s.Items)
			if n > 4 {
				n = 4
			}
			score += float64(n)
			for _, it := range s.Items {
				if len(it.Spark) > 0 {
					score += 0.5
				}
			}
		case "hero", "gallery", "featureGrid", "mapPanel", "kanbanBoard", "progressList":
			score += 2 // richer, image/visual-forward sections
		}
	}
	score += float64(len(types)) * 1.6 // reward variety
	if score > 99 {
		return 99
	}
	if score < 60 {
		return 60
	}
	return score
}

func toMap(page schema.PageSchema) (map[string]interface{}, error) {
	raw, err := json.Marshal(page)
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, err
	}
	return result, nil
}

func fromMap(value map[string]interface{}) (schema.PageSchema, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return schema.PageSchema{}, err
	}
	var result schema.PageSchema
	if err := json.Unmarshal(raw, &result); err != nil {
		return schema.PageSchema{}, err
	}
	return result, nil
}

var blockedKeywords = []string{
	"<script", "javascript:", "onerror", "onload", "onclick", "dangerouslysetinnerhtml",
	"/etc/passwd", "cmd.exe", "/bin/sh", "/bin/bash",
}

func containsDangerousKeywords(prompt string) bool {
	lower := strings.ToLower(prompt)
	for _, kw := range blockedKeywords {
		if strings.Contains(lower, kw) {
			return true
		}
	}
	return false
}

func validatePrompt(prompt string, requireMinimum bool) error {
	trimmed := strings.TrimSpace(prompt)
	if requireMinimum && len(trimmed) < 8 {
		return apperrors.Validation("prompt must be at least 8 characters")
	}
	if len(trimmed) > maxPromptLength {
		return apperrors.Validation(fmt.Sprintf("prompt must be at most %d characters", maxPromptLength))
	}
	if containsDangerousKeywords(trimmed) {
		return apperrors.Validation("prompt contains blocked or potentially unsafe keywords")
	}
	return nil
}

func validateIdempotencyKey(requestID string) error {
	trimmed := strings.TrimSpace(requestID)
	if trimmed == "" {
		return apperrors.Validation("Idempotency-Key header is required")
	}
	if len(trimmed) > 120 {
		return apperrors.Validation("Idempotency-Key header must be at most 120 characters")
	}
	for _, char := range trimmed {
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9') || char == '-' || char == '_' || char == ':' || char == '.' {
			continue
		}
		return apperrors.Validation("Idempotency-Key header contains unsupported characters")
	}
	return nil
}

func scopedIdempotencyKey(userID, operation, requestID string) string {
	return userID + ":" + operation + ":" + strings.TrimSpace(requestID)
}

func (s *StudioService) validateGenerateInput(ctx context.Context, input GenerateInput) error {
	if pageType := strings.TrimSpace(input.PageType); pageType != "" && !allowedInputPageTypes[pageType] {
		return apperrors.Validation("pageType is not supported")
	}
	if domainName := strings.TrimSpace(input.Domain); domainName != "" && !allowedDomains[strings.ToLower(domainName)] {
		return apperrors.Validation("domain is not supported")
	}
	if outputMode := strings.TrimSpace(input.OutputMode); !allowedOutputModes[outputMode] {
		return apperrors.Validation("outputMode is not supported")
	}
	if themeSlug := strings.TrimSpace(input.ThemeSlug); themeSlug != "" && !s.themeExists(ctx, themeSlug) {
		return apperrors.Validation("themeSlug is not supported")
	}
	return nil
}

func (s *StudioService) themeExists(ctx context.Context, slug string) bool {
	themes, err := s.themesRepo.List(ctx)
	if err != nil {
		return false
	}
	for _, theme := range themes {
		if theme.Slug == slug {
			return true
		}
	}
	return false
}

func fallback(value, fallbackValue string) string {
	if strings.TrimSpace(value) == "" {
		return fallbackValue
	}
	return strings.TrimSpace(value)
}

func title(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "Custom"
	}
	return strings.ToUpper(value[:1]) + value[1:]
}

func summarize(value string) string {
	value = strings.TrimSpace(value)
	if len(value) <= 28 {
		return value
	}
	return value[:28] + "..."
}

func slugify(value string) string {
	lower := strings.ToLower(strings.TrimSpace(value))
	re := regexp.MustCompile(`[^a-z0-9]+`)
	slug := strings.Trim(re.ReplaceAllString(lower, "-"), "-")
	if slug == "" {
		return fmt.Sprintf("page-%d", time.Now().Unix())
	}
	return slug
}

func newID() (string, error) {
	var bytes [16]byte
	if _, err := io.ReadFull(rand.Reader, bytes[:]); err != nil {
		return "", fmt.Errorf("cryptographic randomness source failed: %w", err)
	}
	return hex.EncodeToString(bytes[:]), nil
}

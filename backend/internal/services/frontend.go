package services

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/ai"
	"github.com/kreasinusantara/ui-generator-backend/internal/designsystem"
	"github.com/kreasinusantara/ui-generator-backend/internal/domain"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
	"github.com/kreasinusantara/ui-generator-backend/internal/renderer"
	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

// FrontendService adapts the StudioService (page-centric, PRD component-registry
// engine) to the project/version-centric contract the Next.js frontend consumes,
// and adds the credits, settings, API-key, and analytics verticals. Responses are
// shaped as the camelCase DTOs the frontend TypeScript types expect.
type FrontendService struct {
	s       *StudioService
	batches *batchTracker
}

func NewFrontendService(s *StudioService) *FrontendService {
	return &FrontendService{s: s, batches: newBatchTracker()}
}

const defaultMonthlyCreditLimit = 500

// ---------------------------------------------------------------------------
// DTOs (camelCase, matching frontend/src/types/*)
// ---------------------------------------------------------------------------

type ProjectDTO struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Description      string  `json:"description"`
	Domain           string  `json:"domain"`
	Status           string  `json:"status"`
	DefaultThemeSlug string  `json:"defaultThemeSlug"`
	PagesCount       int     `json:"pagesCount"`
	QualityAverage   float64 `json:"qualityAverage"`
	UpdatedAt        string  `json:"updatedAt"`
	CreatedAt        string  `json:"createdAt"`
}

type CreateProjectFEInput struct {
	Name             string `json:"name"`
	Description      string `json:"description"`
	Domain           string `json:"domain"`
	Status           string `json:"status"`
	DefaultThemeSlug string `json:"defaultThemeSlug"`
}

type UpdateProjectFEInput struct {
	Name             *string `json:"name"`
	Description      *string `json:"description"`
	Domain           *string `json:"domain"`
	Status           *string `json:"status"`
	DefaultThemeSlug *string `json:"defaultThemeSlug"`
}

type FileDTO struct {
	Path     string `json:"path"`
	Language string `json:"language"`
	Content  string `json:"content"`
	Size     int    `json:"size"`
}

type VersionDTO struct {
	ID            string                 `json:"id"`
	VersionNumber int                    `json:"versionNumber"`
	Prompt        string                 `json:"prompt"`
	QualityScore  float64                `json:"qualityScore"`
	CreatedAt     string                 `json:"createdAt"`
	Files         []FileDTO              `json:"files"`
	Schema        map[string]interface{} `json:"schema"`
}

type JobDTO struct {
	ID           string  `json:"id"`
	ProjectID    string  `json:"projectId"`
	Prompt       string  `json:"prompt"`
	Status       string  `json:"status"`
	Progress     int     `json:"progress"`
	CreditCost   int     `json:"creditCost"`
	QualityScore float64 `json:"qualityScore"`
	ErrorMessage string  `json:"errorMessage,omitempty"`
	CreatedAt    string  `json:"createdAt"`
	CompletedAt  string  `json:"completedAt,omitempty"`
}

type BalanceDTO struct {
	Available     int `json:"available"`
	MonthlyLimit  int `json:"monthlyLimit"`
	UsedThisMonth int `json:"usedThisMonth"`
}

type TransactionDTO struct {
	ID           string `json:"id"`
	Type         string `json:"type"`
	Amount       int    `json:"amount"`
	BalanceAfter int    `json:"balanceAfter"`
	Description  string `json:"description"`
	CreatedAt    string `json:"createdAt"`
	Status       string `json:"status"`
}

type ProfileDTO struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	Bio       string `json:"bio"`
	AvatarURL string `json:"avatarUrl"`
}

type GenerationPreferencesDTO struct {
	DefaultTheme   string `json:"defaultTheme"`
	DefaultDevice  string `json:"defaultDevice"`
	PromptBoosting bool   `json:"promptBoosting"`
	AutoSave       bool   `json:"autoSave"`
	SafeMode       bool   `json:"safeMode"`
	PreviewGuides  bool   `json:"previewGuides"`
	CompactMode    bool   `json:"compactMode"`
}

type WorkspaceMemberDTO struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	Status string `json:"status"`
}

type WorkspaceDTO struct {
	Name          string               `json:"name"`
	Slug          string               `json:"slug"`
	ProjectNaming string               `json:"projectNaming"`
	Members       []WorkspaceMemberDTO `json:"members"`
}

type SecurityPreferencesDTO struct {
	TwoFactorEnabled bool `json:"twoFactorEnabled"`
	LoginAlerts      bool `json:"loginAlerts"`
}

type SettingsDTO struct {
	Profile               ProfileDTO               `json:"profile"`
	GenerationPreferences GenerationPreferencesDTO `json:"generationPreferences"`
	Workspace             WorkspaceDTO             `json:"workspace"`
	SecurityPreferences   SecurityPreferencesDTO   `json:"securityPreferences"`
}

type APIKeyDTO struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Prefix     string `json:"prefix"`
	Scope      string `json:"scope"`
	CreatedAt  string `json:"createdAt"`
	LastUsedAt string `json:"lastUsedAt"`
}

type AdminJobDTO struct {
	ID           string `json:"id"`
	User         string `json:"user"`
	Project      string `json:"project"`
	Page         string `json:"page"`
	Status       string `json:"status"`
	RetryCount   int    `json:"retryCount"`
	Duration     string `json:"duration"`
	CreatedAt    string `json:"createdAt"`
	ErrorMessage string `json:"errorMessage,omitempty"`
}

type LabelValue struct {
	Label string `json:"label"`
	Value int    `json:"value"`
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

func (f *FrontendService) ListProjects(ctx context.Context, userID string) ([]ProjectDTO, error) {
	projects, err := f.s.projects.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]ProjectDTO, 0, len(projects))
	for _, p := range projects {
		out = append(out, f.projectDTO(ctx, userID, p))
	}
	return out, nil
}

func (f *FrontendService) GetProject(ctx context.Context, userID, projectID string) (ProjectDTO, error) {
	p, err := f.s.projects.FindOwned(ctx, userID, projectID)
	if err != nil {
		return ProjectDTO{}, apperrors.NotFound("Project not found or you do not have access.")
	}
	return f.projectDTO(ctx, userID, p), nil
}

func (f *FrontendService) CreateProject(ctx context.Context, userID string, in CreateProjectFEInput) (ProjectDTO, error) {
	proj, err := f.s.CreateProjectForUser(ctx, userID, CreateProjectInput{
		Name:             in.Name,
		Description:      in.Description,
		Domain:           f.normalizeDomain(in.Domain),
		DefaultThemeSlug: f.normalizeTheme(ctx, in.DefaultThemeSlug),
	})
	if err != nil {
		return ProjectDTO{}, err
	}

	status := normalizeStatus(in.Status)
	if f.s.pool != nil {
		if _, err := f.s.pool.Exec(ctx, "UPDATE projects SET status=$1 WHERE id=$2", status, proj.ID); err != nil {
			return ProjectDTO{}, err
		}
	}
	proj.Status = status

	// Create a primary page so versions/generation work at the project level.
	_, _ = f.s.CreatePageForUser(ctx, userID, proj.ID, CreatePageInput{Name: "Overview", PageType: "dashboard"})

	return f.projectDTO(ctx, userID, proj), nil
}

func (f *FrontendService) UpdateProject(ctx context.Context, userID, projectID string, in UpdateProjectFEInput) (ProjectDTO, error) {
	existing, err := f.s.projects.FindOwned(ctx, userID, projectID)
	if err != nil {
		return ProjectDTO{}, apperrors.NotFound("Project not found or you do not have access.")
	}

	update := UpdateProjectInput{
		Name:             existing.Name,
		Description:      existing.Description,
		Domain:           existing.Domain,
		DefaultThemeSlug: existing.DefaultThemeSlug,
	}
	if in.Name != nil {
		update.Name = *in.Name
	}
	if in.Description != nil {
		update.Description = *in.Description
	}
	if in.Domain != nil {
		update.Domain = f.normalizeDomain(*in.Domain)
	}
	if in.DefaultThemeSlug != nil {
		update.DefaultThemeSlug = f.normalizeTheme(ctx, *in.DefaultThemeSlug)
	}

	proj, err := f.s.UpdateProjectForUser(ctx, userID, projectID, update)
	if err != nil {
		return ProjectDTO{}, err
	}

	if in.Status != nil && f.s.pool != nil {
		if _, err := f.s.pool.Exec(ctx, "UPDATE projects SET status=$1 WHERE id=$2", normalizeStatus(*in.Status), proj.ID); err != nil {
			return ProjectDTO{}, err
		}
	}
	return f.projectDTO(ctx, userID, proj), nil
}

func (f *FrontendService) DeleteProject(ctx context.Context, userID, projectID string) error {
	return f.s.DeleteProjectForUser(ctx, userID, projectID)
}

func (f *FrontendService) projectDTO(ctx context.Context, userID string, p domain.Project) ProjectDTO {
	pages, _ := f.s.pages.ListByOwnedProject(ctx, userID, p.ID)
	var sum, n float64
	for _, pg := range pages {
		if pg.CurrentVersionID != "" {
			if v, err := f.s.versions.FindOwned(ctx, userID, pg.ID, pg.CurrentVersionID); err == nil {
				sum += v.QualityScore
				n++
			}
		}
	}
	quality := 0.0
	if n > 0 {
		quality = sum / n
	}

	status := normalizeStatus(p.Status)
	if f.s.pool != nil {
		var st string
		if err := f.s.pool.QueryRow(ctx, "SELECT status FROM projects WHERE id=$1", p.ID).Scan(&st); err == nil && st != "" {
			status = st
		}
	}

	return ProjectDTO{
		ID:               p.ID,
		Name:             p.Name,
		Description:      p.Description,
		Domain:           p.Domain,
		Status:           status,
		DefaultThemeSlug: p.DefaultThemeSlug,
		PagesCount:       len(pages),
		QualityAverage:   round1(quality),
		UpdatedAt:        isoTime(p.UpdatedAt),
		CreatedAt:        isoTime(p.CreatedAt),
	}
}

// ---------------------------------------------------------------------------
// Versions & generation
// ---------------------------------------------------------------------------

func (f *FrontendService) ListVersions(ctx context.Context, userID, projectID string) ([]VersionDTO, error) {
	page, err := f.primaryPage(ctx, userID, projectID, false)
	if err != nil {
		if apperr, ok := apperrors.From(err); ok && apperr.Status == 404 {
			return []VersionDTO{}, nil
		}
		return nil, err
	}
	versions, err := f.s.versions.ListOwnedByPage(ctx, userID, page.ID)
	if err != nil {
		return nil, err
	}
	out := make([]VersionDTO, 0, len(versions))
	for _, v := range versions {
		out = append(out, versionDTO(v))
	}
	return out, nil
}

func (f *FrontendService) ActiveVersion(ctx context.Context, userID, projectID string) (*VersionDTO, error) {
	page, err := f.primaryPage(ctx, userID, projectID, false)
	if err != nil {
		if apperr, ok := apperrors.From(err); ok && apperr.Status == 404 {
			return nil, nil
		}
		return nil, err
	}
	if page.CurrentVersionID != "" {
		if v, err := f.s.versions.FindOwned(ctx, userID, page.ID, page.CurrentVersionID); err == nil {
			dto := versionDTO(v)
			return &dto, nil
		}
	}
	versions, err := f.s.versions.ListOwnedByPage(ctx, userID, page.ID)
	if err != nil {
		return nil, err
	}
	if len(versions) == 0 {
		return nil, nil
	}
	dto := versionDTO(versions[0])
	return &dto, nil
}

func (f *FrontendService) GetVersion(ctx context.Context, userID, projectID, versionID string) (VersionDTO, error) {
	page, err := f.primaryPage(ctx, userID, projectID, false)
	if err != nil {
		return VersionDTO{}, err
	}
	version, err := f.s.versions.FindOwned(ctx, userID, page.ID, versionID)
	if err != nil {
		return VersionDTO{}, apperrors.NotFound("Version not found or you do not have access.")
	}
	return versionDTO(version), nil
}

func (f *FrontendService) RestoreVersion(ctx context.Context, userID, projectID, versionID string) (VersionDTO, error) {
	page, err := f.primaryPage(ctx, userID, projectID, false)
	if err != nil {
		return VersionDTO{}, err
	}
	_, version, err := f.s.RestoreVersionForUser(ctx, userID, page.ID, versionID)
	if err != nil {
		return VersionDTO{}, err
	}
	return versionDTO(version), nil
}

func (f *FrontendService) VersionFiles(ctx context.Context, userID, projectID, versionID string) ([]FileDTO, error) {
	page, err := f.primaryPage(ctx, userID, projectID, false)
	if err != nil {
		return nil, err
	}
	version, err := f.s.versions.FindOwned(ctx, userID, page.ID, versionID)
	if err != nil {
		return nil, apperrors.NotFound("Version not found or you do not have access.")
	}
	return versionFiles(version), nil
}

type GenerateFEInput struct {
	Prompt    string `json:"prompt"`
	ThemeSlug string `json:"themeSlug"`
}

func (f *FrontendService) Generate(ctx context.Context, userID, projectID, idemKey string, in GenerateFEInput) (JobDTO, error) {
	page, err := f.primaryPage(ctx, userID, projectID, true)
	if err != nil {
		return JobDTO{}, err
	}
	project, err := f.s.projects.FindOwned(ctx, userID, projectID)
	if err != nil {
		return JobDTO{}, apperrors.NotFound("Project not found or you do not have access.")
	}
	res, err := f.s.GenerateSyncForUser(ctx, userID, page.ID, idemKey, GenerateInput{
		Prompt:     in.Prompt,
		PageType:   page.PageType,
		Domain:     project.Domain,
		ThemeSlug:  f.normalizeTheme(ctx, in.ThemeSlug),
		OutputMode: "tsx",
	})
	if err != nil {
		return JobDTO{}, err
	}
	return jobDTO(res.Job, res.Version), nil
}

// GeneratedPageDTO is one screen produced by a multi-page generation.
type GeneratedPageDTO struct {
	ID           string                 `json:"id"`
	Name         string                 `json:"name"`
	Slug         string                 `json:"slug"`
	PageType     string                 `json:"pageType"`
	QualityScore float64                `json:"qualityScore"`
	Schema       map[string]interface{} `json:"schema"`
	Files        []FileDTO              `json:"files"`
}

type GenerateAppInput struct {
	Prompt    string `json:"prompt"`
	ThemeSlug string `json:"themeSlug"`
	// Auto = let the AI decide how many pages and which page types fit the brief
	// (Stitch-like). When Auto is true, PageCount is ignored.
	Auto      bool `json:"auto"`
	PageCount int  `json:"pageCount"`
}

type pagePlan struct {
	Name     string
	PageType string
}

// planPages returns a sensible multi-screen plan for an app of the given size.
func planPages(count int) []pagePlan {
	all := []pagePlan{
		{Name: "Overview", PageType: "dashboard"},
		{Name: "Records", PageType: "list"},
		{Name: "Detail", PageType: "detail"},
		{Name: "Create Form", PageType: "form"},
	}
	if count < 1 {
		count = 1
	}
	if count > len(all) {
		count = len(all)
	}
	return all[:count]
}

// allowedPageTypes are the page types the Auto planner may choose from.
var allowedPageTypes = map[string]bool{
	"dashboard": true, "list": true, "detail": true,
	"form": true, "analytics": true, "login": true,
}

func defaultPageName(pageType string) string {
	switch pageType {
	case "list":
		return "Records"
	case "detail":
		return "Detail"
	case "form":
		return "Create Form"
	case "analytics":
		return "Analytics"
	case "login":
		return "Sign In"
	default:
		return "Overview"
	}
}

// sanitizeAutoPlan validates an AI-proposed plan: keeps only allowed, DISTINCT
// page types (the page-by-type reuse in StartGenerationBatch requires uniqueness),
// fills missing names, and caps the count. Falls back to a 3-page default when empty.
func sanitizeAutoPlan(in []ai.AppPagePlan) []pagePlan {
	seen := map[string]bool{}
	out := make([]pagePlan, 0, len(in))
	for _, p := range in {
		pt := strings.ToLower(strings.TrimSpace(p.PageType))
		if !allowedPageTypes[pt] || seen[pt] {
			continue
		}
		seen[pt] = true
		name := strings.TrimSpace(p.Name)
		if name == "" || len(name) > 100 {
			name = defaultPageName(pt)
		}
		out = append(out, pagePlan{Name: name, PageType: pt})
		if len(out) >= 5 {
			break
		}
	}
	if len(out) == 0 {
		return planPages(3)
	}
	return out
}

// orderedDefaults is the fallback page set in priority order (distinct types),
// used to pad a plan up to the requested count.
var orderedDefaults = []pagePlan{
	{Name: "Overview", PageType: "dashboard"},
	{Name: "Records", PageType: "list"},
	{Name: "Detail", PageType: "detail"},
	{Name: "Create Form", PageType: "form"},
	{Name: "Analytics", PageType: "analytics"},
	{Name: "Sign In", PageType: "login"},
}

// padPlan tops up `base` to `count` DISTINCT-typed pages using orderedDefaults
// (page reuse downstream keys on type, so types must be unique).
func padPlan(base []pagePlan, count int) []pagePlan {
	if count < 1 {
		count = 1
	}
	seen := map[string]bool{}
	out := make([]pagePlan, 0, count)
	for _, p := range base {
		if seen[p.PageType] {
			continue
		}
		seen[p.PageType] = true
		out = append(out, p)
	}
	for _, d := range orderedDefaults {
		if len(out) >= count {
			break
		}
		if seen[d.PageType] {
			continue
		}
		seen[d.PageType] = true
		out = append(out, d)
	}
	if len(out) > count {
		out = out[:count]
	}
	if len(out) == 0 {
		return planPages(count)
	}
	return out
}

// promptAwarePlan leads with the page type implied by the prompt (NormalizeIntent),
// then fills with sensible distinct defaults — so a "login" brief yields a login
// page even on the manual page-count path, not a blind dashboard.
func promptAwarePlan(prompt, domainName string, count int) []pagePlan {
	intent := ai.NormalizeIntent(prompt, "", domainName)
	var base []pagePlan
	if allowedPageTypes[intent.PageType] {
		base = []pagePlan{{Name: defaultPageName(intent.PageType), PageType: intent.PageType}}
	}
	return padPlan(base, count)
}

func dedupePlan(in []pagePlan) []pagePlan {
	seen := map[string]bool{}
	out := make([]pagePlan, 0, len(in))
	for _, p := range in {
		if seen[p.PageType] {
			continue
		}
		seen[p.PageType] = true
		out = append(out, p)
	}
	return out
}

// resolveAppPlan decides the page set for a generation. The page TYPE is led by
// the prompt's EXPLICIT intent (NormalizeIntent keyword match — e.g. "login" /
// "sign in" → login), which is more reliable than the AI planner: the planner
// often reframes a clear "login page" brief as an "auth control center DASHBOARD".
// The planner only fills ADDITIONAL pages after that lead. So a login brief yields
// a login page first, even with a manual page count of 1.
func (f *FrontendService) resolveAppPlan(ctx context.Context, in GenerateAppInput, domainName string) []pagePlan {
	intent := ai.NormalizeIntent(in.Prompt, "", domainName)
	// A specific intent (anything but the generic "dashboard" default) is a strong
	// signal the user asked for that exact screen — lead with it.
	var lead []pagePlan
	if intent.PageType != "" && intent.PageType != "dashboard" && allowedPageTypes[intent.PageType] {
		lead = []pagePlan{{Name: defaultPageName(intent.PageType), PageType: intent.PageType}}
	}

	// Manual single page with a clear intent: honour it directly — no planner call,
	// no chance for the planner to override it.
	if !in.Auto && in.PageCount == 1 && len(lead) > 0 {
		return lead
	}

	var aiPlan []pagePlan
	if planner, ok := f.s.aiProvider.(ai.AppPlanner); ok {
		if plans, err := planner.PlanApp(ctx, in.Prompt, domainName); err == nil && len(plans) > 0 {
			aiPlan = sanitizeAutoPlan(plans)
		}
	}

	base := append(append([]pagePlan{}, lead...), aiPlan...)

	if in.Auto || in.PageCount < 1 {
		out := dedupePlan(base)
		if len(out) == 0 {
			return promptAwarePlan(in.Prompt, domainName, 3)
		}
		if len(out) > 5 {
			out = out[:5]
		}
		return out
	}

	// Manual count: lead-first types, deduped, capped/padded to the requested count.
	if len(base) == 0 {
		return promptAwarePlan(in.Prompt, domainName, in.PageCount)
	}
	return padPlan(base, in.PageCount)
}

// GenerateMultiPage generates several coherent pages (dashboard, list, detail,
// form) for one project from a single prompt. Each page is a real project_page
// with its own validated version + kit-rendered code.
func (f *FrontendService) GenerateMultiPage(ctx context.Context, userID, projectID, idemKey string, in GenerateAppInput) ([]GeneratedPageDTO, error) {
	project, err := f.s.projects.FindOwned(ctx, userID, projectID)
	if err != nil {
		return nil, apperrors.NotFound("Project not found or you do not have access.")
	}
	existing, _ := f.s.pages.ListByOwnedProject(ctx, userID, projectID)
	bySlug := make(map[string]domain.Page, len(existing))
	for _, p := range existing {
		bySlug[p.Slug] = p
	}

	theme := f.normalizeTheme(ctx, in.ThemeSlug)

	// Ensure a page exists for each planned screen (sequential, fast DB work).
	type planned struct {
		plan pagePlan
		slug string
		page domain.Page
	}
	items := make([]planned, 0, in.PageCount)
	for _, pp := range f.resolveAppPlan(ctx, in, project.Domain) {
		slug := slugify(pp.Name)
		page, ok := bySlug[slug]
		if !ok {
			page, err = f.s.CreatePageForUser(ctx, userID, projectID, CreatePageInput{Name: pp.Name, PageType: pp.PageType})
			if err != nil {
				return nil, err
			}
			bySlug[slug] = page
		}
		items = append(items, planned{plan: pp, slug: slug, page: page})
	}

	// Detach generation from the request context so it finishes on the server
	// even if the user navigates away mid-build. Finished pages are persisted and
	// shown when they reopen the project.
	genCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 175*time.Second)
	defer cancel()

	// Generate every page concurrently so total time ≈ the slowest page, not the sum.
	results := make([]*GeneratedPageDTO, len(items))
	var wg sync.WaitGroup
	for i := range items {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			it := items[i]
			res, gerr := f.s.GenerateSyncForUser(genCtx, userID, it.page.ID, idemKey+":"+it.slug, GenerateInput{
				Prompt:     in.Prompt,
				PageType:   it.plan.PageType,
				Domain:     project.Domain,
				ThemeSlug:  theme,
				OutputMode: "tsx",
			})
			if gerr != nil {
				return
			}
			version := res.Version
			// If the live AI provider failed validation, fall back to the
			// deterministic engine so the page is never empty.
			if version.ID == "" && res.Job.ID != "" {
				f.s.ReprocessWithMock(genCtx, userID, res.Job.ID)
				if reloaded, rerr := f.s.pages.FindOwned(genCtx, userID, it.page.ID); rerr == nil && reloaded.CurrentVersionID != "" {
					if v, verr := f.s.versions.FindOwned(genCtx, userID, it.page.ID, reloaded.CurrentVersionID); verr == nil {
						version = v
					}
				}
			}
			if version.ID == "" {
				return
			}
			results[i] = &GeneratedPageDTO{
				ID:           it.page.ID,
				Name:         it.plan.Name,
				Slug:         it.slug,
				PageType:     it.plan.PageType,
				QualityScore: round1(version.QualityScore),
				Schema:       schemaOrEmpty(version.SchemaJSON),
				Files:        versionFiles(version),
			}
		}(i)
	}
	wg.Wait()

	out := []GeneratedPageDTO{}
	for _, r := range results {
		if r != nil {
			out = append(out, *r)
		}
	}
	return out, nil
}

// ProjectPages returns every page of a project with its current version's
// schema + code (used by the studio to render the page tabs on load).
func (f *FrontendService) ProjectPages(ctx context.Context, userID, projectID string) ([]GeneratedPageDTO, error) {
	pages, err := f.s.pages.ListByOwnedProject(ctx, userID, projectID)
	if err != nil {
		return nil, err
	}
	out := []GeneratedPageDTO{}
	for _, page := range pages {
		// Only surface pages that have a generated version.
		if page.CurrentVersionID == "" {
			continue
		}
		v, err := f.s.versions.FindOwned(ctx, userID, page.ID, page.CurrentVersionID)
		if err != nil {
			continue
		}
		out = append(out, GeneratedPageDTO{
			ID:           page.ID,
			Name:         page.Name,
			Slug:         page.Slug,
			PageType:     page.PageType,
			QualityScore: round1(v.QualityScore),
			Schema:       schemaOrEmpty(v.SchemaJSON),
			Files:        versionFiles(v),
		})
	}
	return out, nil
}

func schemaOrEmpty(m map[string]interface{}) map[string]interface{} {
	if m == nil {
		return map[string]interface{}{}
	}
	return m
}

func schemaFromMap(m map[string]interface{}) (schema.PageSchema, error) {
	raw, err := json.Marshal(m)
	if err != nil {
		return schema.PageSchema{}, err
	}
	var ps schema.PageSchema
	if err := json.Unmarshal(raw, &ps); err != nil {
		return schema.PageSchema{}, err
	}
	return ps, nil
}

// SetProjectTheme switches a project's design system WITHOUT regenerating. The
// stored schema is theme-independent, so it re-renders every page's code with the
// new theme's tokens and rewrites generated_code IN PLACE (no new version, no AI
// call, no credit). The live preview re-skins client-side from the same catalog.
func (f *FrontendService) SetProjectTheme(ctx context.Context, userID, projectID, themeSlug string) error {
	themeSlug = strings.TrimSpace(themeSlug)
	if themeSlug == "" {
		return apperrors.BadRequest("themeSlug is required")
	}
	project, err := f.s.projects.FindOwned(ctx, userID, projectID)
	if err != nil {
		return apperrors.NotFound("Project not found or you do not have access.")
	}

	// Resolve the renderer library: a visual design-system slug (shadcn,
	// neobrutalism, glass, …) is passed straight through (token renderer); other
	// slugs resolve to a component-library kit via the themes table.
	library := themeSlug
	if !designsystem.Has(themeSlug) {
		library = f.s.themeLibrary(ctx, themeSlug)
	}

	pages, err := f.s.pages.ListByOwnedProject(ctx, userID, projectID)
	if err != nil {
		return err
	}
	for _, page := range pages {
		if page.CurrentVersionID == "" {
			continue
		}
		v, err := f.s.versions.FindOwned(ctx, userID, page.ID, page.CurrentVersionID)
		if err != nil {
			continue
		}
		ps, err := schemaFromMap(v.SchemaJSON)
		if err != nil {
			continue
		}
		code := renderer.Generate(ps, "tsx", library)
		if err := f.s.versions.UpdateGeneratedCode(ctx, v.ID, code); err != nil {
			return err
		}
	}

	project.DefaultThemeSlug = themeSlug
	if _, err := f.s.projects.UpdateOwned(ctx, userID, project); err != nil {
		return err
	}
	return nil
}

type exportRoute struct {
	slug     string
	name     string
	pageType string
	pageTSX  string
	schema   string
}

// ExportProjectZip bundles every generated page into a RUNNABLE Next.js App Router
// project (npm install && npm run dev) — scaffold + one route per screen + an index
// linking them. Each page is already self-contained (inline <style> tokens), so no
// Tailwind/extra wiring is needed. Returns the zip bytes and a suggested filename.
func (f *FrontendService) ExportProjectZip(ctx context.Context, userID, projectID string) ([]byte, string, error) {
	project, err := f.s.projects.FindOwned(ctx, userID, projectID)
	if err != nil {
		return nil, "", apperrors.NotFound("Project not found or you do not have access.")
	}
	pages, err := f.ProjectPages(ctx, userID, projectID)
	if err != nil {
		return nil, "", err
	}
	if len(pages) == 0 {
		return nil, "", apperrors.BadRequest("Nothing to export yet — generate at least one page first.")
	}

	appName := slugify(project.Name)
	if appName == "" {
		appName = "dashboard"
	}

	// Resolve a unique route slug per page + pull its code/schema.
	seen := map[string]bool{}
	routes := make([]exportRoute, 0, len(pages))
	for i, p := range pages {
		slug := slugify(p.Slug)
		if slug == "" {
			slug = slugify(p.Name)
		}
		if slug == "" {
			slug = fmt.Sprintf("%s-%d", p.PageType, i+1)
		}
		base := slug
		for n := 2; seen[slug]; n++ {
			slug = fmt.Sprintf("%s-%d", base, n)
		}
		seen[slug] = true

		r := exportRoute{slug: slug, name: p.Name, pageType: p.PageType}
		for _, file := range p.Files {
			if strings.HasSuffix(file.Path, "page.tsx") {
				r.pageTSX = file.Content
			} else if strings.HasSuffix(file.Path, ".json") {
				r.schema = file.Content
			}
		}
		routes = append(routes, r)
	}

	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	add := func(path, content string) {
		if w, e := zw.Create(path); e == nil {
			_, _ = w.Write([]byte(content))
		}
	}

	// --- runnable Next.js scaffold ---
	add("package.json", nextPackageJSON(appName))
	add("tsconfig.json", nextTSConfig)
	add("next.config.mjs", nextConfigMJS)
	add("postcss.config.mjs", nextPostCSS)
	add("tailwind.config.ts", nextTailwindConfig)
	add(".gitignore", nextGitignore)
	add("README.md", nextReadme(project.Name, routes))
	add("app/globals.css", nextGlobalsCSS)
	add("app/layout.tsx", nextRootLayout(project.Name))
	add("app/page.tsx", nextIndexPage(project.Name, routes))

	// --- one route per screen + its schema ---
	for _, r := range routes {
		add("app/"+r.slug+"/page.tsx", r.pageTSX)
		if r.schema != "" {
			add("schemas/"+r.slug+".json", r.schema)
		}
	}

	if err := zw.Close(); err != nil {
		return nil, "", err
	}
	return buf.Bytes(), appName + ".zip", nil
}

// jsxText escapes a string for use as JSX text content.
func jsxText(s string) string {
	r := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", "{", "&#123;", "}", "&#125;")
	return r.Replace(s)
}

// jsStr returns a safe double-quoted JS string literal.
func jsStr(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}

func nextPackageJSON(name string) string {
	return fmt.Sprintf(`{
  "name": %s,
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
`, jsStr(name))
}

const nextPostCSS = `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
`

const nextTailwindConfig = `import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
`

// Token-driven pages style themselves with inline <style>; legacy/kit pages use
// Tailwind utility classes. Including Tailwind makes BOTH render correctly.
const nextGlobalsCSS = `@tailwind base;
@tailwind components;
@tailwind utilities;
`

const nextTSConfig = `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`

const nextConfigMJS = `/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
`

const nextGitignore = `/node_modules
/.next
/out
*.log
.DS_Store
`

func nextReadme(title string, routes []exportRoute) string {
	var b strings.Builder
	fmt.Fprintf(&b, "# %s\n\nGenerated with DashboardCraft — a runnable Next.js (App Router) project.\n\n", title)
	b.WriteString("## Run\n\n```bash\nnpm install\nnpm run dev\n```\n\nThen open http://localhost:3000\n\n## Screens\n\n")
	for _, r := range routes {
		fmt.Fprintf(&b, "- `/%s` — %s (%s)\n", r.slug, r.name, r.pageType)
	}
	b.WriteString("\nEach screen is a self-contained component (inline styles via CSS variables) under `app/<slug>/page.tsx`. Source schemas are in `schemas/`.\n")
	return b.String()
}

func nextRootLayout(title string) string {
	return fmt.Sprintf(`import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: %s };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
`, jsStr(title))
}

func nextIndexPage(title string, routes []exportRoute) string {
	var links strings.Builder
	for _, r := range routes {
		links.WriteString(fmt.Sprintf(`        <Link href="/%s" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", border: "1px solid #e4e4e7", borderRadius: 14, textDecoration: "none", color: "#09090b", background: "#fff" }}>
          <span style={{ fontWeight: 700 }}>%s</span>
          <span style={{ fontSize: 12, color: "#71717a", textTransform: "uppercase", letterSpacing: ".05em" }}>%s</span>
        </Link>
`, r.slug, jsxText(r.name), jsxText(r.pageType)))
	}
	return fmt.Sprintf(`import Link from "next/link";

export const metadata = { title: %s };

export default function Home() {
  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif", maxWidth: 880, margin: "0 auto", padding: "56px 24px" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>%s</h1>
      <p style={{ color: "#64748b", marginTop: 10 }}>Generated screens — click one to open.</p>
      <div style={{ display: "grid", gap: 12, marginTop: 32 }}>
%s      </div>
    </main>
  );
}
`, jsStr(title+" — Screens"), jsxText(title), links.String())
}

type RefineFEInput struct {
	SectionName string `json:"sectionName"`
	Instruction string `json:"instruction"`
	ThemeSlug   string `json:"themeSlug"`
}

func (f *FrontendService) Refine(ctx context.Context, userID, projectID, idemKey string, in RefineFEInput) (VersionDTO, error) {
	page, err := f.primaryPage(ctx, userID, projectID, false)
	if err != nil {
		return VersionDTO{}, err
	}
	sectionIndex := f.resolveSectionIndex(ctx, userID, page, in.SectionName)
	prompt := strings.TrimSpace(in.Instruction)
	if in.SectionName != "" {
		prompt = "Refine the " + in.SectionName + " section: " + prompt
	}
	res, err := f.s.RefineSyncForUser(ctx, userID, page.ID, idemKey, RefineInput{
		Prompt:       prompt,
		SectionIndex: sectionIndex,
	})
	if err != nil {
		return VersionDTO{}, err
	}
	return versionDTO(res.Version), nil
}

func (f *FrontendService) resolveSectionIndex(ctx context.Context, userID string, page domain.Page, sectionName string) int {
	if page.CurrentVersionID == "" || sectionName == "" {
		return 0
	}
	version, err := f.s.versions.FindOwned(ctx, userID, page.ID, page.CurrentVersionID)
	if err != nil {
		return 0
	}
	sections, _ := version.SchemaJSON["sections"].([]interface{})
	want := strings.ToLower(strings.TrimSpace(sectionName))
	for i, raw := range sections {
		section, ok := raw.(map[string]interface{})
		if !ok {
			continue
		}
		if t, _ := section["type"].(string); strings.EqualFold(t, want) {
			return i
		}
		if title, _ := section["title"].(string); strings.EqualFold(title, want) {
			return i
		}
	}
	return 0
}

// primaryPage returns the project's first page. When create is true and no page
// exists yet, a default dashboard page is created.
func (f *FrontendService) primaryPage(ctx context.Context, userID, projectID string, create bool) (domain.Page, error) {
	pages, err := f.s.pages.ListByOwnedProject(ctx, userID, projectID)
	if err != nil {
		return domain.Page{}, err
	}
	if len(pages) > 0 {
		return pages[0], nil
	}
	if !create {
		return domain.Page{}, apperrors.NotFound("Project has no page yet.")
	}
	return f.s.CreatePageForUser(ctx, userID, projectID, CreatePageInput{Name: "Overview", PageType: "dashboard"})
}

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

func (f *FrontendService) CreditBalance(ctx context.Context, userID string) (BalanceDTO, error) {
	wallet, err := f.s.wallets.GetForUpdate(ctx, userID)
	if err != nil {
		return BalanceDTO{}, err
	}
	used := f.usedThisMonth(ctx, userID)
	return BalanceDTO{
		Available:     wallet.Balance,
		MonthlyLimit:  defaultMonthlyCreditLimit,
		UsedThisMonth: used,
	}, nil
}

func (f *FrontendService) CreditTransactions(ctx context.Context, userID string) ([]TransactionDTO, error) {
	txs, err := f.s.transactions.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]TransactionDTO, 0, len(txs))
	for _, t := range txs {
		out = append(out, TransactionDTO{
			ID:           t.ID,
			Type:         mapTransactionType(t.Type, t.Amount),
			Amount:       t.Amount,
			BalanceAfter: t.BalanceAfter,
			Description:  t.Description,
			CreatedAt:    isoTime(t.CreatedAt),
			Status:       "succeeded",
		})
	}
	return out, nil
}

func (f *FrontendService) PreviewCost(_ string) int {
	return 1
}

func (f *FrontendService) DeductCredits(ctx context.Context, userID string, amount int, description string) (bool, error) {
	if amount <= 0 {
		return false, apperrors.Validation("amount must be positive")
	}
	if amount > 1000 {
		return false, apperrors.Validation("amount exceeds the maximum single deduction")
	}
	if len(description) > 200 {
		description = description[:200]
	}
	err := f.s.tx.WithTx(ctx, func(txCtx context.Context) error {
		w, err := f.s.wallets.GetForUpdate(txCtx, userID)
		if err != nil {
			return err
		}
		if w.Balance < amount {
			return apperrors.PaymentRequired("insufficient credits")
		}
		w.Balance -= amount
		if err := f.s.wallets.Upsert(txCtx, w); err != nil {
			return err
		}
		txID, err := newID()
		if err != nil {
			return err
		}
		_, err = f.s.transactions.Create(txCtx, domain.CreditTransaction{
			ID:            txID,
			UserID:        userID,
			Type:          "usage",
			Amount:        -amount,
			BalanceAfter:  w.Balance,
			ReferenceType: "manual",
			Description:   fallback(description, "Manual credit usage"),
		})
		return err
	})
	if err != nil {
		if apperr, ok := apperrors.From(err); ok && apperr.Status == 402 {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (f *FrontendService) usedThisMonth(ctx context.Context, userID string) int {
	txs, err := f.s.transactions.ListByUser(ctx, userID)
	if err != nil {
		return 0
	}
	now := time.Now().UTC()
	used := 0
	for _, t := range txs {
		if t.Amount < 0 && t.CreatedAt.Year() == now.Year() && t.CreatedAt.Month() == now.Month() {
			used += -t.Amount
		}
	}
	return used
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

func (f *FrontendService) GetSettings(ctx context.Context, userID string) (SettingsDTO, error) {
	user, err := f.s.users.FindByID(ctx, userID)
	if err != nil {
		return SettingsDTO{}, apperrors.NotFound("User not found.")
	}
	dto := defaultSettings(user)
	if f.s.pool == nil {
		return dto, nil
	}

	var bio, avatar string
	var genRaw, wsRaw, secRaw []byte
	err = f.s.pool.QueryRow(ctx, `
		SELECT bio, avatar_url, generation_preferences, workspace, security
		FROM user_settings WHERE user_id=$1`, userID).Scan(&bio, &avatar, &genRaw, &wsRaw, &secRaw)
	if err != nil {
		// No row yet: persist defaults so subsequent updates have a target.
		_ = f.ensureSettingsRow(ctx, userID, dto)
		return dto, nil
	}

	dto.Profile.Bio = bio
	dto.Profile.AvatarURL = avatar
	_ = json.Unmarshal(genRaw, &dto.GenerationPreferences)
	_ = json.Unmarshal(wsRaw, &dto.Workspace)
	_ = json.Unmarshal(secRaw, &dto.SecurityPreferences)
	if dto.Workspace.Name == "" {
		dto.Workspace = defaultSettings(user).Workspace
	}
	return dto, nil
}

func (f *FrontendService) ensureSettingsRow(ctx context.Context, userID string, dto SettingsDTO) error {
	if f.s.pool == nil {
		return nil
	}
	gen, _ := json.Marshal(dto.GenerationPreferences)
	ws, _ := json.Marshal(dto.Workspace)
	sec, _ := json.Marshal(dto.SecurityPreferences)
	_, err := f.s.pool.Exec(ctx, `
		INSERT INTO user_settings (user_id, bio, avatar_url, generation_preferences, workspace, security)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id) DO NOTHING`,
		userID, dto.Profile.Bio, dto.Profile.AvatarURL, string(gen), string(ws), string(sec))
	return err
}

func (f *FrontendService) UpdateProfile(ctx context.Context, userID string, patch map[string]interface{}) (SettingsDTO, error) {
	current, err := f.GetSettings(ctx, userID)
	if err != nil {
		return SettingsDTO{}, err
	}
	if v, ok := patch["bio"].(string); ok {
		current.Profile.Bio = v
	}
	if v, ok := patch["avatarUrl"].(string); ok {
		current.Profile.AvatarURL = v
	}
	if f.s.pool != nil {
		_ = f.ensureSettingsRow(ctx, userID, current)
		_, err = f.s.pool.Exec(ctx, `
			UPDATE user_settings SET bio=$2, avatar_url=$3, updated_at=now() WHERE user_id=$1`,
			userID, current.Profile.Bio, current.Profile.AvatarURL)
		if err != nil {
			return SettingsDTO{}, err
		}
	}
	return f.GetSettings(ctx, userID)
}

func (f *FrontendService) UpdateGenerationPreferences(ctx context.Context, userID string, patch GenerationPreferencesDTO) (SettingsDTO, error) {
	return f.updateJSONColumn(ctx, userID, "generation_preferences", patch)
}

func (f *FrontendService) UpdateWorkspace(ctx context.Context, userID string, patch WorkspaceDTO) (SettingsDTO, error) {
	return f.updateJSONColumn(ctx, userID, "workspace", patch)
}

func (f *FrontendService) UpdateSecurity(ctx context.Context, userID string, patch SecurityPreferencesDTO) (SettingsDTO, error) {
	return f.updateJSONColumn(ctx, userID, "security", patch)
}

// allowedSettingsColumns is the strict allowlist of user_settings JSONB columns
// updateJSONColumn may write. The column name is interpolated into SQL (pgx
// cannot parameterize identifiers), so it MUST be validated against this map to
// foreclose any possibility of SQL injection via the column argument.
var allowedSettingsColumns = map[string]bool{
	"generation_preferences": true,
	"workspace":              true,
	"security":               true,
}

func (f *FrontendService) updateJSONColumn(ctx context.Context, userID, column string, value interface{}) (SettingsDTO, error) {
	if !allowedSettingsColumns[column] {
		return SettingsDTO{}, apperrors.Validation("unsupported settings column")
	}
	current, err := f.GetSettings(ctx, userID)
	if err != nil {
		return SettingsDTO{}, err
	}
	if f.s.pool == nil {
		return current, nil // mock mode: settings are not persisted
	}
	_ = f.ensureSettingsRow(ctx, userID, current)
	raw, _ := json.Marshal(value)
	// column is validated against allowedSettingsColumns above, so the only
	// values that reach this interpolation are the three fixed identifiers.
	_, err = f.s.pool.Exec(ctx, "UPDATE user_settings SET "+column+"=$2, updated_at=now() WHERE user_id=$1", userID, string(raw))
	if err != nil {
		return SettingsDTO{}, err
	}
	return f.GetSettings(ctx, userID)
}

func defaultSettings(user domain.User) SettingsDTO {
	return SettingsDTO{
		Profile: ProfileDTO{
			Name:  user.Name,
			Email: user.Email,
		},
		GenerationPreferences: GenerationPreferencesDTO{
			DefaultTheme:   "studio-neutral",
			DefaultDevice:  "desktop-1440",
			PromptBoosting: true,
			AutoSave:       true,
			SafeMode:       true,
			PreviewGuides:  true,
			CompactMode:    false,
		},
		Workspace: WorkspaceDTO{
			Name:          fallback(user.Name, "My") + " Workspace",
			Slug:          slugify(fallback(user.Name, "workspace")),
			ProjectNaming: "prompt-based",
			Members: []WorkspaceMemberDTO{
				{ID: user.ID, Name: user.Name, Email: user.Email, Role: "Owner", Status: "active"},
			},
		},
		SecurityPreferences: SecurityPreferencesDTO{
			TwoFactorEnabled: false,
			LoginAlerts:      true,
		},
	}
}

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

func (f *FrontendService) ListAPIKeys(ctx context.Context, userID string) ([]APIKeyDTO, error) {
	if f.s.pool == nil {
		return []APIKeyDTO{}, nil
	}
	rows, err := f.s.pool.Query(ctx, `
		SELECT id, name, prefix, scope, created_at, last_used_at
		FROM api_keys WHERE user_id=$1 AND revoked_at IS NULL
		ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []APIKeyDTO{}
	for rows.Next() {
		var id, name, prefix, scope string
		var createdAt time.Time
		var lastUsed *time.Time
		if err := rows.Scan(&id, &name, &prefix, &scope, &createdAt, &lastUsed); err != nil {
			return nil, err
		}
		lastUsedStr := "Never"
		if lastUsed != nil {
			lastUsedStr = isoTime(*lastUsed)
		}
		out = append(out, APIKeyDTO{
			ID:         id,
			Name:       name,
			Prefix:     prefix,
			Scope:      scope,
			CreatedAt:  isoTime(createdAt),
			LastUsedAt: lastUsedStr,
		})
	}
	return out, rows.Err()
}

func (f *FrontendService) CreateAPIKey(ctx context.Context, userID, name string) (APIKeyDTO, string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return APIKeyDTO{}, "", apperrors.Validation("name is required")
	}
	if f.s.pool == nil {
		return APIKeyDTO{}, "", apperrors.Conflict("API keys require a database-backed deployment")
	}

	secret, err := randomHex(18)
	if err != nil {
		return APIKeyDTO{}, "", err
	}
	rawValue := "dg_live_" + secret
	prefix := "dg_live_" + secret[:4] + "••••••••"
	sum := sha256.Sum256([]byte(rawValue))
	keyHash := hex.EncodeToString(sum[:])

	id, err := newID()
	if err != nil {
		return APIKeyDTO{}, "", err
	}
	now := time.Now().UTC()
	_, err = f.s.pool.Exec(ctx, `
		INSERT INTO api_keys (id, user_id, name, prefix, scope, key_hash, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		id, userID, name, prefix, "generation:write", keyHash, now)
	if err != nil {
		return APIKeyDTO{}, "", err
	}
	return APIKeyDTO{
		ID:         id,
		Name:       name,
		Prefix:     prefix,
		Scope:      "generation:write",
		CreatedAt:  isoTime(now),
		LastUsedAt: "Never",
	}, rawValue, nil
}

func (f *FrontendService) RevokeAPIKey(ctx context.Context, userID, keyID string) error {
	if f.s.pool == nil {
		return nil
	}
	tag, err := f.s.pool.Exec(ctx, `
		UPDATE api_keys SET revoked_at=now()
		WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL`, keyID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("API key not found.")
	}
	return nil
}

// ---------------------------------------------------------------------------
// Admin analytics
// ---------------------------------------------------------------------------

func (f *FrontendService) AdminGenerationJobs(ctx context.Context) ([]AdminJobDTO, error) {
	jobs, err := f.s.jobs.ListForAdmin(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]AdminJobDTO, 0, len(jobs))
	for _, j := range jobs {
		duration := "—"
		if !j.FinishedAt.IsZero() && !j.StartedAt.IsZero() {
			duration = j.FinishedAt.Sub(j.StartedAt).Round(time.Millisecond).String()
		}
		out = append(out, AdminJobDTO{
			ID:           j.ID,
			User:         j.UserID,
			Project:      j.ProjectID,
			Page:         j.PageID,
			Status:       mapAdminJobStatus(j.Status),
			RetryCount:   j.RetryCount,
			Duration:     duration,
			CreatedAt:    isoTime(j.CreatedAt),
			ErrorMessage: j.ErrorMessage,
		})
	}
	return out, nil
}

type AdminUserDTO struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Email          string `json:"email"`
	Role           string `json:"role"`
	Credits        int    `json:"credits"`
	Projects       int    `json:"projects"`
	PagesGenerated int    `json:"pagesGenerated"`
	JoinedAt       string `json:"joinedAt"`
	Status         string `json:"status"`
}

func (f *FrontendService) AdminUsers(ctx context.Context) ([]AdminUserDTO, error) {
	users, err := f.s.users.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]AdminUserDTO, 0, len(users))
	for _, u := range users {
		credits := 0
		if w, err := f.s.wallets.GetForUpdate(ctx, u.ID); err == nil {
			credits = w.Balance
		}
		projects, pages := 0, 0
		status := "active"
		if f.s.pool != nil {
			_ = f.s.pool.QueryRow(ctx, "SELECT count(*) FROM projects WHERE user_id=$1 AND deleted_at IS NULL", u.ID).Scan(&projects)
			_ = f.s.pool.QueryRow(ctx, "SELECT count(*) FROM page_versions WHERE created_by=$1", u.ID).Scan(&pages)
			_ = f.s.pool.QueryRow(ctx, "SELECT COALESCE(status,'active') FROM users WHERE id=$1", u.ID).Scan(&status)
		} else if ps, err := f.s.projects.ListByUser(ctx, u.ID); err == nil {
			projects = len(ps)
		}
		out = append(out, AdminUserDTO{
			ID:             u.ID,
			Name:           u.Name,
			Email:          u.Email,
			Role:           u.Role,
			Credits:        credits,
			Projects:       projects,
			PagesGenerated: pages,
			JoinedAt:       isoTime(u.CreatedAt),
			Status:         status,
		})
	}
	return out, nil
}

func (f *FrontendService) AnalyticsKPIs(ctx context.Context) (map[string]interface{}, error) {
	users, err := f.s.users.List(ctx)
	if err != nil {
		return nil, err
	}
	jobs, err := f.s.jobs.ListForAdmin(ctx)
	if err != nil {
		return nil, err
	}
	succeeded := 0
	for _, j := range jobs {
		if j.Status == "succeeded" {
			succeeded++
		}
	}
	successRate := 0.0
	if len(jobs) > 0 {
		successRate = round1(float64(succeeded) / float64(len(jobs)) * 100)
	}
	avgQuality := 0.0
	if f.s.pool != nil {
		_ = f.s.pool.QueryRow(ctx, "SELECT COALESCE(AVG(quality_score),0) FROM page_versions").Scan(&avgQuality)
	}
	return map[string]interface{}{
		"activeUsers":    len(users),
		"generationJobs": len(jobs),
		"successRate":    successRate,
		"avgQuality":     round1(avgQuality),
	}, nil
}

func (f *FrontendService) AnalyticsFunnel(ctx context.Context) ([]LabelValue, error) {
	jobs, _ := f.s.jobs.ListForAdmin(ctx)
	queued, processing, succeeded, failed := 0, 0, 0, 0
	for _, j := range jobs {
		switch j.Status {
		case "succeeded":
			succeeded++
		case "failed", "refunded":
			failed++
		case "queued":
			queued++
		default:
			processing++
		}
	}
	return []LabelValue{
		{Label: "Queued", Value: queued},
		{Label: "Processing", Value: processing},
		{Label: "Generated", Value: succeeded},
		{Label: "Failed", Value: failed},
	}, nil
}

func (f *FrontendService) AnalyticsCategoryBreakdown(ctx context.Context) ([]LabelValue, error) {
	out := []LabelValue{}
	if f.s.pool == nil {
		return out, nil
	}
	rows, err := f.s.pool.Query(ctx, `
		SELECT domain, count(*) FROM projects
		WHERE deleted_at IS NULL GROUP BY domain ORDER BY count(*) DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var label string
		var value int
		if err := rows.Scan(&label, &value); err != nil {
			return nil, err
		}
		out = append(out, LabelValue{Label: title(label), Value: value})
	}
	return out, rows.Err()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func versionDTO(v domain.PageVersion) VersionDTO {
	schema := v.SchemaJSON
	if schema == nil {
		schema = map[string]interface{}{}
	}
	return VersionDTO{
		ID:            v.ID,
		VersionNumber: v.VersionNumber,
		Prompt:        v.Prompt,
		QualityScore:  round1(v.QualityScore),
		CreatedAt:     isoTime(v.CreatedAt),
		Files:         versionFiles(v),
		Schema:        schema,
	}
}

func versionFiles(v domain.PageVersion) []FileDTO {
	schemaJSON := "{}"
	if v.SchemaJSON != nil {
		if raw, err := json.MarshalIndent(v.SchemaJSON, "", "  "); err == nil {
			schemaJSON = string(raw)
		}
	}
	files := []FileDTO{
		{Path: "app/page.tsx", Language: "typescript", Content: v.GeneratedCode, Size: len(v.GeneratedCode)},
		{Path: "schema/page.json", Language: "json", Content: schemaJSON, Size: len(schemaJSON)},
	}
	return files
}

func jobDTO(job domain.GenerationJob, version domain.PageVersion) JobDTO {
	status, progress := mapJobStatus(job.Status)
	dto := JobDTO{
		ID:           job.ID,
		ProjectID:    job.ProjectID,
		Prompt:       job.Prompt,
		Status:       status,
		Progress:     progress,
		CreditCost:   job.CreditCost,
		QualityScore: round1(version.QualityScore),
		ErrorMessage: job.ErrorMessage,
		CreatedAt:    isoTime(job.CreatedAt),
	}
	if !job.FinishedAt.IsZero() {
		dto.CompletedAt = isoTime(job.FinishedAt)
	}
	return dto
}

func mapJobStatus(status string) (string, int) {
	switch status {
	case "succeeded":
		return "completed", 100
	case "failed", "refunded":
		return "failed", 100
	case "queued":
		return "queued", 10
	case "processing", "analyzing", "generating_schema", "validating_schema", "rendering_code":
		return "generating_schema", 60
	default:
		return "processing", 50
	}
}

func mapAdminJobStatus(status string) string {
	switch status {
	case "succeeded":
		return "succeeded"
	case "failed", "refunded":
		return "failed"
	case "queued":
		return "queued"
	default:
		return "processing"
	}
}

func mapTransactionType(t string, amount int) string {
	switch t {
	case "topup":
		return "topup"
	case "refund":
		return "refund"
	case "reserve", "usage":
		return "usage"
	default:
		if amount >= 0 {
			return "topup"
		}
		return "usage"
	}
}

func (f *FrontendService) normalizeDomain(domainName string) string {
	d := strings.ToLower(strings.TrimSpace(domainName))
	if d == "" || !allowedDomains[d] {
		return "custom"
	}
	return d
}

func (f *FrontendService) normalizeTheme(ctx context.Context, slug string) string {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return ""
	}
	if f.s.themeExists(ctx, slug) {
		return slug
	}
	return "studio-neutral"
}

func normalizeStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "draft":
		return "draft"
	case "archived":
		return "archived"
	default:
		return "active"
	}
}

func isoTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}

func round1(v float64) float64 {
	return float64(int(v*10+0.5)) / 10
}

func randomHex(n int) (string, error) {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

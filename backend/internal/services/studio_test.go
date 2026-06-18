package services

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/domain"
)


func TestGenerateCreatesVersionAndConsumesCredit(t *testing.T) {
	studio := NewStudioService()
	ctx := context.Background()
	projects, err := studio.ListProjects(ctx)
	if err != nil {
		t.Fatalf("list projects: %v", err)
	}
	if len(projects) == 0 {
		t.Fatal("expected seeded project")
	}

	_, pages, err := studio.GetProject(ctx, projects[0].ID)
	if err != nil {
		t.Fatalf("get project: %v", err)
	}
	if len(pages) == 0 {
		t.Fatal("expected seeded page")
	}

	wallet, err := studio.Wallet(ctx)
	if err != nil {
		t.Fatalf("get wallet: %v", err)
	}
	before := wallet.Balance

	result, err := studio.Generate(ctx, pages[0].ID, "test-request-1", GenerateInput{
		Prompt:    "Create a hospital dashboard with operations metrics",
		PageType:  "dashboard",
		Domain:    "hospital",
		ThemeSlug: "medical-clean",
	})
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if result.Job.ID == "" {
		t.Fatal("expected job ID")
	}
	job := waitForJob(t, studio, defaultUserID, result.Job.ID)
	if job.Status != "succeeded" {
		t.Fatalf("expected succeeded job, got %q: %s", job.Status, job.ErrorMessage)
	}

	page, _ := studio.GetPage(ctx, pages[0].ID)
	version, _ := studio.versions.FindOwned(ctx, defaultUserID, page.ID, page.CurrentVersionID)

	if version.VersionNumber != 1 {
		t.Fatalf("expected version 1, got %d", version.VersionNumber)
	}
	if page.CurrentVersionID != version.ID {
		t.Fatal("expected generated version to become current")
	}
	if result.Wallet.Balance != before-1 {
		t.Fatalf("expected credit balance %d, got %d", before-1, result.Wallet.Balance)
	}
	if version.GeneratedCode == "" {
		t.Fatal("expected generated TSX code")
	}
}


func TestGenerateRequiresIdempotencyKey(t *testing.T) {
	studio := NewStudioService()
	ctx := context.Background()
	projects, err := studio.ListProjects(ctx)
	if err != nil {
		t.Fatalf("list projects: %v", err)
	}
	_, pages, err := studio.GetProject(ctx, projects[0].ID)
	if err != nil {
		t.Fatalf("get project: %v", err)
	}

	_, err = studio.Generate(ctx, pages[0].ID, "", GenerateInput{
		Prompt:   "Create a dashboard",
		PageType: "dashboard",
		Domain:   "hospital",
	})
	if err == nil {
		t.Fatal("expected missing idempotency key to fail")
	}
}

func TestRestoreVersionSwitchesCurrentVersion(t *testing.T) {
	studio := NewStudioService()
	ctx := context.Background()
	pageID := seededPageID(t, studio)

	first, err := studio.Generate(ctx, pageID, "restore-request-1", GenerateInput{
		Prompt:   "Create a hospital dashboard with operations metrics",
		PageType: "dashboard",
		Domain:   "hospital",
	})
	if err != nil {
		t.Fatalf("first generate: %v", err)
	}
	waitForJob(t, studio, defaultUserID, first.Job.ID)

	second, err := studio.Generate(ctx, pageID, "restore-request-2", GenerateInput{
		Prompt:   "Create a finance dashboard with revenue metrics",
		PageType: "dashboard",
		Domain:   "finance",
	})
	if err != nil {
		t.Fatalf("second generate: %v", err)
	}
	waitForJob(t, studio, defaultUserID, second.Job.ID)

	page, _ := studio.GetPage(ctx, pageID)

	page, version, err := studio.RestoreVersion(ctx, pageID, first.Job.ID) // ID mismatch in old test, but let's fix it
	// Actually, RestoreVersion needs VersionID, not JobID.
	// We need to find the version ID from the job or page history.
	versions, _ := studio.ListVersions(ctx, pageID)
	var v1ID string
	for _, v := range versions {
		if v.VersionNumber == 1 {
			v1ID = v.ID
		}
	}

	page, version, err = studio.RestoreVersion(ctx, pageID, v1ID)
	if err != nil {
		t.Fatalf("restore version: %v", err)
	}
	if page.CurrentVersionID != v1ID {
		t.Fatalf("expected current version %s, got %s", v1ID, page.CurrentVersionID)
	}
	if version.VersionNumber != 1 {
		t.Fatalf("expected restored version number 1, got %d", version.VersionNumber)
	}
}

func TestRefineCreatesNewVersionForSelectedSection(t *testing.T) {
	studio := NewStudioService()
	ctx := context.Background()
	pageID := seededPageID(t, studio)

	generated, err := studio.Generate(ctx, pageID, "refine-request-1", GenerateInput{
		Prompt:   "Create a hospital dashboard with operations metrics",
		PageType: "dashboard",
		Domain:   "hospital",
	})
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	waitForJob(t, studio, defaultUserID, generated.Job.ID)

	wallet, err := studio.Wallet(ctx)
	if err != nil {
		t.Fatalf("get wallet: %v", err)
	}
	before := wallet.Balance

	refined, err := studio.Refine(ctx, pageID, "refine-request-2", RefineInput{
		Prompt:       "Make the chart focus on weekly patient volume",
		SectionIndex: 1,
	})
	if err != nil {
		t.Fatalf("refine: %v", err)
	}
	waitForJob(t, studio, defaultUserID, refined.Job.ID)

	page, _ := studio.GetPage(ctx, pageID)
	version, _ := studio.versions.FindOwned(ctx, defaultUserID, page.ID, page.CurrentVersionID)

	if version.VersionNumber != 2 {
		t.Fatalf("expected next version, got %d", version.VersionNumber)
	}
	if walletAfter, _ := studio.Wallet(ctx); walletAfter.Balance != before-1 {
		t.Fatalf("expected credit balance %d, got %d", before-1, walletAfter.Balance)
	}
	sections, ok := version.SchemaJSON["sections"].([]interface{})
	if !ok || len(sections) < 2 {
		t.Fatal("expected schema sections")
	}
	chart, ok := sections[1].(map[string]interface{})
	if !ok {
		t.Fatal("expected refined chart section")
	}
	if chart["datasetPreset"] != "hospital-refined" {
		t.Fatalf("expected refined dataset preset, got %v", chart["datasetPreset"])
	}
}


func TestGenerateRejectsTooLongPrompt(t *testing.T) {
	studio := NewStudioService()
	ctx := context.Background()
	pageID := seededPageID(t, studio)

	_, err := studio.Generate(ctx, pageID, "long-prompt", GenerateInput{
		Prompt:   string(make([]byte, maxPromptLength+1)),
		PageType: "dashboard",
		Domain:   "hospital",
	})
	if err == nil {
		t.Fatal("expected too long prompt to fail")
	}
}

func TestGenerateUsesWalletPerUser(t *testing.T) {
	studio := NewStudioService()
	ctx := context.Background()
	other, err := studio.Register(RegisterInput{
		Name:     "Wallet User",
		Email:    "wallet@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	project, err := studio.CreateProjectForUser(ctx, other.User.ID, CreateProjectInput{Name: "Wallet Project", Domain: "finance", DefaultThemeSlug: "studio-neutral"})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	page, err := studio.CreatePageForUser(ctx, other.User.ID, project.ID, CreatePageInput{Name: "Wallet Page", PageType: "dashboard"})
	if err != nil {
		t.Fatalf("create page: %v", err)
	}

	demoW, _ := studio.WalletForUser(ctx, defaultUserID)
	demoBefore := demoW.Balance

	otherW, _ := studio.WalletForUser(ctx, other.User.ID)
	otherBefore := otherW.Balance

	result, err := studio.GenerateForUser(ctx, other.User.ID, page.ID, "wallet-user-request", GenerateInput{
		Prompt:    "Create a finance dashboard",
		PageType:  "dashboard",
		Domain:    "finance",
		ThemeSlug: "studio-neutral",
	})
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	waitForJob(t, studio, other.User.ID, result.Job.ID)

	if result.Job.UserID != other.User.ID {
		t.Fatalf("expected wallet user %s, got %s", other.User.ID, result.Job.UserID)
	}

	otherWAfter, _ := studio.WalletForUser(ctx, other.User.ID)
	if got := otherWAfter.Balance; got != otherBefore-1 {
		t.Fatalf("expected other wallet %d, got %d", otherBefore-1, got)
	}

	demoWAfter, _ := studio.WalletForUser(ctx, defaultUserID)
	if got := demoWAfter.Balance; got != demoBefore {
		t.Fatalf("expected demo wallet unchanged at %d, got %d", demoBefore, got)
	}
}

func TestGenerateIdempotencyDoesNotDoubleCharge(t *testing.T) {
	studio := NewStudioService()
	ctx := context.Background()
	pageID := seededPageID(t, studio)
	wallet, _ := studio.Wallet(ctx)
	before := wallet.Balance
	input := GenerateInput{
		Prompt:    "Create a hospital dashboard with operations metrics",
		PageType:  "dashboard",
		Domain:    "hospital",
		ThemeSlug: "medical-clean",
	}

	first, err := studio.Generate(ctx, pageID, "same-request-key", input)
	if err != nil {
		t.Fatalf("first generate: %v", err)
	}
	waitForJob(t, studio, defaultUserID, first.Job.ID)

	second, err := studio.Generate(ctx, pageID, "same-request-key", input)
	if err != nil {
		t.Fatalf("second generate: %v", err)
	}
	waitForJob(t, studio, defaultUserID, second.Job.ID)

	if first.Job.ID != second.Job.ID {
		t.Fatalf("expected same job, got %s and %s", first.Job.ID, second.Job.ID)
	}

	walletAfter, _ := studio.Wallet(ctx)
	if got := walletAfter.Balance; got != before-1 {
		t.Fatalf("expected one credit charged, got balance %d from %d", got, before)
	}
}

func TestIdempotencyKeyIsScopedByUser(t *testing.T) {
	studio := NewStudioService()
	ctx := context.Background()
	demoPageID := seededPageID(t, studio)
	other, err := studio.Register(RegisterInput{
		Name:     "Scoped User",
		Email:    "scoped@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	project, err := studio.CreateProjectForUser(ctx, other.User.ID, CreateProjectInput{Name: "Scoped Project", Domain: "finance", DefaultThemeSlug: "studio-neutral"})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	page, err := studio.CreatePageForUser(ctx, other.User.ID, project.ID, CreatePageInput{Name: "Scoped Page", PageType: "dashboard"})
	if err != nil {
		t.Fatalf("create page: %v", err)
	}
	input := GenerateInput{Prompt: "Create a dashboard", PageType: "dashboard", Domain: "finance", ThemeSlug: "studio-neutral"}

	demoResult, err := studio.GenerateForUser(ctx, defaultUserID, demoPageID, "shared-key", input)
	if err != nil {
		t.Fatalf("demo generate: %v", err)
	}
	waitForJob(t, studio, defaultUserID, demoResult.Job.ID)

	otherResult, err := studio.GenerateForUser(ctx, other.User.ID, page.ID, "shared-key", input)
	if err != nil {
		t.Fatalf("other generate: %v", err)
	}
	waitForJob(t, studio, other.User.ID, otherResult.Job.ID)

	if demoResult.Job.ID == otherResult.Job.ID {
		t.Fatal("expected same request key for different users to create separate jobs")
	}
}

func TestGenerateRejectsUnsupportedInputs(t *testing.T) {
	studio := NewStudioService()
	ctx := context.Background()
	pageID := seededPageID(t, studio)

	if _, err := studio.Generate(ctx, pageID, "bad-page-type", GenerateInput{
		Prompt:   "Create a dashboard",
		PageType: "raw-react",
		Domain:   "hospital",
	}); err == nil {
		t.Fatal("expected unsupported pageType to fail")
	}
	if _, err := studio.Generate(ctx, pageID, "bad-theme", GenerateInput{
		Prompt:    "Create a dashboard",
		PageType:  "dashboard",
		Domain:    "hospital",
		ThemeSlug: "unknown-theme",
	}); err == nil {
		t.Fatal("expected unsupported theme to fail")
	}
}

func TestConcurrentGenerateCannotMakeWalletNegative(t *testing.T) {
	studio := NewStudioService()
	ctx := context.Background()
	pageID := seededPageID(t, studio)

	_ = studio.wallets.Upsert(ctx, domain.CreditWallet{UserID: defaultUserID, Balance: 1})

	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, _ = studio.Generate(ctx, pageID, fmt.Sprintf("concurrent-request-%d", i), GenerateInput{
				Prompt:    "Create a hospital dashboard",
				PageType:  "dashboard",
				Domain:    "hospital",
				ThemeSlug: "medical-clean",
			})
		}(i)
	}
	wg.Wait()

	wallet, _ := studio.Wallet(ctx)
	if got := wallet.Balance; got < 0 {
		t.Fatalf("wallet balance must not be negative, got %d", got)
	}
}

func seededPageID(t *testing.T, studio *StudioService) string {
	t.Helper()
	ctx := context.Background()
	projects, err := studio.ListProjects(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(projects) == 0 {
		t.Fatal("expected seeded project")
	}
	_, pages, err := studio.GetProject(ctx, projects[0].ID)
	if err != nil {
		t.Fatalf("get project: %v", err)
	}
	if len(pages) == 0 {
		t.Fatal("expected seeded page")
	}
	return pages[0].ID
}

func waitForJob(t *testing.T, studio *StudioService, userID, jobID string) domain.GenerationJob {
	t.Helper()
	for i := 0; i < 40; i++ {
		job, err := studio.GetGenerationJobForUser(context.Background(), userID, jobID)
		if err == nil && (job.Status == "succeeded" || job.Status == "failed") {
			return job
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatal("timeout waiting for job " + jobID)
	return domain.GenerationJob{}
}


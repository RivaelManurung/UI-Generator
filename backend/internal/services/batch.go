package services

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/ai"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

// GenerationBatch is the live state of an async multi-page generation, polled by
// the frontend so generation can run in the background while the user navigates.
type GenerationBatch struct {
	ID        string             `json:"id"`
	ProjectID string             `json:"projectId"`
	Status    string             `json:"status"` // running | completed | failed
	Total     int                `json:"total"`
	Completed int                `json:"completed"`
	Pages     []GeneratedPageDTO `json:"pages"`
	Error     string             `json:"error,omitempty"`
	CreatedAt string             `json:"createdAt"`

	userID string // for ownership checks; not serialized
}

type batchTracker struct {
	mu      sync.RWMutex
	batches map[string]*GenerationBatch
}

func newBatchTracker() *batchTracker {
	return &batchTracker{batches: make(map[string]*GenerationBatch)}
}

func (t *batchTracker) put(b *GenerationBatch) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.batches[b.ID] = b
	// Best-effort cleanup of old finished batches to bound memory.
	for id, batch := range t.batches {
		if batch.Status != "running" && time.Since(parseISO(batch.CreatedAt)) > 30*time.Minute {
			delete(t.batches, id)
		}
	}
}

// snapshot returns a copy safe to serialize without holding the lock.
func (t *batchTracker) snapshot(id string) (GenerationBatch, bool) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	b, ok := t.batches[id]
	if !ok {
		return GenerationBatch{}, false
	}
	return *b, true
}

func (t *batchTracker) setTotal(id string, total int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if b, ok := t.batches[id]; ok {
		b.Total = total
	}
}

func (t *batchTracker) incCompleted(id string, page *GeneratedPageDTO) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if b, ok := t.batches[id]; ok {
		b.Completed++
		if page != nil {
			b.Pages = append(b.Pages, *page)
		}
	}
}

func (t *batchTracker) finish(id, status, errMsg string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if b, ok := t.batches[id]; ok {
		b.Status = status
		b.Error = errMsg
	}
}

func parseISO(s string) time.Time {
	tm, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return time.Now()
	}
	return tm
}

// StartGenerationBatch kicks off multi-page generation in the background and
// returns the initial batch state immediately. Generation continues server-side
// regardless of client navigation; progress is polled via GetBatch.
func (f *FrontendService) StartGenerationBatch(ctx context.Context, userID, projectID, idemKey string, in GenerateAppInput) (GenerationBatch, error) {
	project, err := f.s.projects.FindOwned(ctx, userID, projectID)
	if err != nil {
		return GenerationBatch{}, apperrors.NotFound("Project not found or you do not have access.")
	}

	batchID, err := newID()
	if err != nil {
		return GenerationBatch{}, err
	}
	// Total is unknown until the plan is resolved (Auto mode plans inside the
	// goroutine via an AI call), so start at 0 and set it once the plan is known.
	batch := &GenerationBatch{
		ID:        batchID,
		ProjectID: projectID,
		Status:    "running",
		Total:     0,
		Pages:     []GeneratedPageDTO{},
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		userID:    userID,
	}
	f.batches.put(batch)

	theme := f.normalizeTheme(ctx, in.ThemeSlug)
	domainName := project.Domain

	type planned struct {
		plan pagePlan
		slug string
		page string // page id
	}

	go func() {
		genCtx, cancel := context.WithTimeout(context.Background(), 300*time.Second)
		defer cancel()

		// Resolve the page plan: explicit count = fixed plan; Auto = the AI chooses
		// how many pages and which types (Stitch-like). This may itself be an AI call.
		plan := f.resolveAppPlan(genCtx, in, domainName)

		// Resolve/create a page per planned screen. Reuse by pageType (stable)
		// rather than slug, because each generation renames pages to the model's
		// brief-specific titles — keying on slug would orphan the renamed page and
		// create duplicates on every re-generation.
		existing, _ := f.s.pages.ListByOwnedProject(genCtx, userID, projectID)
		pageIDByType := map[string]string{}
		for _, p := range existing {
			if _, ok := pageIDByType[p.PageType]; !ok {
				pageIDByType[p.PageType] = p.ID
			}
		}
		items := make([]planned, 0, len(plan))
		for _, pp := range plan {
			pid, ok := pageIDByType[pp.PageType]
			if !ok {
				created, cerr := f.s.CreatePageForUser(genCtx, userID, projectID, CreatePageInput{Name: pp.Name, PageType: pp.PageType})
				if cerr != nil {
					continue
				}
				pid = created.ID
				pageIDByType[pp.PageType] = pid
			}
			items = append(items, planned{plan: pp, slug: slugify(pp.Name), page: pid})
		}
		if len(items) == 0 {
			f.batches.finish(batch.ID, "failed", "could not prepare any pages to generate")
			return
		}
		f.batches.setTotal(batch.ID, len(items))

		// Fail fast if the wallet can't cover every page (each page costs 1 credit) —
		// otherwise some pages get charged and the rest fail mid-batch.
		if wallet, werr := f.s.WalletForUser(genCtx, userID); werr == nil && wallet.Balance < len(items) {
			f.batches.finish(batch.ID, "failed", fmt.Sprintf("Not enough credits: this generation needs %d, you have %d.", len(items), wallet.Balance))
			return
		}

		// ONE WORKER PER PAGE, running concurrently: each page is generated by its
		// own provider call and completes independently, so the studio canvas fills
		// in screen-by-screen in real time (Stitch-like) instead of all-at-once.
		// Wall-clock ≈ the slowest single page rather than the sum. The wallet
		// deduction inside SavePageVersion serializes via SELECT … FOR UPDATE, so
		// concurrent persistence is safe.
		// Optional real image generation (off unless IMAGE_MODEL is configured);
		// otherwise renderers use content-relevant stock photos from the keywords.
		imageResolver := ai.NewImageResolver()

		const maxConcurrent = 4
		sem := make(chan struct{}, maxConcurrent)
		var wg sync.WaitGroup
		for _, it := range items {
			wg.Add(1)
			go func(it planned) {
				defer wg.Done()
				sem <- struct{}{}
				defer func() { <-sem }()

				// The page's own worker: generate just this screen's schema. Fall
				// back to the deterministic mock if the provider errors, so every
				// screen always resolves instead of hanging.
				ps, err := f.generatePageSchema(genCtx, in.Prompt, it.plan.PageType, domainName, theme)
				if err != nil {
					f.batches.incCompleted(batch.ID, nil)
					return
				}
				ps.PageType = it.plan.PageType
				imageResolver.Resolve(genCtx, &ps) // no-op when nil/disabled

				version, serr := f.s.SavePageVersion(genCtx, userID, it.page, in.Prompt, ps, theme)
				if serr != nil {
					f.batches.incCompleted(batch.ID, nil)
					return
				}
				// Use the model's brief-specific title as the page name so tabs/cards
				// show real modules ("Sales", "Inventory", …) not generic plan names.
				name, slug := it.plan.Name, it.slug
				if t := strings.TrimSpace(ps.Title); t != "" && len(t) <= 100 {
					if updated, uerr := f.s.UpdatePageForUser(genCtx, userID, it.page, UpdatePageInput{Name: t, PageType: it.plan.PageType}); uerr == nil {
						name, slug = updated.Name, updated.Slug
					}
				}
				dto := GeneratedPageDTO{
					ID:           it.page,
					Name:         name,
					Slug:         slug,
					PageType:     it.plan.PageType,
					QualityScore: round1(version.QualityScore),
					Schema:       schemaOrEmpty(version.SchemaJSON),
					Files:        versionFiles(version),
				}
				f.batches.incCompleted(batch.ID, &dto)
			}(it)
		}
		wg.Wait()
		f.batches.finish(batch.ID, "completed", "")
	}()

	return *batch, nil
}

// generatePageSchema is one page's worker: it asks the provider for just this
// screen's schema, falling back to the deterministic mock if the provider call
// fails so the screen always resolves.
func (f *FrontendService) generatePageSchema(ctx context.Context, prompt, pageType, domainName, theme string) (schema.PageSchema, error) {
	req := ai.GenerateRequest{Prompt: prompt, PageType: pageType, Domain: domainName, ThemeSlug: theme}
	if resp, err := f.s.aiProvider.GenerateSchema(ctx, req); err == nil {
		return resp.Schema, nil
	}
	mock, err := ai.NewMockProvider().GenerateSchema(ctx, req)
	if err != nil {
		return schema.PageSchema{}, err
	}
	return mock.Schema, nil
}

// GetBatch returns a batch snapshot if it belongs to the user.
func (f *FrontendService) GetBatch(userID, batchID string) (GenerationBatch, error) {
	b, ok := f.batches.snapshot(batchID)
	if !ok || b.userID != userID {
		return GenerationBatch{}, apperrors.NotFound("Generation batch not found.")
	}
	return b, nil
}

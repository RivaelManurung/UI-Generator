package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/kreasinusantara/ui-generator-backend/internal/ai"
	"github.com/kreasinusantara/ui-generator-backend/internal/designsystem"
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
	// StreamHtml is the renderable HTML-so-far of a code-gen screen being written
	// live (Stitch-style "building" preview). Empty unless a single mobile screen
	// is streaming. Not persisted — it's a transient live signal over SSE.
	StreamHtml string `json:"streamHtml,omitempty"`

	userID  string // for ownership checks; not serialized
	idemKey string // client idempotency key; not serialized
}

type batchTracker struct {
	mu      sync.RWMutex
	batches map[string]*GenerationBatch
}

func newBatchTracker() *batchTracker {
	return &batchTracker{batches: make(map[string]*GenerationBatch)}
}

// putReserve atomically inserts a new batch UNLESS a live/recent batch with the
// same user + idempotency key already exists — closing the check-then-insert
// race between two concurrent identical requests. Returns (existing, false) when
// a duplicate is found, or (new, true) after inserting.
func (t *batchTracker) putReserve(b *GenerationBatch) (GenerationBatch, bool) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if strings.TrimSpace(b.idemKey) != "" {
		for _, e := range t.batches {
			if e.userID == b.userID && e.idemKey == b.idemKey &&
				(e.Status == "running" || time.Since(parseISO(e.CreatedAt)) < 2*time.Minute) {
				return *e, false
			}
		}
	}
	t.batches[b.ID] = b
	for id, batch := range t.batches {
		if batch.Status != "running" && time.Since(parseISO(batch.CreatedAt)) > 30*time.Minute {
			delete(t.batches, id)
		}
	}
	return *b, true
}

// findByIdem returns an existing batch for this user + idempotency key that is
// still running OR finished within the last 2 minutes, so a duplicate request
// (retry, double-submit) returns the SAME batch instead of starting a second
// generation and charging the wallet again. Empty key never matches.
func (t *batchTracker) findByIdem(userID, idemKey string) (GenerationBatch, bool) {
	if strings.TrimSpace(idemKey) == "" {
		return GenerationBatch{}, false
	}
	t.mu.RLock()
	defer t.mu.RUnlock()
	for _, b := range t.batches {
		if b.userID != userID || b.idemKey != idemKey {
			continue
		}
		if b.Status == "running" || time.Since(parseISO(b.CreatedAt)) < 2*time.Minute {
			return *b, true
		}
	}
	return GenerationBatch{}, false
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

// setStream records the live HTML-so-far for a streaming code-gen screen.
func (t *batchTracker) setStream(id, html string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if b, ok := t.batches[id]; ok {
		b.StreamHtml = html
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

// parseISO parses a batch CreatedAt. On a malformed/empty value it returns the
// ZERO time (NOT time.Now): callers use it in `time.Since(...)` comparisons, and
// a zero time fails the dedup window (`< 2min` → false, so a bad timestamp never
// permanently locks a user's idem key) while passing cleanup (`> 30min` → true,
// so a bad entry is still evicted). time.Now() would invert both — a DoS.
func parseISO(s string) time.Time {
	tm, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return time.Time{}
	}
	return tm
}

// StartGenerationBatch kicks off multi-page generation in the background and
// returns the initial batch state immediately. Generation continues server-side
// regardless of client navigation; progress is polled via GetBatch.
func (f *FrontendService) StartGenerationBatch(ctx context.Context, userID, projectID, idemKey string, in GenerateAppInput) (GenerationBatch, error) {
	_, err := f.s.projects.FindOwned(ctx, userID, projectID)
	if err != nil {
		return GenerationBatch{}, apperrors.NotFound("Project not found or you do not have access.")
	}

	// IDEMPOTENCY fast-path (optimization only): a duplicate request with the same
	// client key returns the in-flight / just-finished batch instead of running a
	// second generation. The AUTHORITATIVE race-free guard is putReserve below
	// (atomic check+insert under the write lock); this read-locked pre-check just
	// avoids the platform query + id allocation on the common sequential retry.
	if existing, ok := f.batches.findByIdem(userID, idemKey); ok {
		return existing, nil
	}

	// The project's target platform ("web" | "mobile") branches the generated
	// layout. It lives outside the sqlc queries (like status), so read it raw.
	platform := "web"
	if f.s.pool != nil {
		var pf string
		if perr := f.s.pool.QueryRow(ctx, "SELECT platform FROM projects WHERE id=$1", projectID).Scan(&pf); perr == nil && pf != "" {
			platform = normalizePlatform(pf)
		}
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
		idemKey:   idemKey,
	}
	// DURABLE idempotency guard (survives restart + works across replicas): try to
	// reserve (user_id, idem_key) in the generation_batches table. On conflict a
	// batch already owns this key, so return its persisted state instead of running
	// (and charging) a second generation. This is the authoritative cross-process
	// guard; putReserve below is the in-process equivalent for pool==nil / speed.
	if f.s.pool != nil && strings.TrimSpace(idemKey) != "" {
		inserted, rerr := f.reserveBatchRow(ctx, batchID, userID, projectID, idemKey)
		if rerr == nil && !inserted {
			if existing, ok := f.dbBatchByIdem(userID, idemKey); ok {
				return existing, nil
			}
			if existing, ok := f.batches.findByIdem(userID, idemKey); ok {
				return existing, nil
			}
			// Conflict but we can't read it back — fail safe by NOT starting a new
			// charged generation.
			return GenerationBatch{}, apperrors.Conflict("A generation for this request is already in progress.")
		}
	}

	// Atomic in-process guard: if a concurrent identical request already reserved
	// this key in memory, return that batch instead of starting a second one.
	if existing, inserted := f.batches.putReserve(batch); !inserted {
		return existing, nil
	}

	theme := f.normalizeTheme(ctx, in.ThemeSlug)
	domainName := ""

	type planned struct {
		plan pagePlan
		slug string
		page string // page id
	}

	go func() {
		genCtx, cancel := context.WithTimeout(context.Background(), 300*time.Second)
		defer cancel()
		// Persist the FINAL batch state to the DB on any exit path (completed or
		// failed), so a post-restart duplicate request / poll reconstructs reality.
		defer f.persistBatchStatus(batch.ID)

		// Resolve the page plan: explicit count = fixed plan; Auto = the AI chooses
		// how many pages and which types (Stitch-like). This may itself be an AI call.
		plan := f.resolveAppPlan(genCtx, in, domainName)

		// Resolve/create a page per planned screen. Reuse by pageType (stable)
		// rather than slug, because each generation renames pages to the model's
		// brief-specific titles — keying on slug would orphan the renamed page and
		// create duplicates on every re-generation.
		existing, lerr := f.s.pages.ListByOwnedProject(genCtx, userID, projectID)
		if lerr != nil {
			f.batches.finish(batch.ID, "failed", "could not load existing project pages")
			return
		}
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
		f.persistBatchStatus(batch.ID)

		// Fail fast if the wallet can't cover every page (each page costs 1 credit) —
		// otherwise some pages get charged and the rest fail mid-batch.
		wallet, werr := f.s.WalletForUser(genCtx, userID)
		if werr != nil {
			f.batches.finish(batch.ID, "failed", "could not verify your credit balance")
			return
		}
		if wallet.Balance < len(items) {
			f.batches.finish(batch.ID, "failed", fmt.Sprintf("Not enough credits: this generation needs %d, you have %d.", len(items), wallet.Balance))
			return
		}

		// HYBRID page generation, tuned for a slow reasoning model:
		//  - Up to maxConcurrent pages → generate each page in PARALLEL (smaller,
		//    faster per-page calls; screens stream in one-by-one). Best wall-clock
		//    when the page count fits one concurrency wave.
		//  - More than that → ONE GenerateApp round-trip, so latency doesn't scale
		//    with the extra waves the parallel path would need.
		// GenerateApp fills any page the model omits, so schemaByType is best-effort;
		// a worker falls back to a per-page call for anything missing.
		const maxConcurrent = 4
		schemaByType := map[string]schema.PageSchema{}
		if len(items) > maxConcurrent {
			appPlan := make([]ai.AppPagePlan, 0, len(items))
			for _, it := range items {
				appPlan = append(appPlan, ai.AppPagePlan{Name: it.plan.Name, PageType: it.plan.PageType})
			}
			if appResp, aerr := f.s.aiProvider.GenerateApp(genCtx, ai.AppRequest{
				Prompt: in.Prompt, Domain: domainName, ThemeSlug: theme, Platform: platform, Pages: appPlan,
			}); aerr == nil {
				for _, pr := range appResp.Pages {
					schemaByType[strings.ToLower(strings.TrimSpace(pr.PageType))] = pr.Schema
				}
			}
		}

		// Each worker either reuses a GenerateApp page (large batches) or makes its
		// own per-page call (the common small-batch path: parallel + streaming).
		// The wallet deduction inside SavePageVersion serializes via SELECT … FOR
		// UPDATE, so concurrent persistence is safe. Optional real image generation
		// (off unless IMAGE_MODEL is configured) otherwise uses stock photos.
		imageResolver := ai.NewImageResolver()

		// MOBILE CODE-GEN (Stitch-style): when the provider can design a full screen
		// as self-contained HTML, mobile projects use that instead of the fixed
		// schema renderer — the model has total layout freedom, so output looks
		// hand-designed. Theme tokens are passed so the screen matches the picker.
		uiGen, hasUIGen := f.s.aiProvider.(ai.UIGenerator)
		uiStreamer, hasStreamer := f.s.aiProvider.(ai.UIStreamer)
		codeGenMobile := platform == "mobile" && hasUIGen
		// Stream the live "build" only for a SINGLE screen — concurrent streams
		// would fight over the one StreamHtml slot. Multi-screen mobile still
		// code-gens, just without the live token preview.
		streamSingle := codeGenMobile && hasStreamer && len(items) == 1
		// Tokens come from the design-system CATALOG (systems.json: shadcn, ios,
		// sunset, …) keyed by the RAW requested slug — NOT the normalized `theme`,
		// which is validated against the separate themes DB table and would demote
		// "ios" to "studio-neutral" → shadcn, baking the wrong colours into the HTML.
		tokenSlug := strings.TrimSpace(in.ThemeSlug)
		if tokenSlug == "" {
			tokenSlug = theme
		}
		themeTokens := designsystem.Get(tokenSlug).Tokens

		sem := make(chan struct{}, maxConcurrent)
		var wg sync.WaitGroup
		for _, it := range items {
			wg.Add(1)
			go func(it planned) {
				defer wg.Done()
				sem <- struct{}{}
				defer func() { <-sem }()

				var ps schema.PageSchema

				// Code-gen path: ask the model for a full HTML screen (streamed live
				// for a single screen, plain otherwise). Robust fallback chain:
				// stream → non-stream → schema renderer, so a streaming hiccup never
				// silently demotes the screen to the old schema look.
				if codeGenMobile {
					req := ai.UIRequest{Prompt: in.Prompt, PageType: it.plan.PageType, Tokens: themeTokens}
					// Hard cap a single code-gen call so it can never run away to the
					// 300s batch budget — falls through to schema if it blows it.
					cgCtx, cgCancel := context.WithTimeout(genCtx, 150*time.Second)
					var ui ai.UIResponse
					var uerr error
					if streamSingle {
						ui, uerr = uiStreamer.GenerateUIStream(cgCtx, req, func(html string) {
							f.batches.setStream(batch.ID, html)
						})
						if uerr != nil || strings.TrimSpace(ui.HTML) == "" {
							log.Printf("code-gen: stream failed for %q (err=%v, htmlLen=%d) — retrying non-stream", it.plan.PageType, uerr, len(ui.HTML))
							ui, uerr = uiGen.GenerateUI(cgCtx, req)
						}
						f.batches.setStream(batch.ID, "") // final page replaces the live stream
					} else {
						ui, uerr = uiGen.GenerateUI(cgCtx, req)
					}
					cgCancel()
					if uerr == nil && strings.TrimSpace(ui.HTML) != "" {
						ps = schema.PageSchema{
							PageType: it.plan.PageType,
							Domain:   "custom",
							Layout:   "mobile-app",
							Theme:    theme,
							Title:    it.plan.Name,
							Html:     ui.HTML,
						}
						if t := strings.TrimSpace(ui.Title); t != "" {
							ps.Title = t
						}
						log.Printf("code-gen: OK for %q (htmlLen=%d, streamed=%v)", it.plan.PageType, len(ui.HTML), streamSingle)
					} else {
						log.Printf("code-gen: FAILED for %q (err=%v) — falling back to schema renderer", it.plan.PageType, uerr)
					}
				}

				// Schema path (web, or mobile code-gen fallback): reuse a GenerateApp
				// page or make a per-page call.
				if strings.TrimSpace(ps.Html) == "" {
					s, ok := schemaByType[strings.ToLower(strings.TrimSpace(it.plan.PageType))]
					if !ok {
						var err error
						s, err = f.generatePageSchema(genCtx, in.Prompt, it.plan.PageType, domainName, theme, platform)
						if err != nil {
							f.batches.incCompleted(batch.ID, nil)
							return
						}
					}
					ps = s
					ps.PageType = it.plan.PageType
					// Guarantee the mobile target regardless of provider compliance: a phone
					// app screen is single-column with a bottom tab bar.
					if platform == "mobile" {
						enforceMobileSchema(&ps)
					}
				}
				imageResolver.Resolve(genCtx, &ps) // no-op when nil/disabled or html-only

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

// enforceMobileSchema makes a generated schema render as a native phone screen:
// a "mobile-app" shell (single column, bottom tab bar in the preview compiler)
// with every section stacked full-width. Auth pages keep their centered card —
// the preview ignores the shell for login/register/forgot regardless of layout.
func enforceMobileSchema(ps *schema.PageSchema) {
	if ps == nil {
		return
	}
	ps.Layout = "mobile-app"
	// An auth screen is a single full-screen card — leave it as one section.
	isAuth := ps.PageType == "login" || ps.PageType == "register" || ps.PageType == "forgot"
	for i := range ps.Sections {
		ps.Sections[i].Span = "full"
		// A phone list shows at most 3 columns (title, optional subtitle, status).
		if ps.Sections[i].Type == "dataTable" && len(ps.Sections[i].Columns) > 3 {
			ps.Sections[i].Columns = ps.Sections[i].Columns[:3]
			for r := range ps.Sections[i].Rows {
				if len(ps.Sections[i].Rows[r]) > 3 {
					ps.Sections[i].Rows[r] = ps.Sections[i].Rows[r][:3]
				}
			}
		}
	}
	// Cap a phone screen to ~5 sections so it stays focused, never a stacked
	// desktop dashboard. Auth screens are already a single section.
	if !isAuth && len(ps.Sections) > 5 {
		ps.Sections = ps.Sections[:5]
	}
	// Clamp the bottom tab bar to 5 short destinations.
	if len(ps.Nav) > 5 {
		ps.Nav = ps.Nav[:5]
	}
}

// generatePageSchema is one page's worker: it asks the provider for just this
// screen's schema, falling back to the deterministic mock if the provider call
// fails so the screen always resolves.
func (f *FrontendService) generatePageSchema(ctx context.Context, prompt, pageType, domainName, theme, platform string) (schema.PageSchema, error) {
	req := ai.GenerateRequest{Prompt: prompt, PageType: pageType, Domain: domainName, ThemeSlug: theme, Platform: platform}
	if resp, err := f.s.aiProvider.GenerateSchema(ctx, req); err == nil {
		return resp.Schema, nil
	}
	mock, err := ai.NewMockProvider().GenerateSchema(ctx, req)
	if err != nil {
		return schema.PageSchema{}, err
	}
	return mock.Schema, nil
}

// GetBatch returns a batch snapshot if it belongs to the user. After a restart
// the in-memory tracker is empty, so it falls back to the persisted batch row
// (reconstructing pages from the project) — the polling/SSE client keeps working.
func (f *FrontendService) GetBatch(userID, batchID string) (GenerationBatch, error) {
	if b, ok := f.batches.snapshot(batchID); ok && b.userID == userID {
		return b, nil
	}
	if b, ok := f.dbBatchByID(userID, batchID); ok {
		return b, nil
	}
	return GenerationBatch{}, apperrors.NotFound("Generation batch not found.")
}

// detachedCtx is a short-lived context for the DB writes/reads that must run
// independently of a possibly-cancelled request/generation context.
func detachedCtx() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 5*time.Second)
}

// reserveBatchRow atomically inserts the batch row, returning true when WE own
// the new row and false when a row for (user_id, idem_key) already exists.
func (f *FrontendService) reserveBatchRow(ctx context.Context, batchID, userID, projectID, idemKey string) (bool, error) {
	var got string
	err := f.s.pool.QueryRow(ctx, `
		INSERT INTO generation_batches (id, user_id, project_id, idem_key, status, total, completed, created_at, updated_at)
		VALUES ($1, $2, $3, $4, 'running', 0, 0, now(), now())
		ON CONFLICT (user_id, idem_key) WHERE idem_key <> '' DO NOTHING
		RETURNING id`, batchID, userID, projectID, idemKey).Scan(&got)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil // conflict — a batch already owns this key
	}
	if err != nil {
		return true, err // unknown DB error — caller treats as "proceed" (fail open)
	}
	return true, nil // inserted — new batch
}

// persistBatchStatus mirrors the in-memory batch state to its DB row so a poll
// or duplicate request after a restart reconstructs the real status/progress.
func (f *FrontendService) persistBatchStatus(batchID string) {
	if f.s.pool == nil {
		return
	}
	b, ok := f.batches.snapshot(batchID)
	if !ok {
		return
	}
	ctx, cancel := detachedCtx()
	defer cancel()
	_, _ = f.s.pool.Exec(ctx, `
		UPDATE generation_batches SET status=$2, total=$3, completed=$4, error=$5, updated_at=now()
		WHERE id=$1`, batchID, b.Status, b.Total, b.Completed, b.Error)
}

// dbBatchByIdem reconstructs the batch a (user, idem_key) maps to from the DB.
func (f *FrontendService) dbBatchByIdem(userID, idemKey string) (GenerationBatch, bool) {
	if f.s.pool == nil {
		return GenerationBatch{}, false
	}
	ctx, cancel := detachedCtx()
	defer cancel()
	var id, projectID, status, errMsg string
	var total, completed int
	var createdAt time.Time
	row := f.s.pool.QueryRow(ctx, `
		SELECT id, project_id, status, total, completed, error, created_at
		FROM generation_batches WHERE user_id=$1 AND idem_key=$2`, userID, idemKey)
	if err := row.Scan(&id, &projectID, &status, &total, &completed, &errMsg, &createdAt); err != nil {
		return GenerationBatch{}, false
	}
	return f.reconstructBatch(ctx, userID, id, projectID, status, errMsg, total, completed, createdAt), true
}

// dbBatchByID reconstructs a batch by id (used by GetBatch after a restart).
func (f *FrontendService) dbBatchByID(userID, batchID string) (GenerationBatch, bool) {
	if f.s.pool == nil {
		return GenerationBatch{}, false
	}
	ctx, cancel := detachedCtx()
	defer cancel()
	var projectID, status, errMsg string
	var total, completed int
	var createdAt time.Time
	row := f.s.pool.QueryRow(ctx, `
		SELECT project_id, status, total, completed, error, created_at
		FROM generation_batches WHERE id=$1 AND user_id=$2`, batchID, userID)
	if err := row.Scan(&projectID, &status, &total, &completed, &errMsg, &createdAt); err != nil {
		return GenerationBatch{}, false
	}
	return f.reconstructBatch(ctx, userID, batchID, projectID, status, errMsg, total, completed, createdAt), true
}

// reconstructBatch builds a GenerationBatch from a persisted row, filling Pages
// from the project's current pages. A row stuck "running" after a restart (its
// goroutine died) is reported as completed with whatever pages persisted, so the
// client is never left polling a dead batch forever.
func (f *FrontendService) reconstructBatch(ctx context.Context, userID, id, projectID, status, errMsg string, total, completed int, createdAt time.Time) GenerationBatch {
	pages, _ := f.ProjectPages(ctx, userID, projectID)
	if status == "running" && time.Since(createdAt) > 6*time.Minute {
		// The generation timeout is 300s; anything older is an orphan from a restart.
		status = "completed"
		if len(pages) > 0 {
			completed = len(pages)
			if total < completed {
				total = completed
			}
		} else {
			status = "failed"
			if errMsg == "" {
				errMsg = "generation was interrupted"
			}
		}
	}
	return GenerationBatch{
		ID:        id,
		ProjectID: projectID,
		Status:    status,
		Total:     total,
		Completed: completed,
		Pages:     pages,
		Error:     errMsg,
		CreatedAt: createdAt.UTC().Format(time.RFC3339),
		userID:    userID,
	}
}

package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/metrics"
	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

// OpenAIProvider talks to any OpenAI-compatible Chat Completions API
// (OpenAI, CommandCode at https://api.commandcode.ai/provider/v1, OpenRouter,
// local gateways, …). Configure via AI_PROVIDER=openai|commandcode plus the
// OPENAI_* env vars.
type OpenAIProvider struct {
	apiKey     string
	baseURL    string
	model      string
	httpClient *http.Client
}

func NewOpenAIProvider(apiKey, baseURL, model string) *OpenAIProvider {
	if strings.TrimSpace(baseURL) == "" {
		baseURL = "https://api.openai.com/v1"
	}
	if strings.TrimSpace(model) == "" {
		model = "gpt-4o-mini"
	}
	return &OpenAIProvider{
		apiKey:  apiKey,
		baseURL: strings.TrimRight(baseURL, "/"),
		model:   model,
		// Reasoning models (MiniMax-M3) generating a full multi-page app in one
		// call can run well past 60s; the per-request ctx still bounds the inline
		// route, so this only raises the ceiling for the background batch path.
		// Configurable via OPENAI_TIMEOUT_SECONDS (default 180s) so slow/fast
		// gateways can be tuned without a rebuild.
		httpClient: &http.Client{Timeout: openAITimeout()},
	}
}

// openAITimeout reads OPENAI_TIMEOUT_SECONDS (default 180s, clamped 30-600s).
func openAITimeout() time.Duration {
	secs := 180
	if v := strings.TrimSpace(os.Getenv("OPENAI_TIMEOUT_SECONDS")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			secs = n
		}
	}
	if secs < 30 {
		secs = 30
	}
	if secs > 600 {
		secs = 600
	}
	return time.Duration(secs) * time.Second
}

type oaiMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type oaiRequest struct {
	Model       string       `json:"model"`
	Messages    []oaiMessage `json:"messages"`
	Temperature float64      `json:"temperature"`
	MaxTokens   int          `json:"max_tokens,omitempty"`
	Stream      bool         `json:"stream,omitempty"`
}

type oaiResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (p *OpenAIProvider) complete(ctx context.Context, systemPrompt, userPrompt string, temperature float64, maxTokens int) (string, error) {
	var err error
	defer func() {
		if err != nil {
			metrics.IncAIFailure()
		}
	}()

	// Defensive clamp: <=0 means an unset caller; cap at 1.0 so a high creative
	// roll never trips providers that reject extreme temperatures.
	if temperature <= 0 {
		temperature = 0.7
	}
	if temperature > 1.0 {
		temperature = 1.0
	}

	// Token budget per call. IMPORTANT: a reasoning model (MiniMax-M3) spends a
	// large part of the budget on a hidden <think> block BEFORE the JSON, so the
	// ceiling must be generous or the actual JSON gets truncated → invalid → a
	// costly retry. The ceiling is not a target: a model that finishes early stops
	// early, so a high ceiling does NOT slow it down — it only prevents truncation.
	if maxTokens <= 0 {
		maxTokens = 32768
	}
	if maxTokens > 32768 {
		maxTokens = 32768
	}
	reqBody := oaiRequest{
		Model:       p.model,
		Temperature: temperature, // rolled per call by the variation engine; a calmer retry recovers any malformed JSON
		MaxTokens:   maxTokens,
		Messages: []oaiMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
	}
	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	url := p.baseURL + "/chat/completions"
	var lastErr error
	// One initial try + one calm retry. The caller (GenerateSchema/GenerateApp)
	// adds its own outer variation retry, so a deeper nested retry here just
	// multiplies latency on a slow reasoning model for little extra resilience.
	const maxRetries = 1

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if cerr := ctx.Err(); cerr != nil {
			return "", cerr
		}
		if attempt > 0 {
			backoff := time.Duration(math.Pow(2, float64(attempt-1))) * time.Second
			jitter := time.Duration(rand.Intn(400)) * time.Millisecond
			select {
			case <-ctx.Done():
				return "", ctx.Err()
			case <-time.After(backoff + jitter):
			}
		}

		req, rerr := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(bodyBytes))
		if rerr != nil {
			return "", fmt.Errorf("failed to create request: %w", rerr)
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+p.apiKey)

		resp, derr := p.httpClient.Do(req)
		if derr != nil {
			lastErr = derr
			continue
		}
		respBytes, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			lastErr = readErr
			continue
		}

		if resp.StatusCode == http.StatusOK {
			var parsed oaiResponse
			if uerr := json.Unmarshal(respBytes, &parsed); uerr != nil {
				return "", fmt.Errorf("failed to parse completion response: %w", uerr)
			}
			if parsed.Error != nil && parsed.Error.Message != "" {
				err = apperrors.Internal("AI provider error: " + parsed.Error.Message)
				return "", err
			}
			if len(parsed.Choices) == 0 {
				err = errors.New("empty completion from AI provider")
				return "", err
			}
			return parsed.Choices[0].Message.Content, nil
		}

		lastErr = fmt.Errorf("AI provider returned status %d: %s", resp.StatusCode, string(respBytes))
		// Don't retry on client/auth errors.
		if resp.StatusCode == http.StatusBadRequest ||
			resp.StatusCode == http.StatusUnauthorized ||
			resp.StatusCode == http.StatusForbidden ||
			resp.StatusCode == http.StatusNotFound {
			err = apperrors.Internal(fmt.Sprintf("AI provider error: status %d", resp.StatusCode))
			return "", err
		}
	}
	err = fmt.Errorf("AI provider request failed after retries: %w", lastErr)
	return "", err
}

// completeStream runs a streaming chat completion (Server-Sent Events). It
// accumulates the delta content and invokes onChunk(accumulated) as tokens
// arrive, returning the full text. Bounded by ctx (no client total timeout, so
// a long stream isn't cut off mid-generation). No retries — the caller falls
// back to the non-streaming path on error.
func (p *OpenAIProvider) completeStream(ctx context.Context, systemPrompt, userPrompt string, temperature float64, maxTokens int, onChunk func(accumulated string)) (string, error) {
	if temperature <= 0 {
		temperature = 0.7
	}
	if temperature > 1.0 {
		temperature = 1.0
	}
	reqBody := oaiRequest{
		Model:       p.model,
		Temperature: temperature,
		MaxTokens:   maxTokens,
		Stream:      true,
		Messages: []oaiMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
	}
	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.apiKey)
	req.Header.Set("Accept", "text/event-stream")

	// Streaming spans the whole generation; rely on ctx (not a client timeout).
	streamClient := &http.Client{}
	resp, err := streamClient.Do(req)
	if err != nil {
		metrics.IncAIFailure()
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		metrics.IncAIFailure()
		return "", fmt.Errorf("AI provider stream returned status %d: %s", resp.StatusCode, string(b))
	}

	var sb strings.Builder
	reader := bufio.NewReader(resp.Body)
	for {
		if ctx.Err() != nil {
			return sb.String(), ctx.Err()
		}
		line, rerr := reader.ReadString('\n')
		if s := strings.TrimSpace(line); strings.HasPrefix(s, "data:") {
			data := strings.TrimSpace(s[5:])
			if data == "[DONE]" {
				return sb.String(), nil
			}
			var chunk struct {
				Choices []struct {
					FinishReason *string `json:"finish_reason"`
					Delta        struct {
						Content string `json:"content"`
					} `json:"delta"`
				} `json:"choices"`
			}
			if json.Unmarshal([]byte(data), &chunk) == nil {
				// A terminal chunk has empty choices (just usage) — the stream is
				// done even if the server never sends an explicit [DONE] and keeps
				// the connection open (which would otherwise block ReadString).
				if len(chunk.Choices) == 0 {
					return sb.String(), nil
				}
				if c := chunk.Choices[0].Delta.Content; c != "" {
					sb.WriteString(c)
					if onChunk != nil {
						onChunk(sb.String())
					}
				}
				// finish_reason set → generation is complete; stop reading.
				if fr := chunk.Choices[0].FinishReason; fr != nil && *fr != "" {
					return sb.String(), nil
				}
			}
		}
		if rerr != nil {
			break // EOF or read error → end of stream
		}
	}
	return sb.String(), nil
}

func (p *OpenAIProvider) GenerateSchema(ctx context.Context, request GenerateRequest) (GenerateResponse, error) {
	// Roll a fresh creative direction each call so the SAME brief produces a
	// distinct design every time (Stitch-like). The 2-attempt loop means the
	// higher creative temperature never increases the malformed-JSON → mock
	// fallback rate: a calmer retry recovers the rare broken response.
	var lastErr error
	for attempt := 0; attempt < 2; attempt++ {
		if cerr := ctx.Err(); cerr != nil {
			return GenerateResponse{}, cerr
		}
		v := newVariation()
		if attempt > 0 {
			v.Temperature = 0.6 // calmer retry to recover valid JSON
		}
		content, err := p.complete(ctx, schemaSystemPrompt(), schemaUserPrompt(request, v), v.Temperature, 32768)
		if err != nil {
			lastErr = err
			log.Printf("GenerateSchema: provider call failed (attempt %d): %v", attempt+1, err)
			continue
		}
		pageSchema, perr := parseSchemaJSON(content)
		if perr != nil {
			lastErr = perr
			log.Printf("GenerateSchema: parse/guardrail failed (attempt %d): %v", attempt+1, perr)
			continue
		}
		return GenerateResponse{
			Schema:       pageSchema,
			ProviderName: "openai",
			Metadata:     map[string]string{"model": p.model, "baseUrl": p.baseURL, "variation": fmt.Sprintf("%d", v.Seed%100000)},
		}, nil
	}
	return GenerateResponse{}, lastErr
}

func (p *OpenAIProvider) RefineSection(ctx context.Context, request RefineRequest) (GenerateResponse, error) {
	schemaBytes, err := json.Marshal(request.Schema)
	if err != nil {
		return GenerateResponse{}, fmt.Errorf("failed to marshal base schema: %w", err)
	}
	system := "You are a senior dashboard UI generator. You refine one section of a page schema JSON per the user's wish and return the FULL updated page schema JSON only. No markdown, no prose."
	user := fmt.Sprintf("Current page schema:\n%s\n\nRefine the section at index %d per this wish: %q.\nReturn the full modified page schema JSON; keep all other sections unchanged.",
		string(schemaBytes), request.SectionIndex, request.Prompt)

	// Refine must be precise (apply the wish, change nothing else), so use a low
	// temperature — variation belongs to fresh generation, not edits.
	content, err := p.complete(ctx, system, user, 0.4, 32768)
	if err != nil {
		return GenerateResponse{}, err
	}
	pageSchema, err := parseSchemaJSON(content)
	if err != nil {
		return GenerateResponse{}, err
	}
	return GenerateResponse{
		Schema:       pageSchema,
		ProviderName: "openai",
		Metadata:     map[string]string{"model": p.model, "baseUrl": p.baseURL},
	}, nil
}

// GenerateApp produces all requested pages in ONE provider round-trip so total
// latency does not scale with page count. Any page the model omits or returns
// invalid is filled deterministically by the template engine, so it never fails.
func (p *OpenAIProvider) GenerateApp(ctx context.Context, request AppRequest) (AppResponse, error) {
	domainName := strings.TrimSpace(request.Domain)
	if domainName == "" {
		domainName = "custom"
	}
	out := AppResponse{ProviderName: "openai"}

	// LLMs intermittently emit structurally broken JSON (mismatched brackets),
	// which no extraction can repair and which forces a full mock fallback. A
	// single retry recovers nearly all of these for the cost of one extra call
	// only on failure — far cheaper than shipping a mock page to the user.
	var parsed []schema.PageSchema
	for attempt := 0; attempt < 2; attempt++ {
		v := newVariation()
		if attempt > 0 {
			v.Temperature = 0.6 // calmer retry to recover valid JSON
		}
		content, err := p.complete(ctx, appSystemPrompt(), appUserPrompt(request, v), v.Temperature, 32768)
		if err != nil {
			log.Printf("GenerateApp: provider call failed (attempt %d): %v", attempt+1, err)
			continue
		}
		parsed = parseAppPages(content)
		// Count pages that both parse AND satisfy the guardrails; retry if none.
		valid := 0
		for _, ps := range parsed {
			if ValidateGeneratedSchema(ps) == nil {
				valid++
			}
		}
		if valid > 0 {
			break
		}
		log.Printf("GenerateApp: no valid pages on attempt %d (parsed=%d), retrying", attempt+1, len(parsed))
	}

	byType := map[string]schema.PageSchema{}
	for _, ps := range parsed {
		if verr := ValidateGeneratedSchema(ps); verr == nil {
			byType[strings.ToLower(strings.TrimSpace(ps.PageType))] = ps
		} else {
			log.Printf("GenerateApp: page %q rejected by guardrails: %v", ps.PageType, verr)
		}
	}

	for i, plan := range request.Pages {
		var ps schema.PageSchema
		if v, ok := byType[strings.ToLower(strings.TrimSpace(plan.PageType))]; ok {
			ps = v
		} else if i < len(parsed) && ValidateGeneratedSchema(parsed[i]) == nil {
			ps = parsed[i]
		} else {
			// Deterministic fallback for any page the model missed/botched.
			ps = buildSchema(request.Prompt, plan.PageType, domainName, request.ThemeSlug, request.Platform)
		}
		ps.PageType = plan.PageType
		out.Pages = append(out.Pages, AppPageResult{Name: plan.Name, PageType: plan.PageType, Schema: ps})
	}
	return out, nil
}

// PlanApp asks the model to choose the page set for the brief (Auto mode). It is
// a cheap, short call (just names + types) made before GenerateApp fills them in.
func (p *OpenAIProvider) PlanApp(ctx context.Context, prompt, domain string) ([]AppPagePlan, error) {
	system := "You are a senior product designer planning the screens of a web app. Plan the pages the BRIEF actually asks for — never force a dashboard onto a brief that is not about one. Respond with ONLY a valid minified JSON array, no markdown, no prose."
	user := fmt.Sprintf(`Decide the smallest COHERENT set of pages for this app brief. Choose 1 to 5 pages.
Brief: %q
Domain: %q

Rules:
- Each page MUST use a DISTINCT "pageType" from this set ONLY: "dashboard","list","detail","form","analytics","login","register","forgot".
- Lead with the page the brief is MOST about: an auth brief leads with "login"; an admin/reporting brief leads with "dashboard". Do NOT add a "dashboard" unless the brief is actually about one.
- If the brief is an authentication flow, return ONLY the auth pages it names: "login", "register", "forgot" (each as its own page) — no dashboard, list or analytics.
- Only add a page the brief actually justifies — do NOT pad to 5. A simple brief may be 1-2 pages.
- "name" is a short, brief-specific screen title (e.g. "Sales Overview", "Welcome Back", "Create Account").

Output ONLY this JSON array (most to least important):
[{"name":"...","pageType":"..."}]`, prompt, domain)

	// Page planning should be stable (a fixed page set for a given brief), so
	// keep it low-temperature — variation happens when filling each page. It only
	// returns a tiny JSON array of names, so a small token budget keeps it fast.
	content, err := p.complete(ctx, system, user, 0.4, 8000)
	if err != nil {
		return nil, err
	}
	text := cleanJSON(content) // strips <think> + extracts the balanced JSON array
	var raw []struct {
		Name     string `json:"name"`
		PageType string `json:"pageType"`
	}
	if uerr := json.Unmarshal([]byte(text), &raw); uerr != nil {
		return nil, fmt.Errorf("plan parse failed: %w", uerr)
	}
	plans := make([]AppPagePlan, 0, len(raw))
	for _, r := range raw {
		if strings.TrimSpace(r.PageType) == "" {
			continue
		}
		plans = append(plans, AppPagePlan{Name: strings.TrimSpace(r.Name), PageType: strings.TrimSpace(r.PageType)})
	}
	return plans, nil
}

// GenerateUI designs a full mobile screen as self-contained HTML (Stitch-style
// code-gen): the model has total layout freedom instead of filling a fixed
// schema, so the output looks hand-designed. The markup renders raw inside the
// preview's sandboxed iframe (allow-scripts, no same-origin → isolated).
func (p *OpenAIProvider) GenerateUI(ctx context.Context, request UIRequest) (UIResponse, error) {
	system, user := buildUIPrompts(request)
	content, err := p.complete(ctx, system, user, 0.75, 8000)
	if err != nil {
		return UIResponse{}, err
	}
	html := extractHTML(content)
	if len(strings.TrimSpace(html)) < 80 {
		return UIResponse{}, errors.New("empty or too-short UI from provider")
	}
	return UIResponse{HTML: html}, nil
}

// GenerateUIStream is GenerateUI with live token streaming: as the screen is
// written, onPartial(html) fires with the renderable HTML-so-far (only once the
// <style> block is closed, so the preview never flashes unstyled), throttled to
// avoid flooding. Returns the final cleaned HTML. Falls back to the caller's
// non-streaming path on error.
func (p *OpenAIProvider) GenerateUIStream(ctx context.Context, request UIRequest, onPartial func(html string)) (UIResponse, error) {
	system, user := buildUIPrompts(request)
	lastLen := 0
	full, err := p.completeStream(ctx, system, user, 0.75, 8000, func(acc string) {
		if onPartial == nil {
			return
		}
		partial := stripReasoning(acc)
		// Hold rendering until the styles are closed → clean build, no unstyled flash.
		if !strings.Contains(partial, "</style>") {
			return
		}
		partial = strings.TrimSpace(partial)
		partial = strings.TrimPrefix(partial, "```html")
		partial = strings.TrimPrefix(partial, "```")
		if i := strings.Index(partial, "<style"); i > 0 {
			partial = partial[i:]
		}
		// Throttle: only forward after meaningful growth.
		if len(partial)-lastLen < 140 {
			return
		}
		lastLen = len(partial)
		onPartial(partial)
	})
	if err != nil && strings.TrimSpace(full) == "" {
		return UIResponse{}, err
	}
	html := extractHTML(full)
	if len(strings.TrimSpace(html)) < 80 {
		return UIResponse{}, errors.New("empty or too-short UI from provider")
	}
	return UIResponse{HTML: html}, nil
}

// buildUIPrompts builds the (system, user) prompt pair for mobile code-gen,
// shared by GenerateUI and GenerateUIStream.
func buildUIPrompts(request UIRequest) (string, string) {
	t := request.Tokens
	tok := func(k, d string) string {
		if v, ok := t[k]; ok && strings.TrimSpace(v) != "" {
			return v
		}
		return d
	}
	palette := fmt.Sprintf("primary=%s; primaryText=%s; background=%s; card=%s; text=%s; mutedText=%s; border=%s; accent=%s; radius=%s; fontFamily=%s",
		tok("primary", "#0a84ff"), tok("primary-fg", "#ffffff"), tok("content-bg", "#f2f2f7"), tok("card", "#ffffff"),
		tok("fg", "#1c1c1e"), tok("muted-fg", "#8e8e93"), tok("border", "#e5e5ea"), tok("accent", "#e7f0ff"),
		tok("radius", "20px"), tok("font", "-apple-system,system-ui,sans-serif"))

	system := "You are an elite mobile product designer and front-end engineer. You produce ONE pixel-perfect, native-feeling MOBILE APP screen as a SINGLE self-contained HTML fragment with an embedded <style> block. Output ONLY the HTML — no markdown, no code fences, no commentary, and no <html>/<head>/<body>/<script> tags. Write the <style> block FIRST, then the markup. Think BRIEFLY, then write the code directly — do not over-deliberate."

	user := fmt.Sprintf(`Design a NATIVE MOBILE APP screen (iOS/Android quality, like Google Stitch) for this brief.
Brief: %q
Screen type: %q

THEME — use these EXACT colours/shape, match precisely:
%s

OUTPUT CONTRACT:
- Output ONE <style> block (all rules scoped under .screen) FIRST, immediately followed by ONE root <div class="screen">…</div>. NOTHING else, no markdown.
- NO external CSS/JS, NO Tailwind, NO CDN, NO <script>. Plain modern CSS only. Every icon is an INLINE stroke <svg> (22-24px).
- 390px wide, ONE vertical column, a real app screen — NOT a website. Generous padding, rounded corners (theme radius), soft shadows, strong hierarchy, calm spacing rhythm.

LAYOUT top→bottom: (1) status bar (time left; signal/wifi/battery right). (2) app bar: brand name + round notification icon. (3) big bold title + one muted subtitle. (4) the content the brief asks for as native cards. (5) a bottom TAB BAR with 4-5 inline-svg+label items, first active in the primary colour.

NATIVE QUALITY (this is what separates it from a website):
- TRANSACTIONS / LISTS → tappable rows: rounded leading icon/avatar + two-line title/subtitle (e.g. "Starbucks" / "Food & Dining · Today") + right-aligned amount. Real currency ("Rp 65.000", "-Rp 49.000"); positive amounts green, negative neutral/red.
- QUICK ACTIONS → a horizontal row of 4 round-icon + label tiles (e.g. Transfer, Top Up, Pay Bills, Withdraw).
- BALANCE/HERO → a prominent card with a big number ("Rp 24.500.000"), a small delta line, 1-2 pill buttons.
- CHARTS → a clean inline-SVG line/area sparkline, never a heavy axis grid.
- Realistic, specific copy in the SAME LANGUAGE as the brief. Never lorem ipsum, never empty placeholder boxes.

KEEP IT FOCUSED & COMPACT: 4-6 sections total, concise CSS (group selectors, no redundancy), at most ~6 inline SVG icons reused via a small set. The whole output must be a tight, complete screen — finish it; do not pad or repeat.

Return ONLY the <style> + <div class="screen">…</div>.`, request.Prompt, request.PageType, palette)
	return system, user
}

// extractHTML pulls the screen markup out of a model response: strips <think>
// reasoning and markdown fences, removes any <script> blocks (defensive — the
// screen is static and we inject our own reveal animation), and trims to the
// first style/markup tag through the last closing tag.
func extractHTML(content string) string {
	text := stripReasoning(strings.TrimSpace(content))
	if strings.Contains(text, "```") {
		text = strings.TrimSpace(text)
		for _, fence := range []string{"```html", "```HTML", "```Html", "```"} {
			text = strings.TrimPrefix(text, fence)
		}
		if j := strings.LastIndex(text, "```"); j >= 0 {
			text = text[:j]
		}
		text = strings.TrimSpace(text)
	}
	// Drop any <script>…</script> blocks (and stray unterminated ones).
	text = stripTagBlocks(text, "script")
	// Trim to the first meaningful markup tag.
	start := -1
	for _, tag := range []string{"<style", "<div", "<section", "<main", "<header"} {
		if k := strings.Index(text, tag); k >= 0 && (start < 0 || k < start) {
			start = k
		}
	}
	if start > 0 {
		text = text[start:]
	}
	if end := strings.LastIndex(text, "</div>"); end >= 0 {
		text = text[:end+len("</div>")]
	}
	return strings.TrimSpace(text)
}

// stripTagBlocks removes every <tag…>…</tag> region (case-insensitive) plus any
// trailing unterminated opener.
func stripTagBlocks(s, tag string) string {
	lower := strings.ToLower(s)
	open, close := "<"+tag, "</"+tag+">"
	for {
		i := strings.Index(lower, open)
		if i < 0 {
			break
		}
		j := strings.Index(lower[i:], close)
		if j < 0 {
			s = s[:i]
			break
		}
		end := i + j + len(close)
		s = s[:i] + s[end:]
		lower = strings.ToLower(s)
	}
	return s
}

func appSystemPrompt() string {
	return "You are a senior UI/Dashboard generator. You design a multi-page dashboard app. Respond with ONLY valid minified JSON — no markdown, no code fences, no commentary."
}

func appUserPrompt(request AppRequest, v variation) string {
	platformBlock, _, _, _ := platformGuide(request.Platform)
	var b strings.Builder
	fmt.Fprintf(&b, "Generate a coherent multi-page %s as JSON for this brief.\nBrief: %q\nDomain: %q\nThemeSlug: %q\n\n%s\n\n",
		map[bool]string{true: "MOBILE APP (each page is a phone screen)", false: "dashboard app"}[strings.EqualFold(strings.TrimSpace(request.Platform), "mobile")],
		request.Prompt, request.Domain, request.ThemeSlug, platformBlock)
	b.WriteString("Produce EXACTLY these pages, in this order. Each page MUST cover a DISTINCT module/feature area of the brief — never repeat the same data, metrics, or table across pages:\n")
	for i, p := range request.Pages {
		fmt.Fprintf(&b, "%d) pageType=%q (default role: %s) — %s\n", i+1, p.PageType, p.Name, requirementsFor(p.PageType))
	}
	b.WriteString(`
Each page object MUST be: {"pageType":"...","domain":"` + request.Domain + `","layout":"admin-sidebar | top-nav","theme":"` + request.ThemeSlug + `","title":"...","brand":"<product name>","nav":["<product-specific menu>"...],"sections":[ ... ]}
- "brand": the product/app NAME from the brief (same on every page). "nav": 4-7 PRODUCT-SPECIFIC menu items derived from the brief (same on every page) — NEVER a generic ["Dashboard","Analytics","Customers","Projects","Reports"] list. "layout": pick "admin-sidebar" for data/ops apps or "top-nav" for portals/marketing/consumer apps (same on every page).
Allowed section "type" values: statsGrid, chartPanel, dataTable, activityTimeline, filterToolbar, formSection, profileSummary, tabbedContent, notificationList, emptyState, actionFooter, progressList, kanbanBoard, calendarView, mapPanel, stepper, authForm. For a "login", "register" or "forgot" pageType, use a single "authForm" (its fields/title/actions match that auth page). Choose the components each page actually needs from the brief — do NOT repeat a fixed KPI+chart+table skeleton.
- statsGrid.items[]: {label,value,trend,icon,spark:[6-12 numbers]} (4-6 items). The "spark" array is the metric's recent trend — make it agree with "trend" (rising if +, falling if -).
- chartPanel: {title,chartType:"bar|line|area|donut|stacked",categories:[x-axis labels],series:[[numbers]]}. series is REQUIRED real data: one inner array per line/bar set (use ONE inner array for bar/line/area/donut, 2-3 for stacked/multi). categories.length MUST equal each series length. Use believable domain numbers, NOT round placeholders.
- dataTable: {title,columns[],rows[][]} (>=2 columns, >=5 realistic rows; include at least one numeric column). filterToolbar: {searchPlaceholder,filters[],primaryAction}. formSection: {title,fields[{label,type}],submitLabel} (>=4 fields). actionFooter: {primaryAction,actions[]}. profileSummary: {title,entity,properties{}} (>=4 properties). activityTimeline: {title,items[{label,value}]} (>=3 items). progressList/stepper: {title,items[{label,value}]} (value is a % or short status). EVERY section must be fully populated — NEVER emit an empty section.
- DENSITY: each page should have 4-6 populated sections so it feels like a real production screen, not a sparse demo.
- "title" MUST be a short, specific module name taken from the brief (e.g. the sales / inventory / finance / HR area it represents) — NEVER a generic word like "Overview", "Dashboard", "Records", "Detail", or "Form". If the brief lists modules, use them as the page titles.
- Write every label/metric/column/row in the SAME LANGUAGE as the brief.
- COMPOSITION: give EACH section a "span" of "full" | "two-thirds" | "half" | "third" so sections form a real magazine-style grid, NOT a single stacked column. Place related sections side by side — e.g. a "two-thirds" chartPanel next to a "third" activityTimeline/notificationList; two "half" panels in one row; "full" for statsGrid and wide dataTables. VARY the composition between pages so no two pages share the same skeleton.
Tailor all labels/metrics/columns/rows to the brief and domain (specific, realistic).

Output ONLY this JSON object:
{"pages":[ <page1>, <page2>, ... ]}`)
	b.WriteString(v.directive())
	return b.String()
}

// stripReasoning removes <think>...</think> blocks that reasoning models
// (e.g. MiniMax-M3 via TokenRouter) emit before the actual JSON. Those blocks
// themselves contain JSON-like braces (the model restates the requested shape),
// which would otherwise fool both the first-brace/last-brace scan and
// extractBalanced into grabbing fragments from inside the reasoning.
func stripReasoning(text string) string {
	for {
		open := strings.Index(text, "<think>")
		if open < 0 {
			break
		}
		end := strings.Index(text, "</think>")
		if end < 0 {
			// Unterminated (truncated) reasoning — drop everything from <think> on.
			text = text[:open]
			break
		}
		text = text[:open] + text[end+len("</think>"):]
	}
	return strings.TrimSpace(text)
}

func cleanJSON(content string) string {
	text := stripReasoning(strings.TrimSpace(content))
	if strings.HasPrefix(text, "```") {
		text = strings.TrimPrefix(text, "```json")
		text = strings.TrimPrefix(text, "```")
		text = strings.TrimSuffix(text, "```")
		text = strings.TrimSpace(text)
	}
	if b := extractBalanced(text); b != "" {
		return b
	}
	return text
}

// extractBalanced returns the first complete, balanced JSON value (object or
// array) in text — scanning from the first opening bracket to its MATCHING
// close, while skipping string literals. This is more robust than "first
// bracket → last bracket": models at higher temperature sometimes append a
// second array/object or stray tokens after the JSON (e.g. `{...}[...]`), which
// the naive approach swallowed, producing "invalid character '[' after array
// element" and a full fallback to mock.
func extractBalanced(text string) string {
	start := strings.IndexAny(text, "{[")
	if start < 0 {
		return ""
	}
	open := text[start]
	close := byte('}')
	if open == '[' {
		close = ']'
	}
	depth := 0
	inStr := false
	esc := false
	for i := start; i < len(text); i++ {
		c := text[i]
		if inStr {
			switch {
			case esc:
				esc = false
			case c == '\\':
				esc = true
			case c == '"':
				inStr = false
			}
			continue
		}
		switch c {
		case '"':
			inStr = true
		case open:
			depth++
		case close:
			depth--
			if depth == 0 {
				return text[start : i+1]
			}
		}
	}
	return text[start:] // unbalanced (likely truncated) — let the caller try
}

func parseAppPages(content string) []schema.PageSchema {
	text := cleanJSON(content)
	var wrap struct {
		Pages []schema.PageSchema `json:"pages"`
	}
	if err := json.Unmarshal([]byte(text), &wrap); err != nil {
		log.Printf("parseAppPages: wrap unmarshal error: %v", err)
	} else if len(wrap.Pages) > 0 {
		return wrap.Pages
	}
	var arr []schema.PageSchema
	if err := json.Unmarshal([]byte(text), &arr); err != nil {
		log.Printf("parseAppPages: array unmarshal error: %v", err)
	} else if len(arr) > 0 {
		return arr
	}
	return nil
}

// ---- shared schema prompt + parsing (used by OpenAI-compatible providers) ----

func schemaSystemPrompt() string {
	return "You are a senior UI/Dashboard generator. You convert a product brief into a strictly-validated dashboard page schema. Respond with ONLY valid minified JSON — no markdown, no code fences, no commentary."
}

func requirementsFor(pageType string) string {
	switch strings.ToLower(strings.TrimSpace(pageType)) {
	case "list":
		return `This is a "list" page: it MUST include a "filterToolbar" AND a "dataTable" (with >=2 columns and several realistic rows).`
	case "form":
		return `This is a "form" page: it MUST include a "formSection" (with a "fields" array) AND an "actionFooter".`
	case "detail":
		return `This is a "detail" page: it MUST include a "profileSummary" (renders an avatar image) AND at least one of "tabbedContent" or "activityTimeline". A "gallery" or "featureGrid" makes it richer.`
	case "analytics":
		return `This is an "analytics" page: it MUST include "statsGrid" (with icons), "filterToolbar", "chartPanel", AND "dataTable". Add a second chartPanel or a "featureGrid" of insights for depth.`
	case "login":
		return `This is a "login" page: it MUST include an "authForm" (centered sign-in card). Set its title, subtitle, fields (email + password), primaryAction (e.g. "Sign in"), and actions (e.g. ["Forgot password?","Don't have an account? Sign up"]).`
	case "register":
		return `This is a "register" page: it MUST include an "authForm" (centered card). Set its title (e.g. "Create Account"), subtitle, fields (full name + email + password + confirm password), primaryAction (e.g. "Create account"), and actions (e.g. ["Already have an account? Sign in"]).`
	case "forgot":
		return `This is a "forgot" password page: it MUST include an "authForm" (centered card). Set its title (e.g. "Reset Password"), a short subtitle explaining an email reset link, ONE field (email), primaryAction (e.g. "Send reset link"), and actions (e.g. ["Back to login"]).`
	default:
		return `This is a "dashboard" page. For PRODUCTION density it MUST include ALL of: a "statsGrid" (4-6 KPI items, each with an icon), a "chartPanel", a "dataTable" (>=2 columns and >=5 realistic rows), AND an "activityTimeline" (>=3 items). Strongly consider opening with a "hero" and adding a "featureGrid" or "gallery" so the page feels rich and complete. Every section must be fully populated — NEVER emit an empty section.`
	}
}

// platformGuide returns the target-specific design constraints injected into the
// schema prompt. Mobile forces a single-column, bottom-tab, touch-first app shell;
// web keeps the desktop sidebar / top-nav, multi-column behaviour.
func platformGuide(platform string) (block, layoutRule, layoutShape, compositionRule string) {
	if strings.EqualFold(strings.TrimSpace(platform), "mobile") {
		block = `TARGET PLATFORM: MOBILE APP (≈390px wide phone screen).
Design a NATIVE MOBILE app screen, NOT a shrunk website. The renderer turns your sections into native patterns, so pick sections that map to them:
- The whole screen is ONE vertical column. NEVER use a side navigation / admin sidebar. EVERY section MUST use "span":"full".
- Keep it FOCUSED: 3-5 sections only, most important first (thumb-reachable).
- "statsGrid" renders as a horizontal METRIC SCROLLER — use 2-4 short metrics (the first is a hero card). Not a wide KPI wall.
- "dataTable" renders as a tappable LIST of rows — keep it to AT MOST 3 columns: column 1 = the row title, an optional column 2 = a short subtitle, the last column = a status pill or a single value. No wide spreadsheets.
- "filterToolbar" renders as a SEGMENTED PILL control — provide 2-4 short "filters" (e.g. ["All","Active","Pending"]); do NOT rely on a search box.
- The primary create action becomes a FLOATING ACTION BUTTON — express it as a section "primaryAction" containing a word like "Create"/"Add"/"New". Do not add inline toolbar buttons.
- Good mobile sections: hero (greeting/balance card), statsGrid (metric scroller), dataTable (list rows), featureGrid (quick actions), formSection, authForm. Avoid chartPanel-heavy or table-heavy desktop layouts.
- Navigation is a BOTTOM TAB BAR: keep "nav" to EXACTLY 4-5 SHORT ONE-WORD labels (e.g. ["Home","Orders","Wallet","Profile"]).
- For a login/register/forgot pageType, emit ONE authForm — it renders as a full-screen native sign-in screen (full-width inputs, a pinned primary button, a single "Continue with Google" button), so do NOT add other sections.`
		layoutRule = `- "layout": MUST be "mobile-app" (this is a phone app screen — single column, bottom tab bar, no sidebar).`
		layoutShape = "mobile-app"
		compositionRule = `- COMPOSITION: this is a phone screen — give EVERY section "span":"full". Do NOT use "two-thirds", "half" or "third"; everything stacks in one column.`
		return
	}
	block = `TARGET PLATFORM: WEBSITE (desktop-first, ≥1280px). Use the full canvas: sidebars, top navs, and multi-column magazine grids are all in play.`
	layoutRule = `- "layout": choose the shell that fits the product — "admin-sidebar" for data/ops-heavy apps (dashboards, tables, CRMs), or "top-nav" for lighter portals, marketing, catalogs, or consumer apps. Pick deliberately from the brief; do NOT default to one.`
	layoutShape = "admin-sidebar | top-nav"
	compositionRule = `- COMPOSITION: give EACH section a "span" of "full" | "two-thirds" | "half" | "third" so the page forms a real magazine-style grid, not one stacked column. VARY it for THIS brief: pair a "two-thirds" chart with a "third" side panel; put two "half" panels in a row; use "full" for hero, statsGrid, galleries and wide tables. Avoid making every section "full".`
	return
}

func schemaUserPrompt(request GenerateRequest, v variation) string {
	platformBlock, layoutRule, layoutShape, compositionRule := platformGuide(request.Platform)
	return fmt.Sprintf(`Generate a dashboard page schema as JSON for this brief.
Brief: %q
PageType: %q
Domain: %q
ThemeSlug: %q

%s

%s

Rules:
- Output a single JSON object, no markdown, no commentary.
%s
- "brand": the product/app NAME inferred from the brief (e.g. "Vaultstream", "MediTrack"), NOT a generic word.
- "nav": 4-7 PRODUCT-SPECIFIC menu items for THIS product's primary navigation, derived from the brief — e.g. a fintech → ["Overview","Transactions","Cards","Payouts","Disputes","Settings"]; a clinic → ["Dashboard","Patients","Appointments","Doctors","Billing"]. NEVER a generic ["Dashboard","Analytics","Customers","Projects","Reports"] list.
- DESIGN PER PROMPT: the section MIX, ORDER, and COMPOSITION must reflect THIS brief — two different briefs must NOT produce the same skeleton. Choose the components the product actually needs (a kanban tool leads with a board, an analytics tool with charts, a catalog with a gallery), not a fixed KPI+chart+table template.
- Be GENEROUS and rich: use 4-7 sections of VARIED types so the page feels like a real, polished product screen (think Stitch / Linear / Vercel quality) — never a sparse 2-section skeleton.
- "sections" use ONLY these "type" values: statsGrid, chartPanel, dataTable, activityTimeline, filterToolbar, formSection, profileSummary, tabbedContent, notificationList, emptyState, actionFooter, hero, gallery, featureGrid, pricingTable, testimonials, stepper, progressList, mapPanel, kanbanBoard, calendarView, authForm.
- authForm: { "type":"authForm", "title":..., "subtitle":..., "fields":[{ "label":"Email","type":"email" },{ "label":"Password","type":"password" }], "primaryAction":"Sign in", "actions":["Forgot password?","Don't have an account? Sign up"] } — a centered SaaS auth card (logo, show-password toggle, and a "Continue with Google" button are added automatically). For a "login", "register" or "forgot" pageType, use ONE authForm as the only section, with the fields/title/actions appropriate to that page.
- statsGrid: { "type":"statsGrid", "items":[{ "label":..., "value":..., "trend":..., "icon":"<icon>", "spark":[6-12 numbers] }] } (>= 3 items). ALWAYS set "icon". "spark" is the metric's recent trend series — make it rise when "trend" is positive and fall when negative.
- chartPanel: { "type":"chartPanel", "title":..., "chartType":"bar|line|area|donut|stacked", "categories":[x-axis labels], "series":[[numbers]] }. "series" is REQUIRED real data (one inner array per line/bar; 2-3 inner arrays only for "stacked"). categories.length MUST equal each series length. Use believable, domain-specific numbers — never flat or round placeholders.
- dataTable: { "type":"dataTable", "title":..., "columns":[...], "rows":[[...]] } (>= 2 columns, realistic example rows).
- filterToolbar: { "type":"filterToolbar", "searchPlaceholder":..., "filters":[...], "primaryAction":... }.
- formSection: { "type":"formSection", "title":..., "fields":[{ "label":..., "type":... }], "submitLabel":... }.
- actionFooter: { "type":"actionFooter", "primaryAction":..., "actions":[...] }.
- profileSummary: { "type":"profileSummary", "title":..., "entity":..., "properties":{...} } (an avatar IMAGE is rendered automatically from "entity").
- hero: { "type":"hero", "title":..., "subtitle":..., "primaryAction":..., "actions":[...], "image":"<2-4 keyword phrase>" } — a banner with headline + copy + CTA + a relevant photo. The "image" keywords drive a CONTENT-MATCHED photo (e.g. "modern coffee shop", "dental clinic", "fashion boutique"). Great as the FIRST section.
- gallery: { "type":"gallery", "title":..., "items":[{ "label":<caption>, "value":<meta>, "image":"<2-4 keyword phrase>" }] } (>= 3 items) — an image card grid; set "image" keywords on EACH item so each photo matches its caption.
- featureGrid: { "type":"featureGrid", "title":..., "items":[{ "label":<feature>, "value":<description>, "icon":"<icon>" }] } (>= 3 items) — icon + title + description cards.
- pricingTable: { "type":"pricingTable", "title":..., "primaryAction":<CTA>, "items":[{ "label":<plan>, "value":<price>, "trend":<tagline or "Most popular"> }] } (>= 2 tiers) — pricing cards; mark the recommended tier's "trend" with "Most popular".
- testimonials: { "type":"testimonials", "title":..., "items":[{ "label":<person name>, "value":<quote>, "trend":<role/company> }] } (>= 2) — quote cards with auto avatar.
- stepper: { "type":"stepper", "title":..., "items":[{ "label":<step title>, "value":<step detail> }] } (>= 2) — numbered onboarding/process steps.
- progressList: { "type":"progressList", "title":..., "items":[{ "label":<name>, "value":<a percentage like 92 pct> }] } (>= 2) — labelled progress bars (value should contain a percentage number).
- mapPanel: { "type":"mapPanel", "title":..., "items":[{ "label":<location>, "value":<detail> }] } (>= 2) — a map-style panel with a location list (for branches, delivery zones, stores).
- kanbanBoard: { "type":"kanbanBoard", "title":..., "columns":[<stage>...], "items":[{ "label":<task>, "value":<meta> }] } — cards distributed across the columns.
- calendarView: { "type":"calendarView", "title":..., "items":[{ "label":<event>, "value":<when> }] } — a month grid with events.
- ICONS: every statsGrid item and featureGrid item MUST include an "icon" chosen from: activity, users, user, calendar, wallet, dollar, credit-card, trending-up, trending-down, box, cart, bag, bar, line, pie, clock, bell, check, alert, settings, search, file, mail, home, star, heart, eye, layers, building, truck, zap, shield, globe, target, phone, link, tag, filter, download, upload, message, lock, gift, percent, refresh, briefcase, pin, edit, send. Pick the one that best fits the metric/feature.
- chartPanel "chartType" can be: "bar", "line", "area", "pie", "donut", "stacked" (stacked bars), or "multiline" (multiple trend lines). Choose what fits the data.
- IMAGES: hero, gallery, and profileSummary render real photos automatically. ALWAYS set concise "image" keywords (in English, 2-4 words describing the subject) on hero and on each gallery item so the photos are relevant to the brief. Prefer including at least one image-forward section (hero or gallery) when the brief suits it (landing, product, profile, catalog, media).
%s
- Tailor every label, metric, column, row, caption and icon to the brief and domain (realistic, specific data).

Shape (set "layout", "brand", "nav" yourself per the rules above):
{"pageType":%q,"domain":%q,"layout":%q,"theme":%q,"title":"...","brand":"...","nav":["...","..."],"sections":[ ... ]}`,
		request.Prompt, request.PageType, request.Domain, request.ThemeSlug,
		platformBlock,
		requirementsFor(request.PageType),
		layoutRule,
		compositionRule,
		request.PageType, request.Domain, layoutShape, request.ThemeSlug) + v.directive()
}

func parseSchemaJSON(content string) (schema.PageSchema, error) {
	text := stripReasoning(strings.TrimSpace(content))
	// Strip markdown fences if the model added them despite instructions.
	if strings.HasPrefix(text, "```") {
		text = strings.TrimPrefix(text, "```json")
		text = strings.TrimPrefix(text, "```")
		text = strings.TrimSuffix(text, "```")
		text = strings.TrimSpace(text)
	}
	// Extract the outermost JSON object if the model wrapped it in prose.
	if start := strings.Index(text, "{"); start > 0 {
		if end := strings.LastIndex(text, "}"); end >= start {
			text = text[start : end+1]
		}
	}

	var pageSchema schema.PageSchema
	if err := json.Unmarshal([]byte(text), &pageSchema); err != nil {
		return schema.PageSchema{}, apperrors.Validation("AI generated invalid JSON layout schema")
	}
	// Domain is an optional display/nav hint now — default it so an omission never
	// fails the guardrail (which previously forced slow, pointless regeneration).
	if strings.TrimSpace(pageSchema.Domain) == "" {
		pageSchema.Domain = "custom"
	}
	if err := ValidateGeneratedSchema(pageSchema); err != nil {
		return schema.PageSchema{}, apperrors.Validation(fmt.Sprintf("AI schema failed guardrail checks: %v", err))
	}
	return pageSchema, nil
}

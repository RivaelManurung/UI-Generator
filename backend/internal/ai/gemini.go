package ai

import (
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
	"strings"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/metrics"
	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

type GeminiProvider struct {
	apiKey     string
	httpClient *http.Client
	modelName  string
}

func NewGeminiProvider(apiKey string) *GeminiProvider {
	return &GeminiProvider{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
		modelName: "gemini-2.0-flash",
	}
}

// Gemini request payloads
type geminiPart struct {
	Text string `json:"text"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiGenerationConfig struct {
	ResponseMimeType string `json:"responseMimeType,omitempty"`
}

type geminiRequest struct {
	Contents         []geminiContent        `json:"contents"`
	GenerationConfig geminiGenerationConfig `json:"generationConfig,omitempty"`
}

// Gemini response payloads
type geminiCandidatePart struct {
	Text string `json:"text"`
}

type geminiCandidate struct {
	Content struct {
		Parts []geminiCandidatePart `json:"parts"`
	} `json:"content"`
}

type geminiResponse struct {
	Candidates []geminiCandidate `json:"candidates"`
}

func (p *GeminiProvider) executeWithRetry(ctx context.Context, systemPrompt, userPrompt string) (res []byte, err error) {
	defer func() {
		if err != nil {
			metrics.IncAIFailure()
		}
	}()

	reqBody := geminiRequest{
		Contents: []geminiContent{
			{
				Parts: []geminiPart{
					{Text: systemPrompt},
					{Text: userPrompt},
				},
			},
		},
		GenerationConfig: geminiGenerationConfig{
			ResponseMimeType: "application/json",
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal Gemini request: %w", err)
	}

	apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", p.modelName, p.apiKey)

	var lastErr error
	maxRetries := 3

	for attempt := 0; attempt <= maxRetries; attempt++ {
		// Respect context cancellation
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		if attempt > 0 {
			// Backoff: 1s, 2s, 4s with jitter
			backoff := time.Duration(math.Pow(2, float64(attempt-1))) * time.Second
			jitter := time.Duration(rand.Intn(500)) * time.Millisecond
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(backoff + jitter):
			}
		}

		req, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewReader(bodyBytes))
		if err != nil {
			return nil, fmt.Errorf("failed to create http request: %w", err)
		}
		req.Header.Set("Content-Type", "application/json")

		log.Printf("Sending request to Gemini API (attempt %d)", attempt+1)
		resp, err := p.httpClient.Do(req)
		if err != nil {
			lastErr = err
			log.Printf("Gemini request failed: %v", err)
			continue // retry on transport errors
		}

		defer resp.Body.Close()

		respBytes, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			lastErr = readErr
			continue
		}

		if resp.StatusCode == http.StatusOK {
			return respBytes, nil
		}

		// Handle non-200 responses
		lastErr = fmt.Errorf("Gemini API returned status %d: %s", resp.StatusCode, string(respBytes))
		log.Printf("Gemini API error: %v", lastErr)

		// Do NOT retry for bad requests, unauthorized, forbidden (client/auth errors)
		if resp.StatusCode == http.StatusBadRequest ||
			resp.StatusCode == http.StatusUnauthorized ||
			resp.StatusCode == http.StatusForbidden ||
			resp.StatusCode == http.StatusNotFound {
			return nil, apperrors.Internal(fmt.Sprintf("Gemini integration error: status %d", resp.StatusCode))
		}

		// Retry for transient errors like 429 Rate Limit, 500, 503, etc.
	}

	return nil, fmt.Errorf("failed to execute Gemini request after retries: %w", lastErr)
}

func (p *GeminiProvider) GenerateSchema(ctx context.Context, request GenerateRequest) (GenerateResponse, error) {
	systemPrompt := "You are a senior UI/Dashboard Generator Platform AI. You receive user layout wishes and generate a clean, validated page schema JSON. Your response must be only valid JSON. Do not include markdown blocks like ```json."
	userPrompt := fmt.Sprintf(`Generate a page schema in JSON.
Prompt: %q
PageType: %q
Domain: %q
ThemeSlug: %q

The output JSON must strictly comply with the following structure:
{
  "pageType": %q,
  "domain": %q,
  "layout": "admin-sidebar",
  "theme": %q,
  "title": "A descriptive title",
  "sections": [
    {
      "type": "statsGrid|chartPanel|dataTable|activityTimeline|filterToolbar|formSection|profileSummary|tabbedContent",
      "title": "Section Title",
      "items": [], // list of metric items for statsGrid/activityTimeline
      "chartType": "bar|line|pie", // for chartPanel
      "columns": [], // for dataTable
      "rows": [[]], // for dataTable
      "fields": [], // for formSection
      "submitLabel": "Submit" // for formSection
    }
  ]
}
`, request.Prompt, request.PageType, request.Domain, request.ThemeSlug, request.PageType, request.Domain, request.ThemeSlug)

	respBytes, err := p.executeWithRetry(ctx, systemPrompt, userPrompt)
	if err != nil {
		return GenerateResponse{}, err
	}

	var geminiResp geminiResponse
	if err := json.Unmarshal(respBytes, &geminiResp); err != nil {
		return GenerateResponse{}, fmt.Errorf("failed to parse Gemini response payload: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return GenerateResponse{}, errors.New("empty response content from Gemini API")
	}

	jsonText := geminiResp.Candidates[0].Content.Parts[0].Text
	// Clean markdown block wrappers if model ignores the instruction
	jsonText = strings.TrimPrefix(strings.TrimSpace(jsonText), "```json")
	jsonText = strings.TrimSuffix(jsonText, "```")
	jsonText = strings.TrimSpace(jsonText)

	var pageSchema schema.PageSchema
	if err := json.Unmarshal([]byte(jsonText), &pageSchema); err != nil {
		return GenerateResponse{}, apperrors.Validation("AI generated invalid JSON layout schema")
	}

	// Output guardrail validation
	if err := ValidateGeneratedSchema(pageSchema); err != nil {
		return GenerateResponse{}, apperrors.Validation(fmt.Sprintf("AI schema failed guardrail checks: %v", err))
	}

	return GenerateResponse{
		Schema:       pageSchema,
		ProviderName: "gemini",
		Metadata: map[string]string{
			"model": p.modelName,
		},
	}, nil
}

func (p *GeminiProvider) GenerateApp(ctx context.Context, request AppRequest) (AppResponse, error) {
	domainName := strings.TrimSpace(request.Domain)
	if domainName == "" {
		domainName = "custom"
	}
	out := AppResponse{ProviderName: "gemini"}
	for _, plan := range request.Pages {
		resp, err := p.GenerateSchema(ctx, GenerateRequest{
			Prompt:    request.Prompt,
			PageType:  plan.PageType,
			Domain:    request.Domain,
			ThemeSlug: request.ThemeSlug,
		})
		ps := resp.Schema
		if err != nil {
			ps = buildSchema(request.Prompt, plan.PageType, domainName, request.ThemeSlug)
		}
		ps.PageType = plan.PageType
		out.Pages = append(out.Pages, AppPageResult{Name: plan.Name, PageType: plan.PageType, Schema: ps})
	}
	return out, nil
}

func (p *GeminiProvider) RefineSection(ctx context.Context, request RefineRequest) (GenerateResponse, error) {
	schemaBytes, err := json.Marshal(request.Schema)
	if err != nil {
		return GenerateResponse{}, fmt.Errorf("failed to marshal base schema: %w", err)
	}

	systemPrompt := "You are a senior UI/Dashboard Generator Platform AI. You refine a specific section of a page schema JSON according to the user's prompt. Your response must be the full updated page schema JSON. Only return valid JSON."
	userPrompt := fmt.Sprintf(`Here is the current page schema:
%s

Refine section at index %d according to the user wish:
Wish: %q

Return the full modified page schema JSON. The rest of the sections must remain untouched.`, string(schemaBytes), request.SectionIndex, request.Prompt)

	respBytes, err := p.executeWithRetry(ctx, systemPrompt, userPrompt)
	if err != nil {
		return GenerateResponse{}, err
	}

	var geminiResp geminiResponse
	if err := json.Unmarshal(respBytes, &geminiResp); err != nil {
		return GenerateResponse{}, fmt.Errorf("failed to parse Gemini response payload: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return GenerateResponse{}, errors.New("empty response content from Gemini API")
	}

	jsonText := geminiResp.Candidates[0].Content.Parts[0].Text
	jsonText = strings.TrimPrefix(strings.TrimSpace(jsonText), "```json")
	jsonText = strings.TrimSuffix(jsonText, "```")
	jsonText = strings.TrimSpace(jsonText)

	var pageSchema schema.PageSchema
	if err := json.Unmarshal([]byte(jsonText), &pageSchema); err != nil {
		return GenerateResponse{}, apperrors.Validation("AI generated invalid JSON layout schema during refinement")
	}

	// Output guardrail validation
	if err := ValidateGeneratedSchema(pageSchema); err != nil {
		return GenerateResponse{}, apperrors.Validation(fmt.Sprintf("AI refined schema failed guardrail checks: %v", err))
	}

	return GenerateResponse{
		Schema:       pageSchema,
		ProviderName: "gemini",
		Metadata: map[string]string{
			"model": p.modelName,
		},
	}, nil
}

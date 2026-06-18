package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

// ImageResolver optionally replaces hero/gallery image KEYWORDS with REAL
// generated image URLs via an OpenAI-compatible images endpoint (e.g. TokenRouter
// /v1/images/generations). It is OFF unless IMAGE_MODEL is set — by default the
// renderers fall back to content-relevant stock photos, so there is no extra cost
// or latency. The resulting URL flows through unchanged because the renderers'
// photoFor() passes any http(s) value straight to the <img src>.
type ImageResolver struct {
	apiKey  string
	baseURL string
	model   string
	http    *http.Client

	mu    sync.Mutex
	cache map[string]string
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

// NewImageResolver returns nil (disabled) unless IMAGE_MODEL is configured.
func NewImageResolver() *ImageResolver {
	model := strings.TrimSpace(os.Getenv("IMAGE_MODEL"))
	if model == "" {
		return nil
	}
	base := strings.TrimRight(firstNonEmpty(os.Getenv("IMAGE_BASE_URL"), os.Getenv("OPENAI_BASE_URL"), "https://api.tokenrouter.com/v1"), "/")
	key := firstNonEmpty(os.Getenv("IMAGE_API_KEY"), os.Getenv("OPENAI_API_KEY"), os.Getenv("TOKENROUTER_API_KEY"), os.Getenv("OPENROUTER_API_KEY"), os.Getenv("NINEROUTER_API_KEY"))
	return &ImageResolver{
		apiKey:  key,
		baseURL: base,
		model:   model,
		http:    &http.Client{Timeout: 60 * time.Second},
		cache:   map[string]string{},
	}
}

type imageGenResponse struct {
	Data []struct {
		URL string `json:"url"`
	} `json:"data"`
}

func (r *ImageResolver) gen(ctx context.Context, prompt, size string) string {
	prompt = strings.TrimSpace(prompt)
	if prompt == "" {
		return ""
	}
	r.mu.Lock()
	if u, ok := r.cache[prompt]; ok {
		r.mu.Unlock()
		return u
	}
	r.mu.Unlock()

	body, _ := json.Marshal(map[string]any{"model": r.model, "prompt": prompt, "size": size, "n": 1})
	req, err := http.NewRequestWithContext(ctx, "POST", r.baseURL+"/images/generations", bytes.NewReader(body))
	if err != nil {
		return ""
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+r.apiKey)
	resp, err := r.http.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ""
	}
	var parsed imageGenResponse
	if json.NewDecoder(resp.Body).Decode(&parsed) != nil || len(parsed.Data) == 0 {
		return ""
	}
	url := parsed.Data[0].URL
	if !strings.HasPrefix(strings.ToLower(url), "http") {
		return "" // only hosted URLs are usable (data: is rejected downstream)
	}
	r.mu.Lock()
	r.cache[prompt] = url
	r.mu.Unlock()
	return url
}

// Resolve generates real images for hero + gallery sections, replacing their
// keyword "image" hint with a hosted URL. Best-effort: any failure leaves the
// keyword in place so the renderer falls back to a stock photo.
func (r *ImageResolver) Resolve(ctx context.Context, ps *schema.PageSchema) {
	if r == nil {
		return
	}
	for i := range ps.Sections {
		s := &ps.Sections[i]
		switch s.Type {
		case "hero":
			if u := r.gen(ctx, firstNonEmpty(s.Image, s.Title), "1024x768"); u != "" {
				s.Image = u
			}
		case "gallery":
			for j := range s.Items {
				if u := r.gen(ctx, firstNonEmpty(s.Items[j].Image, s.Items[j].Label), "768x512"); u != "" {
					s.Items[j].Image = u
				}
			}
		}
	}
}

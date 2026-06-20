package ai

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// TestCompleteStreamParsesSSE feeds a fake OpenAI-style SSE stream and verifies
// completeStream accumulates the delta content and fires onChunk progressively.
func TestCompleteStreamParsesSSE(t *testing.T) {
	chunks := []string{"<sty", "le>.screen{}", "</style>", `<div class="screen">Hi</div>`}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		fl, _ := w.(http.Flusher)
		for _, c := range chunks {
			b, _ := json.Marshal(c)
			_, _ = w.Write([]byte("data: {\"choices\":[{\"delta\":{\"content\":" + string(b) + "}}]}\n\n"))
			if fl != nil {
				fl.Flush()
			}
		}
		_, _ = w.Write([]byte("data: [DONE]\n\n"))
		if fl != nil {
			fl.Flush()
		}
	}))
	defer srv.Close()

	p := NewOpenAIProvider("key", srv.URL, "model")
	var partials []string
	full, err := p.completeStream(context.Background(), "sys", "usr", 0.7, 1000, func(acc string) {
		partials = append(partials, acc)
	})
	if err != nil {
		t.Fatalf("completeStream error: %v", err)
	}
	want := strings.Join(chunks, "")
	if full != want {
		t.Fatalf("full mismatch:\n got %q\nwant %q", full, want)
	}
	if len(partials) != len(chunks) {
		t.Fatalf("expected %d onChunk calls, got %d", len(chunks), len(partials))
	}
	// onChunk is cumulative and monotonically growing; the last equals the full text.
	if partials[len(partials)-1] != full {
		t.Fatalf("last partial %q != full %q", partials[len(partials)-1], full)
	}
	if !strings.Contains(full, "</style>") || !strings.Contains(full, `class="screen"`) {
		t.Fatalf("full missing expected markup: %q", full)
	}
}

// TestCompleteStreamTerminatesWithoutDone verifies the stream ends on a terminal
// finish_reason / empty-choices chunk even when the server never sends [DONE]
// and keeps the connection open (the tokenrouter/MiniMax behaviour that hung us).
func TestCompleteStreamTerminatesWithoutDone(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		fl, _ := w.(http.Flusher)
		_, _ = w.Write([]byte(`data: {"choices":[{"delta":{"content":"<style></style><div class=\"screen\">done</div>"}}]}` + "\n\n"))
		if fl != nil {
			fl.Flush()
		}
		// terminal: finish_reason set, then a usage-only chunk. NO [DONE].
		_, _ = w.Write([]byte(`data: {"choices":[{"finish_reason":"stop","delta":{"content":""}}]}` + "\n\n"))
		if fl != nil {
			fl.Flush()
		}
		// Keep the connection open briefly to prove we don't block on it.
		// (httptest closes when the handler returns; the point is the loop must
		// have already returned on finish_reason, not waited for the close.)
	}))
	defer srv.Close()

	p := NewOpenAIProvider("key", srv.URL, "model")
	ctx, cancel := context.WithTimeout(context.Background(), 3*1e9) // 3s guard
	defer cancel()
	full, err := p.completeStream(ctx, "s", "u", 0.7, 1000, nil)
	if err != nil {
		t.Fatalf("completeStream error: %v", err)
	}
	if !strings.Contains(full, `class="screen"`) || !strings.Contains(full, "done") {
		t.Fatalf("unexpected full: %q", full)
	}
}

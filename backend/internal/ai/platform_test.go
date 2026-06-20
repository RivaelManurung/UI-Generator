package ai

import (
	"context"
	"strings"
	"testing"
)

// The mock provider (the deterministic fallback used when no external LLM is
// configured or when one errors) must honour the platform target so a mobile
// project always renders as a phone app, not a shrunk desktop layout.
func TestMockProviderMobilePlatform(t *testing.T) {
	tests := []struct {
		name        string
		platform    string
		wantLayout  string
		wantAllFull bool
	}{
		{name: "mobile", platform: "mobile", wantLayout: "mobile-app", wantAllFull: true},
		{name: "web default", platform: "", wantLayout: "admin-sidebar", wantAllFull: false},
		{name: "explicit web", platform: "web", wantLayout: "admin-sidebar", wantAllFull: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := MockProvider{}.GenerateSchema(context.Background(), GenerateRequest{
				Prompt:   "Build a food delivery rider app with orders and earnings.",
				PageType: "dashboard",
				Domain:   "logistics",
				Platform: tt.platform,
			})
			if err != nil {
				t.Fatalf("GenerateSchema error: %v", err)
			}
			if resp.Schema.Layout != tt.wantLayout {
				t.Fatalf("layout = %q, want %q", resp.Schema.Layout, tt.wantLayout)
			}
			if len(resp.Schema.Sections) == 0 {
				t.Fatal("expected sections")
			}
			if tt.wantAllFull {
				for i, s := range resp.Schema.Sections {
					if s.Span != "full" {
						t.Fatalf("mobile section %d span = %q, want full", i, s.Span)
					}
				}
			}
		})
	}
}

// The schema prompt sent to OpenAI-compatible providers must carry the
// platform-specific design constraints so a real LLM also produces the right shape.
func TestSchemaUserPromptPlatformBranches(t *testing.T) {
	mobile := schemaUserPrompt(GenerateRequest{Prompt: "rider app", PageType: "dashboard", Platform: "mobile"}, newVariation())
	if !strings.Contains(mobile, "MOBILE APP") || !strings.Contains(mobile, "mobile-app") {
		t.Fatalf("mobile prompt missing mobile directives:\n%s", mobile)
	}
	if !strings.Contains(mobile, `"span":"full"`) {
		t.Fatal("mobile prompt should force full-width sections")
	}

	web := schemaUserPrompt(GenerateRequest{Prompt: "fintech app", PageType: "dashboard", Platform: "web"}, newVariation())
	if !strings.Contains(web, "admin-sidebar") {
		t.Fatalf("web prompt missing desktop layout guidance:\n%s", web)
	}
	if strings.Contains(web, "MOBILE APP") {
		t.Fatal("web prompt must not contain mobile directives")
	}
}

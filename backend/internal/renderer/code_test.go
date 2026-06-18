package renderer

import (
	"strings"
	"testing"

	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

func TestGenerateTSXEscapesUnsafeTextAndUsesSafeComponentName(t *testing.T) {
	code := GenerateTSX(schema.PageSchema{
		PageType: "dashboard",
		Domain:   "finance",
		Layout:   "admin-sidebar",
		Theme:    "studio-neutral",
		Title:    `123 <script>{bad}</script>`,
		Sections: []schema.Section{
			{Type: "chartPanel", Title: `<img src=x onerror=alert(1)>`, ChartType: "bar"},
		},
	})

	if !strings.Contains(code, "function Generated123ScriptBadScriptPage") {
		t.Fatalf("expected safe component name, got:\n%s", code)
	}
	if strings.Contains(code, "<script>") || strings.Contains(code, "<img src=x") {
		t.Fatalf("expected unsafe text to be escaped, got:\n%s", code)
	}
	if !strings.Contains(code, "&lt;script&gt;&#123;bad&#125;&lt;/script&gt;") {
		t.Fatalf("expected escaped title, got:\n%s", code)
	}
}

func TestGenerateSupportsJSONOutputMode(t *testing.T) {
	code := Generate(schema.PageSchema{
		PageType: "dashboard",
		Domain:   "finance",
		Layout:   "admin-sidebar",
		Theme:    "studio-neutral",
		Title:    "Finance",
		Sections: []schema.Section{
			{Type: "chartPanel", Title: "Revenue", ChartType: "bar"},
		},
	}, "json", "shadcn")

	if !strings.Contains(code, `"pageType": "dashboard"`) {
		t.Fatalf("expected JSON output, got:\n%s", code)
	}
}

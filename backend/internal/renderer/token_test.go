package renderer

import (
	"strings"
	"testing"

	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

// design systems route through the token renderer (designsystem.Has → true).
func TestGenerateKitTSX_DesignSystemTokenDriven(t *testing.T) {
	page := schema.PageSchema{
		PageType: "dashboard", Domain: "retail", Layout: "admin-sidebar", Theme: "neobrutalism",
		Title: "Sales",
		Sections: []schema.Section{
			{Type: "statsGrid", Items: []schema.MetricItem{
				{Label: "Revenue", Value: "$1k", Trend: "+5%", Icon: "dollar"},
				{Label: "Orders", Value: "12", Icon: "cart"},
				{Label: "Users", Value: "30", Icon: "users"},
			}},
		},
	}
	code := GenerateKitTSX(page, "neobrutalism")
	for _, want := range []string{
		"Neobrutalism design system", // banner
		"--border-width:3px",         // structural token
		"--heading-transform:uppercase",
		"ui-card",     // token skeleton class
		"ui-stat-ico", // icon slot
	} {
		if !strings.Contains(code, want) {
			t.Errorf("neobrutalism export missing %q", want)
		}
	}
}

func TestGenerateKitTSX_RichSectionsRender(t *testing.T) {
	page := schema.PageSchema{
		PageType: "dashboard", Domain: "saas", Layout: "admin-sidebar", Theme: "soft", Title: "Home",
		Sections: []schema.Section{
			{Type: "hero", Title: "Welcome", Subtitle: "Do more", PrimaryAction: "Start", Image: "modern office"},
			{Type: "gallery", Items: []schema.MetricItem{{Label: "A", Image: "a"}, {Label: "B", Image: "b"}, {Label: "C", Image: "c"}}},
			{Type: "featureGrid", Items: []schema.MetricItem{{Label: "Fast", Value: "x", Icon: "zap"}, {Label: "Safe", Value: "y", Icon: "shield"}, {Label: "Open", Value: "z", Icon: "globe"}}},
			{Type: "pricingTable", PrimaryAction: "Buy", Items: []schema.MetricItem{{Label: "Pro", Value: "$9", Trend: "Most popular"}, {Label: "Free", Value: "$0"}}},
			{Type: "testimonials", Items: []schema.MetricItem{{Label: "Ana", Value: "great", Trend: "CEO"}, {Label: "Bob", Value: "nice", Trend: "CTO"}}},
			{Type: "stepper", Items: []schema.MetricItem{{Label: "Sign up", Value: "free"}, {Label: "Build", Value: "fast"}}},
			{Type: "progressList", Items: []schema.MetricItem{{Label: "SLA", Value: "92%"}, {Label: "Uptime", Value: "99%"}}},
			{Type: "mapPanel", Items: []schema.MetricItem{{Label: "Jakarta", Value: "HQ"}, {Label: "Bali", Value: "Branch"}}},
			{Type: "kanbanBoard", Columns: []string{"Todo", "Doing", "Done"}, Items: []schema.MetricItem{{Label: "T1"}, {Label: "T2"}, {Label: "T3"}}},
			{Type: "calendarView", Items: []schema.MetricItem{{Label: "Launch", Value: "Mon"}}},
		},
	}
	code := GenerateKitTSX(page, "soft")
	for _, want := range []string{"ui-hero", "ui-gallery", "ui-feature", "ui-pricing", "ui-quote", "ui-stepper", "ui-prog", "ui-map", "ui-kanban", "ui-cal", "loremflickr.com"} {
		if !strings.Contains(code, want) {
			t.Errorf("rich-section export missing %q", want)
		}
	}
}

func TestIconSVGResolves(t *testing.T) {
	cases := map[string]string{
		"dollar":             iconPaths["dollar"],
		"revenue":            iconPaths["trending-up"], // alias
		"patient":            iconPaths["users"],       // alias
		"":                   iconPaths["activity"],    // default
		"nonsense word here": iconPaths["activity"],
	}
	for in, wantPath := range cases {
		got := iconSVG(in)
		if !strings.Contains(got, wantPath) {
			t.Errorf("iconSVG(%q) did not resolve to expected icon path", in)
		}
		if !strings.HasPrefix(got, "<svg") {
			t.Errorf("iconSVG(%q) is not an svg: %s", in, got)
		}
	}
}

func TestPhotoFor(t *testing.T) {
	if got := photoFor("https://x.test/a.png", "seed", 10, 10); got != "https://x.test/a.png" {
		t.Errorf("http hint should pass through, got %q", got)
	}
	if got := photoFor("coffee shop", "seed", 480, 320); !strings.Contains(got, "loremflickr.com/480/320/coffee,shop") {
		t.Errorf("keyword hint should map to loremflickr, got %q", got)
	}
	if got := photoFor("", "my seed", 100, 100); !strings.Contains(got, "picsum.photos/seed/my-seed/100/100") {
		t.Errorf("empty hint should fall back to picsum, got %q", got)
	}
}

func TestPctOf(t *testing.T) {
	for in, want := range map[string]int{"72%": 72, "99.5%": 99, "150": 100, "-3": 0, "none": 0} {
		if got := pctOf(in); got != want {
			t.Errorf("pctOf(%q) = %d, want %d", in, got, want)
		}
	}
}

package ai

import (
	"testing"

	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

func TestNormalizeIntentDetectsPageTypeAndDomain(t *testing.T) {
	intent := NormalizeIntent("Create finance analytics with revenue filters", "dashboard", "custom")
	if intent.PageType != "analytics" {
		t.Fatalf("expected analytics, got %s", intent.PageType)
	}
	if intent.Domain != "finance" {
		t.Fatalf("expected finance, got %s", intent.Domain)
	}
}

func validDashboardSections() []schema.Section {
	return []schema.Section{
		{Type: "statsGrid", Items: []schema.MetricItem{{Label: "A", Value: "1"}, {Label: "B", Value: "2"}, {Label: "C", Value: "3"}}},
		{Type: "chartPanel", Title: "Visits", ChartType: "bar"},
		{Type: "dataTable", Title: "Recent", Columns: []string{"X", "Y"}, Rows: [][]string{{"a", "b"}, {"c", "d"}, {"e", "f"}}},
	}
}

func TestValidateGeneratedSchemaGuardrails(t *testing.T) {
	validPage := schema.PageSchema{
		PageType: "dashboard",
		Domain:   "hospital",
		Layout:   "admin-sidebar",
		Theme:    "medical-clean",
		Title:    "Valid Title",
		Sections: validDashboardSections(),
	}

	// 1. Should accept valid schema
	if err := ValidateGeneratedSchema(validPage); err != nil {
		t.Fatalf("expected valid schema to pass, got: %v", err)
	}

	// 2. Reject too many sections
	invalidPageSections := validPage
	invalidPageSections.Sections = make([]schema.Section, 16)
	for i := 0; i < 16; i++ {
		invalidPageSections.Sections[i] = schema.Section{Type: "statsGrid", Items: []schema.MetricItem{{Label: "A", Value: "1"}, {Label: "B", Value: "2"}, {Label: "C", Value: "3"}}}
	}
	if err := ValidateGeneratedSchema(invalidPageSections); err == nil {
		t.Fatal("expected schema with >15 sections to be rejected")
	}

	// 3. Reject unsafe URL schemes (injected into an otherwise-valid page)
	unsafeURLPage := validPage
	unsafeURLPage.Sections = validDashboardSections()
	unsafeURLPage.Sections[1].DatasetPreset = "javascript:alert(1)"
	if err := ValidateGeneratedSchema(unsafeURLPage); err == nil {
		t.Fatal("expected schema with javascript: URL to be rejected")
	}

	unsafeDataPage := validPage
	unsafeDataPage.Sections = validDashboardSections()
	unsafeDataPage.Sections[1].DatasetPreset = "data:text/html,<html>"
	if err := ValidateGeneratedSchema(unsafeDataPage); err == nil {
		t.Fatal("expected schema with data: URL to be rejected")
	}

	// 4. Reject dangerous tags and handlers
	unsafeScriptPage := validPage
	unsafeScriptPage.Title = "Dashboard <script>alert(1)</script>"
	if err := ValidateGeneratedSchema(unsafeScriptPage); err == nil {
		t.Fatal("expected schema with script tag to be rejected")
	}

	unsafeHandlerPage := validPage
	unsafeHandlerPage.Sections = validDashboardSections()
	unsafeHandlerPage.Sections[1].PrimaryAction = "onclick=alert(1)"
	if err := ValidateGeneratedSchema(unsafeHandlerPage); err == nil {
		t.Fatal("expected schema with event handler to be rejected")
	}

	// 5. Reject directory traversal
	unsafePathPage := validPage
	unsafePathPage.Title = "../../etc/passwd"
	if err := ValidateGeneratedSchema(unsafePathPage); err == nil {
		t.Fatal("expected schema with path traversal to be rejected")
	}

	// 6. Reject too long string
	longStrPage := validPage
	longStrPage.Title = makeString(5001)
	if err := ValidateGeneratedSchema(longStrPage); err == nil {
		t.Fatal("expected schema with >5000 character string to be rejected")
	}
}

func makeString(n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = 'a'
	}
	return string(b)
}

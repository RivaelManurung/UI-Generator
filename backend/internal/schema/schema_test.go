package schema

import "testing"

func TestValidateRejectsUnsupportedComponent(t *testing.T) {
	page := PageSchema{
		PageType: "dashboard",
		Domain:   "hospital",
		Layout:   "admin-sidebar",
		Theme:    "medical-clean",
		Title:    "Hospital",
		Sections: []Section{
			{Type: "rawReactCode"},
		},
	}

	if err := Validate(page); err == nil {
		t.Fatal("expected unsupported component to be rejected")
	}
}

func TestValidateRequiresDashboardComposition(t *testing.T) {
	page := PageSchema{
		PageType: "dashboard",
		Domain:   "hospital",
		Layout:   "admin-sidebar",
		Theme:    "medical-clean",
		Title:    "Hospital",
		Sections: []Section{
			{Type: "statsGrid", Items: []MetricItem{{Label: "A", Value: "1"}, {Label: "B", Value: "2"}}},
		},
	}

	if err := Validate(page); err == nil {
		t.Fatal("expected dashboard without chart/table/activity to be rejected")
	}
}

func TestValidateAcceptsDashboardMinimum(t *testing.T) {
	// Production-grade minimum: KPIs (>=3) + chart + populated table (>=3 rows).
	page := PageSchema{
		PageType: "dashboard",
		Domain:   "hospital",
		Layout:   "admin-sidebar",
		Theme:    "medical-clean",
		Title:    "Hospital",
		Sections: []Section{
			{Type: "statsGrid", Items: []MetricItem{{Label: "A", Value: "1"}, {Label: "B", Value: "2"}, {Label: "C", Value: "3"}}},
			{Type: "chartPanel", Title: "Visits", ChartType: "bar"},
			{Type: "dataTable", Title: "Recent", Columns: []string{"Patient", "Status"}, Rows: [][]string{{"A", "Active"}, {"B", "Pending"}, {"C", "Done"}}},
		},
	}

	if err := Validate(page); err != nil {
		t.Fatalf("expected valid dashboard, got %v", err)
	}
}

func TestValidateRequiresAnalyticsComposition(t *testing.T) {
	page := PageSchema{
		PageType: "analytics",
		Domain:   "finance",
		Layout:   "admin-sidebar",
		Theme:    "precision-indigo",
		Title:    "Finance Analytics",
		Sections: []Section{
			{Type: "statsGrid", Items: []MetricItem{{Label: "A", Value: "1"}, {Label: "B", Value: "2"}}},
			{Type: "chartPanel", Title: "Revenue", ChartType: "bar"},
		},
	}

	if err := Validate(page); err == nil {
		t.Fatal("expected analytics page without filterToolbar and dataTable to be rejected")
	}
}

func TestValidateRequiresLoginComposition(t *testing.T) {
	page := PageSchema{
		PageType: "login",
		Domain:   "custom",
		Layout:   "admin-sidebar",
		Theme:    "studio-neutral",
		Title:    "Login",
		Sections: []Section{
			{Type: "emptyState", Title: "Welcome"},
		},
	}

	if err := Validate(page); err == nil {
		t.Fatal("expected login page without formSection and actionFooter to be rejected")
	}
}

func TestValidateAcceptsRichSections(t *testing.T) {
	three := []MetricItem{{Label: "A", Value: "1"}, {Label: "B", Value: "2"}, {Label: "C", Value: "3"}}
	page := PageSchema{
		PageType: "dashboard", Domain: "saas", Layout: "admin-sidebar", Theme: "soft", Title: "Home",
		Sections: []Section{
			{Type: "hero", Title: "Welcome", Subtitle: "x", Image: "office"},
			{Type: "statsGrid", Items: three},
			{Type: "chartPanel", Title: "Trend", ChartType: "stacked"},
			{Type: "featureGrid", Items: three},
			{Type: "gallery", Items: three},
			{Type: "pricingTable", Items: three},
			{Type: "testimonials", Items: three},
			{Type: "stepper", Items: three},
			{Type: "progressList", Items: three},
			{Type: "mapPanel", Items: three},
			{Type: "kanbanBoard", Items: three},
			{Type: "calendarView", Items: three},
			{Type: "dataTable", Title: "Recent", Columns: []string{"A", "B"}, Rows: [][]string{{"1", "x"}, {"2", "y"}, {"3", "z"}}},
		},
	}
	if err := Validate(page); err != nil {
		t.Fatalf("expected valid rich page, got %v", err)
	}
}

func TestValidateRejectsThinRichSections(t *testing.T) {
	for _, typ := range []string{"gallery", "featureGrid", "pricingTable", "testimonials", "stepper", "progressList", "mapPanel"} {
		page := PageSchema{
			PageType: "dashboard", Domain: "x", Layout: "admin-sidebar", Theme: "soft", Title: "T",
			Sections: []Section{
				{Type: "statsGrid", Items: []MetricItem{{Label: "A", Value: "1"}, {Label: "B", Value: "2"}, {Label: "C", Value: "3"}}},
				{Type: "chartPanel", Title: "c", ChartType: "bar"},
				{Type: "dataTable", Title: "t", Columns: []string{"A", "B"}, Rows: [][]string{{"1", "x"}, {"2", "y"}, {"3", "z"}}},
				{Type: typ}, // empty → must be rejected
			},
		}
		if err := Validate(page); err == nil {
			t.Errorf("expected %q with no items to be rejected", typ)
		}
	}
}

func TestSectionUnmarshalImageAndSubtitle(t *testing.T) {
	var s Section
	if err := s.UnmarshalJSON([]byte(`{"type":"hero","title":"Hi","subtitle":"Sub","image":"beach sunset"}`)); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if s.Subtitle != "Sub" || s.Image != "beach sunset" {
		t.Fatalf("subtitle/image not parsed: %+v", s)
	}
	// "description" should fall back into Subtitle when subtitle is absent.
	var s2 Section
	_ = s2.UnmarshalJSON([]byte(`{"type":"hero","title":"Hi","description":"Desc"}`))
	if s2.Subtitle != "Desc" {
		t.Fatalf("description fallback failed: %+v", s2)
	}
}

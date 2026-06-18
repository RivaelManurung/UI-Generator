package ai

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

// dseed is a small deterministic hash so mock data varies by domain/label
// instead of being byte-identical across every generated page.
func dseed(s string) int {
	h := 2166136261
	for _, c := range strings.ToLower(s) {
		h = (h ^ int(c)) * 16777619
	}
	if h < 0 {
		h = -h
	}
	return h % 1000000
}

func groupThousands(n int) string {
	s := strconv.Itoa(n)
	if len(s) <= 3 {
		return s
	}
	var b strings.Builder
	pre := len(s) % 3
	if pre > 0 {
		b.WriteString(s[:pre])
	}
	for i := pre; i < len(s); i += 3 {
		if b.Len() > 0 {
			b.WriteByte(',')
		}
		b.WriteString(s[i : i+3])
	}
	return b.String()
}

func mockSpark(seed string, up bool) []float64 {
	h := dseed(seed)
	out := make([]float64, 10)
	for i := 0; i < 10; i++ {
		drift := float64(i) * 1.3
		if !up {
			drift = -float64(i) * 1.0
		}
		v := math.Round(50 + drift + math.Sin(float64(i+1+h%7))*8)
		if v < 4 {
			v = 4
		}
		out[i] = v
	}
	return out
}

// mockStats produces four domain-varied KPI cards (different numbers per domain)
// with real sparkline data, replacing the old byte-identical hardcoded metrics.
func mockStats(labels labelSet, domainName string) []schema.MetricItem {
	icons := []string{"activity", "calendar", "users", "wallet"}
	names := []string{labels.MetricA, labels.MetricB, labels.MetricC, labels.MetricD}
	out := make([]schema.MetricItem, 4)
	for i, name := range names {
		s := dseed(name + domainName)
		up := s%5 != 0
		var val string
		switch i {
		case 3:
			val = "$" + groupThousands((80+s%9000)*7)
		case 2:
			val = strconv.Itoa(12 + s%240)
		default:
			val = groupThousands(120 + s%9000)
		}
		trend := "+" + strconv.Itoa(2+s%18) + "%"
		if !up {
			trend = "-" + strconv.Itoa(1+s%9) + "%"
		}
		out[i] = schema.MetricItem{Label: name, Value: val, Trend: trend, Icon: icons[i], Spark: mockSpark(name+domainName, up)}
	}
	return out
}

// mockChart attaches real, domain-varied series + month categories so the chart
// renders actual data instead of a canned wave.
func mockChart(title, chartType, domainName, span string) schema.Section {
	h := dseed(title + domainName)
	cats := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"}
	n := len(cats)
	series := make([]float64, n)
	for i := 0; i < n; i++ {
		v := math.Round(60 + float64(i)*1.4 + math.Sin(float64(i+1+h%9))*18 + float64(h%24))
		if v < 6 {
			v = 6
		}
		series[i] = v
	}
	return schema.Section{Type: "chartPanel", Span: span, Title: title, ChartType: chartType, DatasetPreset: domainName + "-trend", Series: [][]float64{series}, Categories: cats}
}

// mockDonut builds a domain-varied composition (donut) chart.
func mockDonut(domainName, span string) schema.Section {
	labels := []string{"Direct", "Referral", "Organic", "Paid"}
	segs := make([]float64, len(labels))
	for i, l := range labels {
		segs[i] = float64(12 + dseed(l+domainName)%40)
	}
	return schema.Section{Type: "chartPanel", Span: span, Title: "Share by Segment", ChartType: "donut", Categories: labels, Series: [][]float64{segs}}
}

type GenerateRequest struct {
	Prompt    string
	PageType  string
	Domain    string
	ThemeSlug string
}

type RefineRequest struct {
	Prompt       string
	Schema       schema.PageSchema
	SectionIndex int
}

type GenerateResponse struct {
	Schema       schema.PageSchema
	ProviderName string
	Metadata     map[string]string
}

// AppPagePlan is one screen requested in a multi-page app generation.
type AppPagePlan struct {
	Name     string
	PageType string
}

type AppRequest struct {
	Prompt    string
	Domain    string
	ThemeSlug string
	Pages     []AppPagePlan
}

type AppPageResult struct {
	Name     string
	PageType string
	Schema   schema.PageSchema
}

type AppResponse struct {
	Pages        []AppPageResult
	ProviderName string
}

type Provider interface {
	GenerateSchema(ctx context.Context, request GenerateRequest) (GenerateResponse, error)
	RefineSection(ctx context.Context, request RefineRequest) (GenerateResponse, error)
	// GenerateApp produces schemas for ALL requested pages in a single provider
	// round-trip, so total latency does not scale with the number of pages.
	GenerateApp(ctx context.Context, request AppRequest) (AppResponse, error)
}

// AppPlanner is implemented by providers that can decide the page set for an app
// themselves ("Auto" mode — Stitch-like): given only the brief, the model picks
// how many pages and which page types make sense. Providers that do not implement
// it fall back to a heuristic plan, so this is an optional capability.
type AppPlanner interface {
	PlanApp(ctx context.Context, prompt, domain string) ([]AppPagePlan, error)
}

type MockProvider struct{}

func NewMockProvider() *MockProvider {
	return &MockProvider{}
}

func (MockProvider) GenerateSchema(_ context.Context, request GenerateRequest) (GenerateResponse, error) {
	// Honor an explicitly requested page type/domain (multi-page generation asks
	// for dashboard, list, detail, form). Only fall back to prompt-based intent
	// detection when they are not provided.
	pageType := strings.TrimSpace(request.PageType)
	domainName := strings.TrimSpace(request.Domain)
	if pageType == "" || domainName == "" {
		intent := NormalizeIntent(request.Prompt, request.PageType, request.Domain)
		if pageType == "" {
			pageType = intent.PageType
		}
		if domainName == "" {
			domainName = intent.Domain
		}
	}
	pageSchema := buildSchema(request.Prompt, pageType, domainName, request.ThemeSlug)
	return GenerateResponse{
		Schema:       pageSchema,
		ProviderName: "mock-llm",
		Metadata: map[string]string{
			"model":          "mock-gpt-4",
			"prompt_version": "1.0",
			"latency_ms":     "150",
		},
	}, nil
}

func (MockProvider) GenerateApp(_ context.Context, request AppRequest) (AppResponse, error) {
	domainName := fallback(request.Domain, "custom")
	out := AppResponse{ProviderName: "mock-llm"}
	for _, p := range request.Pages {
		out.Pages = append(out.Pages, AppPageResult{
			Name:     p.Name,
			PageType: p.PageType,
			Schema:   buildSchema(request.Prompt, p.PageType, domainName, request.ThemeSlug),
		})
	}
	return out, nil
}

func (MockProvider) RefineSection(_ context.Context, request RefineRequest) (GenerateResponse, error) {
	pageSchema := request.Schema
	if request.SectionIndex >= 0 && request.SectionIndex < len(pageSchema.Sections) {
		pageSchema.Sections[request.SectionIndex] = refineSection(pageSchema.Sections[request.SectionIndex], request.Prompt, pageSchema.Domain)
	}
	return GenerateResponse{
		Schema:       pageSchema,
		ProviderName: "mock-llm",
		Metadata: map[string]string{
			"model":          "mock-gpt-4",
			"prompt_version": "1.0",
			"latency_ms":     "120",
		},
	}, nil
}

func buildSchema(prompt, pageType, domainName, theme string) schema.PageSchema {
	labels := domainLabels(domainName)
	base := schema.PageSchema{
		PageType: pageType,
		Domain:   domainName,
		Layout:   "admin-sidebar",
		Theme:    theme,
		Title:    labels.Title,
		Brand:    labels.Title,
		Nav:      labels.Nav,
	}

	switch pageType {
	case "list":
		base.Sections = []schema.Section{
			{Type: "filterToolbar", SearchPlaceholder: "Search records", Filters: []string{"Status", "Owner", "Date range"}, PrimaryAction: "Create record"},
			tableSection(labels),
		}
	case "analytics":
		base.Sections = []schema.Section{
			{Type: "statsGrid", Items: mockStats(labels, domainName)},
			{Type: "filterToolbar", SearchPlaceholder: "Filter analytics", Filters: []string{"Segment", "Date range", "Owner"}, PrimaryAction: "Export"},
			mockChart(labels.ChartTitle, "line", domainName, "two-thirds"),
			mockDonut(domainName, "third"),
			tableSection(labels),
		}
	case "form":
		base.Sections = []schema.Section{
			{Type: "formSection", Title: "Primary Information", Fields: []schema.Field{{Label: labels.Entity + " Name", Type: "text", Hint: "Use the display name"}, {Label: "Owner", Type: "select"}, {Label: "Due Date", Type: "date"}, {Label: "Notes", Type: "textarea"}}, SubmitLabel: "Save " + labels.Entity},
			{Type: "actionFooter", PrimaryAction: "Save", Actions: []string{"Save draft", "Cancel"}},
		}
	case "login":
		base.Title = "Welcome back"
		base.Sections = []schema.Section{
			{Type: "authForm", Title: "Welcome back", Subtitle: "Sign in to " + labels.Title, Fields: []schema.Field{{Label: "Email", Type: "email", Hint: "you@company.com"}, {Label: "Password", Type: "password", Hint: "••••••••"}}, PrimaryAction: "Sign in", Actions: []string{"Forgot password?", "Don't have an account? Sign up"}},
		}
	case "detail":
		base.Sections = []schema.Section{
			{Type: "profileSummary", Title: labels.Entity + " Summary", Entity: labels.Entity, Properties: map[string]string{"Status": "Active", "Owner": labels.Owner, "Risk": "Low"}},
			{Type: "tabbedContent", Tabs: []schema.Tab{{Label: "Overview", Items: []string{"Key profile data", "Recent changes"}}, {Label: "Activity", Items: []string{"Audit trail", "Follow-up tasks"}}}},
		}
	default:
		base.PageType = "dashboard"
		chart := mockChart(labels.ChartTitle, "line", domainName, "two-thirds")
		activity := schema.Section{Type: "activityTimeline", Span: "third", Title: "Recent Activity", Items: []schema.MetricItem{{Label: "New " + labels.Entity + " created", Value: "2 min ago", Trend: "ok"}, {Label: labels.Owner + " updated a record", Value: "18 min ago", Trend: "ok"}, {Label: "Weekly report generated", Value: "1 hr ago", Trend: "ok"}}}
		table := tableSection(labels)
		table.Span = "full"
		base.Sections = []schema.Section{
			{Type: "statsGrid", Span: "full", Items: mockStats(labels, domainName)},
			chart,
			activity,
			table,
		}
	}
	return base
}

func refineSection(section schema.Section, prompt string, domainName string) schema.Section {
	refined := section
	note := summarize(prompt)
	switch section.Type {
	case "statsGrid":
		for i := range refined.Items {
			refined.Items[i].Trend = "+ " + fmt.Sprint(6+i*3) + "%"
		}
	case "chartPanel":
		refined.Title = title(domainName) + " Insights: " + note
		refined.DatasetPreset = domainName + "-refined"
	case "dataTable":
		refined.Title = "Refined " + refined.Title
		if len(refined.Rows) > 0 {
			refined.Rows = append([][]string{{"Refined Record", "AI Planner", "Updated", "Now", "Ready"}}, refined.Rows...)
		}
	case "filterToolbar":
		refined.SearchPlaceholder = "Search refined results"
		refined.Filters = append(refined.Filters, "Priority")
	case "formSection":
		refined.Title = "Refined " + refined.Title
		refined.Fields = append(refined.Fields, schema.Field{Label: "AI Refinement Notes", Type: "textarea", Hint: note})
	case "profileSummary":
		if refined.Properties == nil {
			refined.Properties = map[string]string{}
		}
		refined.Properties["Refinement"] = note
	case "tabbedContent":
		refined.Tabs = append(refined.Tabs, schema.Tab{Label: "AI Notes", Items: []string{note, "Section-level refinement"}})
	case "activityTimeline":
		refined.Items = append([]schema.MetricItem{{Label: "Section refined", Value: note, Trend: "updated"}}, refined.Items...)
	case "actionFooter":
		refined.PrimaryAction = "Apply refined changes"
	default:
		refined.Title = "Refined " + fallback(refined.Title, section.Type)
	}
	return refined
}

type labelSet struct {
	Title      string
	Entity     string
	Owner      string
	MetricA    string
	MetricB    string
	MetricC    string
	MetricD    string
	ChartTitle string
	Columns    []string
	Nav        []string
}

func domainLabels(domainName string) labelSet {
	switch strings.ToLower(domainName) {
	case "hospital", "medical", "healthcare":
		return labelSet{"Hospital Operations", "Patient", "Dr. Maya", "Total Patients", "Appointments Today", "Available Doctors", "Monthly Revenue", "Patient Visit Trend", []string{"Patient", "Doctor", "Department", "Time", "Status"}, []string{"Dashboard", "Patients", "Appointments", "Doctors", "Departments", "Billing"}}
	case "school", "education":
		return labelSet{"School Command Center", "Student", "Academic Office", "Active Students", "Classes Today", "Teachers Online", "Fee Collection", "Attendance Trend", []string{"Student", "Class", "Advisor", "Attendance", "Status"}, []string{"Dashboard", "Students", "Classes", "Teachers", "Grades", "Reports"}}
	case "finance":
		return labelSet{"Finance Performance", "Account", "Finance Lead", "Revenue", "Invoices Due", "Active Accounts", "Cash Flow", "Revenue Movement", []string{"Account", "Owner", "Amount", "Due Date", "Status"}, []string{"Overview", "Transactions", "Invoices", "Accounts", "Budgets", "Reports"}}
	case "inventory", "warehouse":
		return labelSet{"Inventory Control", "Stock Item", "Warehouse Lead", "Total SKUs", "Low Stock", "Suppliers", "Stock Value", "Stock Movement", []string{"Item", "Category", "Warehouse", "Quantity", "Status"}, []string{"Dashboard", "Products", "Orders", "Suppliers", "Warehouses", "Reports"}}
	default:
		return labelSet{"Operations Dashboard", "Record", "Workspace Owner", "Total Records", "Open Tasks", "Team Members", "Monthly Value", "Operational Trend", []string{"Name", "Owner", "Category", "Updated", "Status"}, []string{"Dashboard", "Records", "Activity", "Reports", "Settings"}}
	}
}

func tableSection(labels labelSet) schema.Section {
	rows := [][]string{
		{labels.Entity + " Alpha", labels.Owner, "Core", "09:30", "Active"},
		{labels.Entity + " Beta", "Operations", "Priority", "11:00", "Review"},
		{labels.Entity + " Gamma", "Support", "Follow-up", "14:15", "Pending"},
	}
	return schema.Section{Type: "dataTable", Title: "Recent " + labels.Entity + " Records", Columns: labels.Columns, Rows: rows, Actions: []string{"View", "Edit"}}
}

func title(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "Custom"
	}
	return strings.ToUpper(value[:1]) + value[1:]
}

func summarize(value string) string {
	value = strings.TrimSpace(value)
	if len(value) <= 28 {
		return value
	}
	return value[:28] + "..."
}

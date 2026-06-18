package ai

import (
	"context"
	"fmt"
	"strings"

	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

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
	}

	switch pageType {
	case "list":
		base.Sections = []schema.Section{
			{Type: "filterToolbar", SearchPlaceholder: "Search records", Filters: []string{"Status", "Owner", "Date range"}, PrimaryAction: "Create record"},
			tableSection(labels),
		}
	case "analytics":
		base.Sections = []schema.Section{
			{Type: "statsGrid", Items: []schema.MetricItem{{Label: labels.MetricA, Value: "12,430", Trend: "+12%", Icon: "activity"}, {Label: labels.MetricB, Value: "328", Trend: "+8%", Icon: "calendar"}, {Label: labels.MetricC, Value: "86", Trend: "+4%", Icon: "users"}, {Label: labels.MetricD, Value: "$128.4k", Trend: "+18%", Icon: "wallet"}}},
			{Type: "filterToolbar", SearchPlaceholder: "Filter analytics", Filters: []string{"Segment", "Date range", "Owner"}, PrimaryAction: "Export"},
			{Type: "chartPanel", Title: labels.ChartTitle, ChartType: "bar", DatasetPreset: domainName + "-analytics"},
			tableSection(labels),
		}
	case "form":
		base.Sections = []schema.Section{
			{Type: "formSection", Title: "Primary Information", Fields: []schema.Field{{Label: labels.Entity + " Name", Type: "text", Hint: "Use the display name"}, {Label: "Owner", Type: "select"}, {Label: "Due Date", Type: "date"}, {Label: "Notes", Type: "textarea"}}, SubmitLabel: "Save " + labels.Entity},
			{Type: "actionFooter", PrimaryAction: "Save", Actions: []string{"Save draft", "Cancel"}},
		}
	case "login":
		base.Sections = []schema.Section{
			{Type: "formSection", Title: "Sign in to " + labels.Title, Fields: []schema.Field{{Label: "Email", Type: "email"}, {Label: "Password", Type: "password"}}, SubmitLabel: "Sign in"},
			{Type: "emptyState", Title: "Secure workspace access"},
			{Type: "actionFooter", PrimaryAction: "Sign in", Actions: []string{"Forgot password"}},
		}
	case "detail":
		base.Sections = []schema.Section{
			{Type: "profileSummary", Title: labels.Entity + " Summary", Entity: labels.Entity, Properties: map[string]string{"Status": "Active", "Owner": labels.Owner, "Risk": "Low"}},
			{Type: "tabbedContent", Tabs: []schema.Tab{{Label: "Overview", Items: []string{"Key profile data", "Recent changes"}}, {Label: "Activity", Items: []string{"Audit trail", "Follow-up tasks"}}}},
		}
	default:
		base.PageType = "dashboard"
		chart := schema.Section{Type: "chartPanel", Span: "two-thirds", Title: labels.ChartTitle, ChartType: "bar", DatasetPreset: domainName + "-growth"}
		activity := schema.Section{Type: "activityTimeline", Span: "third", Title: "Recent Activity", Items: []schema.MetricItem{{Label: "New " + labels.Entity + " created", Value: "2 min ago", Trend: "ok"}, {Label: labels.Owner + " updated a record", Value: "18 min ago", Trend: "ok"}, {Label: "Weekly report generated", Value: "1 hr ago", Trend: "ok"}}}
		table := tableSection(labels)
		table.Span = "full"
		base.Sections = []schema.Section{
			{Type: "statsGrid", Span: "full", Items: []schema.MetricItem{{Label: labels.MetricA, Value: "12,430", Trend: "+12%", Icon: "activity"}, {Label: labels.MetricB, Value: "328", Trend: "+8%", Icon: "calendar"}, {Label: labels.MetricC, Value: "86", Trend: "+4%", Icon: "users"}, {Label: labels.MetricD, Value: "$128.4k", Trend: "+18%", Icon: "wallet"}}},
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
}

func domainLabels(domainName string) labelSet {
	switch strings.ToLower(domainName) {
	case "hospital", "medical", "healthcare":
		return labelSet{"Hospital Operations", "Patient", "Dr. Maya", "Total Patients", "Appointments Today", "Available Doctors", "Monthly Revenue", "Patient Visit Trend", []string{"Patient", "Doctor", "Department", "Time", "Status"}}
	case "school", "education":
		return labelSet{"School Command Center", "Student", "Academic Office", "Active Students", "Classes Today", "Teachers Online", "Fee Collection", "Attendance Trend", []string{"Student", "Class", "Advisor", "Attendance", "Status"}}
	case "finance":
		return labelSet{"Finance Performance", "Account", "Finance Lead", "Revenue", "Invoices Due", "Active Accounts", "Cash Flow", "Revenue Movement", []string{"Account", "Owner", "Amount", "Due Date", "Status"}}
	case "inventory", "warehouse":
		return labelSet{"Inventory Control", "Stock Item", "Warehouse Lead", "Total SKUs", "Low Stock", "Suppliers", "Stock Value", "Stock Movement", []string{"Item", "Category", "Warehouse", "Quantity", "Status"}}
	default:
		return labelSet{"Operations Dashboard", "Record", "Workspace Owner", "Total Records", "Open Tasks", "Team Members", "Monthly Value", "Operational Trend", []string{"Name", "Owner", "Category", "Updated", "Status"}}
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

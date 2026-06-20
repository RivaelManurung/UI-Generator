package seed

import (
	"encoding/json"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/domain"
	"github.com/kreasinusantara/ui-generator-backend/internal/renderer"
	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

type StudioData struct {
	Projects  map[string]domain.Project
	Pages     map[string]domain.Page
	Versions  map[string][]domain.PageVersion
	Jobs      map[string]domain.GenerationJob
	Wallet    domain.CreditWallet
	Themes    []domain.Theme
	Templates []domain.Template
}

func Studio() StudioData {
	base := time.Date(2026, 6, 5, 15, 0, 0, 0, time.UTC)
	projects := []domain.Project{
		{ID: "proj_hospital_ops", UserID: "user_demo", Name: "Hospital Ops Dashboard", Description: "Operational command center for appointments, patient flow, and doctors.", DefaultThemeSlug: "medical-clean", CreatedAt: base.Add(-72 * time.Hour), UpdatedAt: base.Add(-20 * time.Minute)},
		{ID: "proj_finance_command", UserID: "user_demo", Name: "Finance Command Center", Description: "Revenue, invoices, accounts, and cash-flow analytics workspace.", DefaultThemeSlug: "precision-indigo", CreatedAt: base.Add(-48 * time.Hour), UpdatedAt: base.Add(-4 * time.Hour)},
		{ID: "proj_inventory_control", UserID: "user_demo", Name: "Inventory Control", Description: "Stock movement, suppliers, warehouse alerts, and SKU monitoring.", DefaultThemeSlug: "emerald-grid", CreatedAt: base.Add(-36 * time.Hour), UpdatedAt: base.Add(-90 * time.Minute)},
	}

	pages := []domain.Page{
		{ID: "page_hospital_overview", ProjectID: "proj_hospital_ops", Name: "Operations Overview", Slug: "operations-overview", PageType: "dashboard", CreatedAt: base.Add(-70 * time.Hour), UpdatedAt: base.Add(-70 * time.Hour)},
		{ID: "page_hospital_patients", ProjectID: "proj_hospital_ops", Name: "Patient Queue", Slug: "patient-queue", PageType: "list", CurrentVersionID: "ver_hospital_patients_1", CreatedAt: base.Add(-68 * time.Hour), UpdatedAt: base.Add(-2 * time.Hour)},
		{ID: "page_finance_overview", ProjectID: "proj_finance_command", Name: "Revenue Overview", Slug: "revenue-overview", PageType: "dashboard", CurrentVersionID: "ver_finance_overview_1", CreatedAt: base.Add(-46 * time.Hour), UpdatedAt: base.Add(-4 * time.Hour)},
		{ID: "page_inventory_stock", ProjectID: "proj_inventory_control", Name: "Stock Monitoring", Slug: "stock-monitoring", PageType: "dashboard", CurrentVersionID: "ver_inventory_stock_1", CreatedAt: base.Add(-34 * time.Hour), UpdatedAt: base.Add(-90 * time.Minute)},
	}

	versions := map[string][]domain.PageVersion{
		"page_hospital_patients": {
			version("ver_hospital_patients_1", "page_hospital_patients", 1, "Create a patient queue list with triage filters", 93, base.Add(-2*time.Hour), schema.PageSchema{
				PageType: "list", Domain: "hospital", Layout: "admin-sidebar", Theme: "medical-clean", Title: "Patient Queue",
				Sections: []schema.Section{
					{Type: "filterToolbar", SearchPlaceholder: "Search patient or doctor", Filters: []string{"Status", "Department", "Doctor", "Visit time"}, PrimaryAction: "Add patient"},
					{Type: "dataTable", Title: "Active Patient Queue", Columns: []string{"Patient", "Doctor", "Department", "Time", "Status"}, Rows: [][]string{{"Ayu Lestari", "Dr. Maya", "Cardiology", "09:30", "Checked in"}, {"Bima Putra", "Dr. Reza", "General", "10:15", "Waiting"}, {"Nadia Sari", "Dr. Sinta", "Pediatrics", "11:20", "In treatment"}}, Actions: []string{"View", "Move"}},
				},
			}),
		},
		"page_finance_overview": {
			version("ver_finance_overview_1", "page_finance_overview", 1, "Create a finance analytics dashboard for revenue and invoices", 91, base.Add(-4*time.Hour), schema.PageSchema{
				PageType: "dashboard", Domain: "finance", Layout: "admin-sidebar", Theme: "precision-indigo", Title: "Finance Performance",
				Sections: []schema.Section{
					{Type: "statsGrid", Items: []schema.MetricItem{{Label: "Revenue", Value: "$128.4k", Trend: "+18%", Icon: "wallet"}, {Label: "Invoices Due", Value: "42", Trend: "-6%", Icon: "calendar"}, {Label: "Active Accounts", Value: "318", Trend: "+9%", Icon: "users"}, {Label: "Cash Flow", Value: "$82.1k", Trend: "+12%", Icon: "activity"}}},
					{Type: "chartPanel", Title: "Revenue Movement", ChartType: "bar", DatasetPreset: "finance-growth"},
					{Type: "dataTable", Title: "Recent Account Records", Columns: []string{"Account", "Owner", "Amount", "Due Date", "Status"}, Rows: [][]string{{"Nusantara Labs", "Finance Lead", "$18,400", "Jun 12", "Paid"}, {"Bumi Retail", "Collections", "$7,900", "Jun 18", "Due"}, {"Astra Clinic", "Finance Lead", "$12,100", "Jun 22", "Review"}}, Actions: []string{"View", "Edit"}},
				},
			}),
		},
		"page_inventory_stock": {
			version("ver_inventory_stock_1", "page_inventory_stock", 1, "Create inventory dashboard with low stock alerts", 94, base.Add(-90*time.Minute), schema.PageSchema{
				PageType: "dashboard", Domain: "inventory", Layout: "admin-sidebar", Theme: "emerald-grid", Title: "Inventory Control",
				Sections: []schema.Section{
					{Type: "statsGrid", Items: []schema.MetricItem{{Label: "Total SKUs", Value: "12,430", Trend: "+12%", Icon: "activity"}, {Label: "Low Stock", Value: "328", Trend: "+8%", Icon: "calendar"}, {Label: "Suppliers", Value: "86", Trend: "+4%", Icon: "users"}, {Label: "Stock Value", Value: "$128.4k", Trend: "+18%", Icon: "wallet"}}},
					{Type: "chartPanel", Title: "Stock Movement", ChartType: "bar", DatasetPreset: "inventory-growth"},
					{Type: "activityTimeline", Title: "Recent Stock Activity", Items: []schema.MetricItem{{Label: "Restock approved", Value: "12 minutes ago", Trend: "ready"}, {Label: "Supplier delay", Value: "Warehouse B", Trend: "watch"}}},
				},
			}),
		},
	}

	return StudioData{
		Projects: projectMap(projects),
		Pages:    pageMap(pages),
		Versions: versions,
		Jobs: map[string]domain.GenerationJob{
			"job_seed_hospital_patients": {ID: "job_seed_hospital_patients", UserID: "user_demo", ProjectID: "proj_hospital_ops", PageID: "page_hospital_patients", RequestID: "seed-hospital-patients", Status: "succeeded", Prompt: "Create a patient queue list with triage filters", CreditCost: 1, StartedAt: base.Add(-2*time.Hour - time.Second), FinishedAt: base.Add(-2 * time.Hour), CreatedAt: base.Add(-2*time.Hour - time.Second), UpdatedAt: base.Add(-2 * time.Hour)},
			"job_seed_inventory_stock":   {ID: "job_seed_inventory_stock", UserID: "user_demo", ProjectID: "proj_inventory_control", PageID: "page_inventory_stock", RequestID: "seed-inventory-stock", Status: "succeeded", Prompt: "Create inventory dashboard with low stock alerts", CreditCost: 1, StartedAt: base.Add(-91 * time.Minute), FinishedAt: base.Add(-90 * time.Minute), CreatedAt: base.Add(-91 * time.Minute), UpdatedAt: base.Add(-90 * time.Minute)},
		},
		Wallet: domain.CreditWallet{UserID: "user_demo", Balance: 42, Transactions: []domain.CreditTransaction{
			{ID: "tx_seed_001", UserID: "user_demo", Type: "usage", Amount: -1, BalanceAfter: 42, ReferenceType: "generation_job", ReferenceID: "job_seed_inventory_stock", Description: "Generated stock monitoring dashboard", CreatedAt: base.Add(-90 * time.Minute)},
			{ID: "tx_seed_002", UserID: "user_demo", Type: "topup", Amount: 25, BalanceAfter: 43, ReferenceType: "topup", ReferenceID: "starter_topup", Description: "Starter top-up", CreatedAt: base.Add(-26 * time.Hour)},
			{ID: "tx_seed_003", UserID: "user_demo", Type: "refund", Amount: 1, BalanceAfter: 18, ReferenceType: "generation_job", ReferenceID: "schema_refund", Description: "Schema validation refund", CreatedAt: base.Add(-30 * time.Hour)},
		}},
		Themes: []domain.Theme{
			{Slug: "medical-clean", Name: "Medical Clean", Accent: "#0891b2"},
			{Slug: "precision-indigo", Name: "Precision Indigo", Accent: "#4f46e5"},
			{Slug: "emerald-grid", Name: "Emerald Grid", Accent: "#059669"},
			{Slug: "studio-neutral", Name: "Studio Neutral", Accent: "#475569"},
			{Slug: "finance-sharp", Name: "Finance Sharp", Accent: "#0f766e"},
		},
		Templates: []domain.Template{
			{ID: "hospital-dashboard", Name: "Hospital Operations", Domain: "hospital", PageType: "dashboard", ComponentHint: 10, Tier: "Free", Description: "Appointments, doctors, departments, and patient flow.", Platform: "web"},
			{ID: "inventory-list", Name: "Inventory List", Domain: "inventory", PageType: "list", ComponentHint: 8, Tier: "Premium", Description: "SKU health, stock movement, and supplier alerts.", Platform: "web"},
			{ID: "finance-analytics", Name: "Finance Analytics", Domain: "finance", PageType: "dashboard", ComponentHint: 9, Tier: "Premium", Description: "Revenue, invoices, accounts, and cash-flow analytics.", Platform: "web"},
			{ID: "school-attendance", Name: "School Attendance", Domain: "education", PageType: "list", ComponentHint: 7, Tier: "Free", Description: "Attendance table, filters, and class-level summaries.", Platform: "web"},
			{ID: "village-management", Name: "Village Management", Domain: "government", PageType: "dashboard", ComponentHint: 9, Tier: "Free", Description: "Citizen services, cases, budgets, and activity reports.", Platform: "web"},
			{ID: "food-delivery-app", Name: "Food Delivery App", Domain: "logistics", PageType: "dashboard", ComponentHint: 6, Tier: "Free", Description: "Active orders, rider earnings, and a live delivery map.", Platform: "mobile"},
			{ID: "fitness-tracker-app", Name: "Fitness Tracker App", Domain: "health", PageType: "dashboard", ComponentHint: 6, Tier: "Free", Description: "Daily activity rings, workouts, and progress streaks.", Platform: "mobile"},
			{ID: "mobile-banking-app", Name: "Mobile Banking App", Domain: "finance", PageType: "dashboard", ComponentHint: 7, Tier: "Premium", Description: "Balance, recent transactions, cards, and quick transfers.", Platform: "mobile"},
		},
	}
}

func version(id, pageID string, number int, prompt string, score float64, createdAt time.Time, pageSchema schema.PageSchema) domain.PageVersion {
	return domain.PageVersion{ID: id, PageID: pageID, VersionNumber: number, Prompt: prompt, SchemaJSON: schemaMap(pageSchema), GeneratedCode: renderer.GenerateTSX(pageSchema), QualityScore: score, CreatedAt: createdAt}
}

func schemaMap(page schema.PageSchema) map[string]interface{} {
	raw, _ := json.Marshal(page)
	var result map[string]interface{}
	_ = json.Unmarshal(raw, &result)
	return result
}

func projectMap(projects []domain.Project) map[string]domain.Project {
	result := make(map[string]domain.Project, len(projects))
	for _, project := range projects {
		result[project.ID] = project
	}
	return result
}

func pageMap(pages []domain.Page) map[string]domain.Page {
	result := make(map[string]domain.Page, len(pages))
	for _, page := range pages {
		result[page.ID] = page
	}
	return result
}

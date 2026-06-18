package schema

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
)

var allowedPageTypes = map[string]bool{
	"dashboard": true,
	"list":      true,
	"form":      true,
	"detail":    true,
	"login":     true,
	"analytics": true,
}

var allowedComponents = map[string]bool{
	"statsGrid":        true,
	"chartPanel":       true,
	"dataTable":        true,
	"activityTimeline": true,
	"filterToolbar":    true,
	"formSection":      true,
	"profileSummary":   true,
	"tabbedContent":    true,
	"kanbanBoard":      true,
	"calendarView":     true,
	"notificationList": true,
	"emptyState":       true,
	"actionFooter":     true,
	// Richer, image/icon-forward sections for broader, Stitch-quality output.
	"hero":         true,
	"gallery":      true,
	"featureGrid":  true,
	"pricingTable": true,
	"testimonials": true,
	"stepper":      true,
	"progressList": true,
	"mapPanel":     true,
}

type PageSchema struct {
	PageType string    `json:"pageType"`
	Domain   string    `json:"domain"`
	Layout   string    `json:"layout"`
	Theme    string    `json:"theme"`
	Title    string    `json:"title"`
	Sections []Section `json:"sections"`
}

type Section struct {
	Type              string            `json:"type"`
	Span              string            `json:"span,omitempty"` // grid width: full|two-thirds|half|third
	Title             string            `json:"title,omitempty"`
	Subtitle          string            `json:"subtitle,omitempty"` // hero/feature supporting copy
	Image             string            `json:"image,omitempty"`    // hero image keywords or resolved URL
	Items             []MetricItem      `json:"items,omitempty"`
	ChartType         string            `json:"chartType,omitempty"`
	DatasetPreset     string            `json:"datasetPreset,omitempty"`
	Columns           []string          `json:"columns,omitempty"`
	Rows              [][]string        `json:"rows,omitempty"`
	Actions           []string          `json:"actions,omitempty"`
	SearchPlaceholder string            `json:"searchPlaceholder,omitempty"`
	Filters           []string          `json:"filters,omitempty"`
	PrimaryAction     string            `json:"primaryAction,omitempty"`
	Fields            []Field           `json:"fields,omitempty"`
	SubmitLabel       string            `json:"submitLabel,omitempty"`
	Entity            string            `json:"entity,omitempty"`
	Properties        map[string]string `json:"properties,omitempty"`
	Tabs              []Tab             `json:"tabs,omitempty"`
}

type MetricItem struct {
	Label string `json:"label"`
	Value string `json:"value"`
	Trend string `json:"trend"`
	Icon  string `json:"icon,omitempty"`
	// Image keywords (e.g. "coffee shop interior") or a resolved http(s) URL.
	Image string `json:"image,omitempty"`
}

type Field struct {
	Label string `json:"label"`
	Type  string `json:"type"`
	Hint  string `json:"hint,omitempty"`
}

type Tab struct {
	Label string   `json:"label"`
	Items []string `json:"items"`
}

// --- Tolerant JSON decoding -------------------------------------------------
// LLMs commonly vary the exact JSON shape (e.g. "stats" instead of "items",
// numeric table cells, numeric metric values). These custom unmarshalers accept
// those variations and normalize them so valid AI output is not rejected.

func anyToString(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	case bool:
		return strconv.FormatBool(t)
	case float64:
		if t == math.Trunc(t) && math.Abs(t) < 1e15 {
			return strconv.FormatInt(int64(t), 10)
		}
		return strconv.FormatFloat(t, 'f', -1, 64)
	case map[string]any:
		return mapLabel(t)
	default:
		b, _ := json.Marshal(t)
		return string(b)
	}
}

func rawToString(r json.RawMessage) string {
	if len(r) == 0 {
		return ""
	}
	var v any
	if err := json.Unmarshal(r, &v); err != nil {
		return strings.Trim(string(r), `"`)
	}
	return anyToString(v)
}

func (m *MetricItem) UnmarshalJSON(data []byte) error {
	type alias MetricItem
	aux := &struct {
		*alias
		Label json.RawMessage `json:"label"`
		Value json.RawMessage `json:"value"`
		Trend json.RawMessage `json:"trend"`
		Icon  json.RawMessage `json:"icon"`
	}{alias: (*alias)(m)}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}
	m.Label = rawToString(aux.Label)
	m.Value = rawToString(aux.Value)
	m.Trend = rawToString(aux.Trend)
	m.Icon = rawToString(aux.Icon)
	return nil
}

func (f *Field) UnmarshalJSON(data []byte) error {
	type alias Field
	aux := &struct {
		*alias
		Label json.RawMessage `json:"label"`
		Type  json.RawMessage `json:"type"`
		Hint  json.RawMessage `json:"hint"`
	}{alias: (*alias)(f)}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}
	f.Label = rawToString(aux.Label)
	f.Type = rawToString(aux.Type)
	f.Hint = rawToString(aux.Hint)
	return nil
}

// normalizeSpan maps the many ways an LLM expresses a grid width to one of the
// four canonical values the renderer understands. Empty means "use the type
// default", so unknown/garbage input degrades gracefully.
func normalizeSpan(v string) string {
	s := strings.ToLower(strings.TrimSpace(v))
	switch s {
	case "full", "wide", "12", "100%", "1", "1/1":
		return "full"
	case "two-thirds", "two thirds", "twothirds", "2/3", "8", "66%", "67%":
		return "two-thirds"
	case "half", "1/2", "6", "50%":
		return "half"
	case "third", "1/3", "4", "33%", "quarter", "1/4", "3", "25%":
		return "third"
	default:
		return ""
	}
}

func mapLabel(m map[string]any) string {
	for _, k := range []string{"label", "name", "value", "title", "text"} {
		if s, ok := m[k].(string); ok {
			return s
		}
	}
	b, _ := json.Marshal(m)
	return string(b)
}

// coerceStrings turns a loosely-typed array (strings, numbers, or objects like
// {label,value}) into a clean []string.
func coerceStrings(arr []any) []string {
	out := make([]string, 0, len(arr))
	for _, v := range arr {
		switch t := v.(type) {
		case string:
			out = append(out, t)
		case map[string]any:
			out = append(out, mapLabel(t))
		default:
			out = append(out, anyToString(v))
		}
	}
	return out
}

func (s *Section) UnmarshalJSON(data []byte) error {
	type alias Section
	aux := &struct {
		*alias
		Type          json.RawMessage `json:"type"`
		Span          json.RawMessage `json:"span"`
		Title         json.RawMessage `json:"title"`
		ChartType     json.RawMessage `json:"chartType"`
		DatasetPreset json.RawMessage `json:"datasetPreset"`
		Search        json.RawMessage `json:"searchPlaceholder"`
		PrimaryAction json.RawMessage `json:"primaryAction"`
		SubmitLabel   json.RawMessage `json:"submitLabel"`
		Entity        json.RawMessage `json:"entity"`
		Subtitle      json.RawMessage `json:"subtitle"`
		Description   json.RawMessage `json:"description"`
		Stats         []MetricItem    `json:"stats"`
		Metrics       []MetricItem    `json:"metrics"`
		Headers       []any           `json:"headers"`
		Cols          []any           `json:"cols"`
		Chart         json.RawMessage `json:"chart"`
		RowsRaw       [][]any         `json:"rows"`
		ColumnsRaw    []any           `json:"columns"`
		FiltersRaw    []any           `json:"filters"`
		ActionsRaw    []any           `json:"actions"`
		PropertiesRaw map[string]any  `json:"properties"`
	}{alias: (*alias)(s)}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}
	s.Type = rawToString(aux.Type)
	s.Span = normalizeSpan(rawToString(aux.Span))
	s.Title = rawToString(aux.Title)
	s.ChartType = rawToString(aux.ChartType)
	s.DatasetPreset = rawToString(aux.DatasetPreset)
	s.SearchPlaceholder = rawToString(aux.Search)
	s.PrimaryAction = rawToString(aux.PrimaryAction)
	s.SubmitLabel = rawToString(aux.SubmitLabel)
	s.Entity = rawToString(aux.Entity)
	s.Subtitle = rawToString(aux.Subtitle)
	if s.Subtitle == "" {
		s.Subtitle = rawToString(aux.Description)
	}
	if len(s.Items) == 0 {
		if len(aux.Stats) > 0 {
			s.Items = aux.Stats
		} else if len(aux.Metrics) > 0 {
			s.Items = aux.Metrics
		}
	}
	switch {
	case len(aux.ColumnsRaw) > 0:
		s.Columns = coerceStrings(aux.ColumnsRaw)
	case len(aux.Headers) > 0:
		s.Columns = coerceStrings(aux.Headers)
	case len(aux.Cols) > 0:
		s.Columns = coerceStrings(aux.Cols)
	}
	if len(aux.FiltersRaw) > 0 {
		s.Filters = coerceStrings(aux.FiltersRaw)
	}
	if len(aux.ActionsRaw) > 0 {
		s.Actions = coerceStrings(aux.ActionsRaw)
	}
	if len(aux.PropertiesRaw) > 0 {
		props := make(map[string]string, len(aux.PropertiesRaw))
		for k, v := range aux.PropertiesRaw {
			props[k] = anyToString(v)
		}
		s.Properties = props
	}
	if s.ChartType == "" {
		if c := rawToString(aux.Chart); c != "" {
			s.ChartType = c
		}
	}
	if len(aux.RowsRaw) > 0 {
		rows := make([][]string, 0, len(aux.RowsRaw))
		for _, r := range aux.RowsRaw {
			cells := make([]string, 0, len(r))
			for _, c := range r {
				cells = append(cells, anyToString(c))
			}
			rows = append(rows, cells)
		}
		s.Rows = rows
	}
	return nil
}

func (t *Tab) UnmarshalJSON(data []byte) error {
	type alias Tab
	aux := &struct {
		*alias
		Items []any `json:"items"`
	}{alias: (*alias)(t)}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}
	if len(aux.Items) > 0 {
		t.Items = coerceStrings(aux.Items)
	}
	return nil
}

func Validate(page PageSchema) error {
	if !allowedPageTypes[page.PageType] {
		return fmt.Errorf("unsupported pageType %q", page.PageType)
	}
	if page.Domain == "" {
		return errors.New("domain is required")
	}
	if page.Layout == "" {
		return errors.New("layout is required")
	}
	if page.Theme == "" {
		return errors.New("theme is required")
	}
	if len(page.Sections) == 0 {
		return errors.New("at least one section is required")
	}

	seen := map[string]bool{}
	for i, section := range page.Sections {
		if !allowedComponents[section.Type] {
			return fmt.Errorf("section %d uses unsupported component %q", i, section.Type)
		}
		seen[section.Type] = true
		// Reject sections that are present but empty — an empty section renders as
		// a broken "No activity" / blank panel, which reads as unfinished. A page
		// that trips these is regenerated (GenerateApp retries) rather than shipped.
		switch section.Type {
		case "statsGrid":
			if len(section.Items) < 3 {
				return errors.New("statsGrid requires at least three metric items")
			}
		case "chartPanel":
			if section.Title == "" || section.ChartType == "" {
				return errors.New("chartPanel requires title and chartType")
			}
		case "dataTable":
			if section.Title == "" || len(section.Columns) < 2 {
				return errors.New("dataTable requires title and at least two columns")
			}
			if len(section.Rows) < 3 {
				return errors.New("dataTable requires at least three example rows")
			}
		case "formSection":
			if section.Title == "" || len(section.Fields) < 2 {
				return errors.New("formSection requires title and at least two fields")
			}
		case "activityTimeline":
			if len(section.Items) < 3 {
				return errors.New("activityTimeline requires at least three items")
			}
		case "notificationList":
			if len(section.Items) < 2 {
				return errors.New("notificationList requires at least two items")
			}
		case "tabbedContent":
			if len(section.Tabs) < 1 {
				return errors.New("tabbedContent requires at least one tab")
			}
		case "profileSummary":
			if len(section.Properties) < 2 {
				return errors.New("profileSummary requires at least two properties")
			}
		case "hero":
			if section.Title == "" {
				return errors.New("hero requires a title")
			}
		case "gallery":
			if len(section.Items) < 3 {
				return errors.New("gallery requires at least three items")
			}
		case "featureGrid":
			if len(section.Items) < 3 {
				return errors.New("featureGrid requires at least three items")
			}
		case "pricingTable":
			if len(section.Items) < 2 {
				return errors.New("pricingTable requires at least two tiers")
			}
		case "testimonials":
			if len(section.Items) < 2 {
				return errors.New("testimonials requires at least two items")
			}
		case "stepper":
			if len(section.Items) < 2 {
				return errors.New("stepper requires at least two steps")
			}
		case "progressList":
			if len(section.Items) < 2 {
				return errors.New("progressList requires at least two items")
			}
		case "mapPanel":
			if len(section.Items) < 2 {
				return errors.New("mapPanel requires at least two locations")
			}
		}
	}

	switch page.PageType {
	case "dashboard":
		// Production-grade density: a dashboard must show KPIs, a chart, AND a
		// table — not just stats with an empty panel.
		if !seen["statsGrid"] || !seen["chartPanel"] || !seen["dataTable"] {
			return errors.New("dashboard requires statsGrid, chartPanel, and dataTable")
		}
	case "list":
		if !seen["filterToolbar"] || !seen["dataTable"] {
			return errors.New("list page requires filterToolbar and dataTable")
		}
	case "form":
		if !seen["formSection"] || !seen["actionFooter"] {
			return errors.New("form page requires formSection and actionFooter")
		}
	case "detail":
		if !seen["profileSummary"] || (!seen["tabbedContent"] && !seen["activityTimeline"]) {
			return errors.New("detail page requires profileSummary plus tabs/activity")
		}
	case "analytics":
		if !seen["statsGrid"] || !seen["filterToolbar"] || !seen["chartPanel"] || !seen["dataTable"] {
			return errors.New("analytics page requires statsGrid, filterToolbar, chartPanel, and dataTable")
		}
	case "login":
		if !seen["formSection"] || !seen["actionFooter"] {
			return errors.New("login page requires formSection and actionFooter")
		}
	}

	return nil
}

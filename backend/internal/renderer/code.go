package renderer

import (
	"encoding/json"
	"fmt"
	"html"
	"regexp"
	"strings"

	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

func Generate(page schema.PageSchema, outputMode string, library string) string {
	switch strings.ToLower(strings.TrimSpace(outputMode)) {
	case "html":
		return GenerateHTML(page)
	case "json":
		raw, err := json.MarshalIndent(page, "", "  ")
		if err != nil {
			return "{}"
		}
		return string(raw)
	default:
		return GenerateKitTSX(page, library)
	}
}

func GenerateTSX(page schema.PageSchema) string {
	var out strings.Builder
	out.WriteString("\"use client\";\n\n")
	out.WriteString(fmt.Sprintf("export default function %s() {\n", componentName(page)))
	out.WriteString("  return (\n")
	out.WriteString("    <main className=\"min-h-screen bg-slate-50 text-slate-950\">\n")
	out.WriteString("      <div className=\"mx-auto max-w-7xl px-6 py-6\">\n")
	out.WriteString(fmt.Sprintf("        <h1 className=\"text-2xl font-semibold\">%s</h1>\n", escape(page.Title)))
	out.WriteString(fmt.Sprintf("        <p className=\"mt-1 text-sm text-slate-500\">%s dashboard generated from a validated schema.</p>\n", title(page.Domain)))
	out.WriteString("        <div className=\"mt-6 space-y-4\">\n")

	for _, section := range page.Sections {
		switch section.Type {
		case "statsGrid":
			out.WriteString("          <section className=\"grid gap-3 md:grid-cols-4\">\n")
			for _, item := range section.Items {
				out.WriteString("            <article className=\"rounded-lg border bg-white p-4 shadow-sm\">\n")
				out.WriteString(fmt.Sprintf("              <p className=\"text-sm text-slate-500\">%s</p>\n", escape(item.Label)))
				out.WriteString(fmt.Sprintf("              <div className=\"mt-3 flex items-end justify-between\"><strong className=\"text-2xl\">%s</strong><span className=\"text-sm text-emerald-600\">%s</span></div>\n", escape(item.Value), escape(item.Trend)))
				out.WriteString("            </article>\n")
			}
			out.WriteString("          </section>\n")
		case "chartPanel":
			out.WriteString("          <section className=\"rounded-lg border bg-white p-4 shadow-sm\">\n")
			out.WriteString(fmt.Sprintf("            <h2 className=\"text-base font-semibold\">%s</h2>\n", escape(section.Title)))
			out.WriteString("            <div className=\"mt-4 grid h-56 grid-cols-12 items-end gap-2 rounded-md bg-slate-50 p-4\">\n")
			for i, height := range []int{38, 56, 44, 72, 64, 92, 76, 104, 86, 118, 96, 132} {
				out.WriteString(fmt.Sprintf("              <div aria-label=\"bar %d\" className=\"rounded-t bg-cyan-600\" style={{ height: \"%d%%\" }} />\n", i+1, height))
			}
			out.WriteString("            </div>\n")
			out.WriteString("          </section>\n")
		case "dataTable":
			out.WriteString("          <section className=\"overflow-hidden rounded-lg border bg-white shadow-sm\">\n")
			out.WriteString(fmt.Sprintf("            <h2 className=\"border-b px-4 py-3 text-base font-semibold\">%s</h2>\n", escape(section.Title)))
			out.WriteString("            <table className=\"w-full text-left text-sm\"><thead className=\"bg-slate-50\"><tr>\n")
			for _, column := range section.Columns {
				out.WriteString(fmt.Sprintf("              <th className=\"px-4 py-3 font-medium text-slate-600\">%s</th>\n", escape(column)))
			}
			out.WriteString("            </tr></thead><tbody>\n")
			for _, row := range section.Rows {
				out.WriteString("              <tr className=\"border-t\">\n")
				for _, cell := range row {
					out.WriteString(fmt.Sprintf("                <td className=\"px-4 py-3\">%s</td>\n", escape(cell)))
				}
				out.WriteString("              </tr>\n")
			}
			out.WriteString("            </tbody></table>\n")
			out.WriteString("          </section>\n")
		case "filterToolbar":
			out.WriteString("          <section className=\"flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4 shadow-sm\">\n")
			out.WriteString(fmt.Sprintf("            <div className=\"rounded-md border px-3 py-2 text-sm text-slate-500\">%s</div>\n", escape(section.SearchPlaceholder)))
			out.WriteString("            <div className=\"flex flex-wrap gap-2\">\n")
			for _, filter := range section.Filters {
				out.WriteString(fmt.Sprintf("              <span className=\"rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600\">%s</span>\n", escape(filter)))
			}
			out.WriteString("            </div>\n")
			out.WriteString(fmt.Sprintf("            <button className=\"rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white\">%s</button>\n", escape(section.PrimaryAction)))
			out.WriteString("          </section>\n")
		case "formSection":
			out.WriteString("          <section className=\"rounded-lg border bg-white p-4 shadow-sm\">\n")
			out.WriteString(fmt.Sprintf("            <h2 className=\"text-base font-semibold\">%s</h2>\n", escape(section.Title)))
			out.WriteString("            <div className=\"mt-4 grid gap-3 md:grid-cols-2\">\n")
			for _, field := range section.Fields {
				out.WriteString("              <label className=\"grid gap-1 text-sm font-medium text-slate-700\">\n")
				out.WriteString(fmt.Sprintf("                %s\n", escape(field.Label)))
				out.WriteString(fmt.Sprintf("                <div className=\"rounded-md border bg-slate-50 px-3 py-2 text-slate-400\">%s input</div>\n", escape(field.Type)))
				if field.Hint != "" {
					out.WriteString(fmt.Sprintf("                <span className=\"text-xs text-slate-500\">%s</span>\n", escape(field.Hint)))
				}
				out.WriteString("              </label>\n")
			}
			out.WriteString("            </div>\n")
			out.WriteString("          </section>\n")
		case "profileSummary":
			out.WriteString("          <section className=\"rounded-lg border bg-white p-4 shadow-sm\">\n")
			out.WriteString(fmt.Sprintf("            <h2 className=\"text-base font-semibold\">%s</h2>\n", escape(section.Title)))
			out.WriteString("            <dl className=\"mt-4 grid gap-3 md:grid-cols-3\">\n")
			for key, value := range section.Properties {
				out.WriteString("              <div className=\"rounded-md bg-slate-50 p-3\">\n")
				out.WriteString(fmt.Sprintf("                <dt className=\"text-xs text-slate-500\">%s</dt>\n", escape(key)))
				out.WriteString(fmt.Sprintf("                <dd className=\"mt-1 font-semibold\">%s</dd>\n", escape(value)))
				out.WriteString("              </div>\n")
			}
			out.WriteString("            </dl>\n")
			out.WriteString("          </section>\n")
		case "tabbedContent":
			out.WriteString("          <section className=\"rounded-lg border bg-white p-4 shadow-sm\">\n")
			out.WriteString("            <div className=\"flex flex-wrap gap-2\">\n")
			for _, tab := range section.Tabs {
				out.WriteString(fmt.Sprintf("              <span className=\"rounded-full border px-3 py-1 text-sm font-medium\">%s</span>\n", escape(tab.Label)))
			}
			out.WriteString("            </div>\n")
			out.WriteString("          </section>\n")
		case "activityTimeline":
			out.WriteString("          <section className=\"rounded-lg border bg-white p-4 shadow-sm\">\n")
			out.WriteString(fmt.Sprintf("            <h2 className=\"text-base font-semibold\">%s</h2>\n", escape(section.Title)))
			out.WriteString("            <ol className=\"mt-4 space-y-3\">\n")
			for _, item := range section.Items {
				out.WriteString(fmt.Sprintf("              <li className=\"rounded-md bg-slate-50 p-3\"><strong>%s</strong><span className=\"ml-2 text-sm text-slate-500\">%s</span></li>\n", escape(item.Label), escape(item.Value)))
			}
			out.WriteString("            </ol>\n")
			out.WriteString("          </section>\n")
		case "actionFooter":
			out.WriteString("          <section className=\"flex justify-end gap-2 rounded-lg border bg-white p-4 shadow-sm\">\n")
			for _, action := range section.Actions {
				out.WriteString(fmt.Sprintf("            <button className=\"rounded-md border px-3 py-2 text-sm font-semibold\">%s</button>\n", escape(action)))
			}
			out.WriteString(fmt.Sprintf("            <button className=\"rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white\">%s</button>\n", escape(section.PrimaryAction)))
			out.WriteString("          </section>\n")
		case "emptyState":
			out.WriteString("          <section className=\"rounded-lg border bg-white p-8 text-center shadow-sm\">\n")
			out.WriteString(fmt.Sprintf("            <h2 className=\"text-base font-semibold\">%s</h2>\n", escape(section.Title)))
			out.WriteString("            <p className=\"mt-2 text-sm text-slate-500\">No records match this generated view.</p>\n")
			out.WriteString("          </section>\n")
		case "notificationList":
			out.WriteString("          <section className=\"rounded-lg border bg-white p-4 shadow-sm\">\n")
			out.WriteString(fmt.Sprintf("            <h2 className=\"text-base font-semibold\">%s</h2>\n", escape(section.Title)))
			out.WriteString("            <div className=\"mt-3 space-y-2\">\n")
			for _, item := range section.Items {
				out.WriteString(fmt.Sprintf("              <div className=\"rounded-md bg-slate-50 p-3 text-sm\"><strong>%s</strong> %s</div>\n", escape(item.Label), escape(item.Value)))
			}
			out.WriteString("            </div>\n")
			out.WriteString("          </section>\n")
		case "kanbanBoard":
			out.WriteString("          <section className=\"grid gap-3 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-3\">\n")
			for _, column := range []string{"Backlog", "In Progress", "Done"} {
				out.WriteString(fmt.Sprintf("            <div className=\"rounded-md bg-slate-50 p-3\"><h3 className=\"text-sm font-semibold\">%s</h3><div className=\"mt-3 rounded bg-white p-3 text-sm shadow-sm\">Generated task</div></div>\n", column))
			}
			out.WriteString("          </section>\n")
		case "calendarView":
			out.WriteString("          <section className=\"rounded-lg border bg-white p-4 shadow-sm\">\n")
			out.WriteString(fmt.Sprintf("            <h2 className=\"text-base font-semibold\">%s</h2>\n", escape(section.Title)))
			out.WriteString("            <div className=\"mt-4 grid grid-cols-7 gap-2 text-center text-sm\">\n")
			for day := 1; day <= 28; day++ {
				out.WriteString(fmt.Sprintf("              <div className=\"rounded-md bg-slate-50 p-2\">%d</div>\n", day))
			}
			out.WriteString("            </div>\n")
			out.WriteString("          </section>\n")
		}
	}

	out.WriteString("        </div>\n")
	out.WriteString("      </div>\n")
	out.WriteString("    </main>\n")
	out.WriteString("  );\n")
	out.WriteString("}\n")
	return out.String()
}

func GenerateHTML(page schema.PageSchema) string {
	var out strings.Builder
	out.WriteString("<main class=\"generated-page\">\n")
	out.WriteString(fmt.Sprintf("  <h1>%s</h1>\n", escape(page.Title)))
	out.WriteString(fmt.Sprintf("  <p>%s dashboard generated from a validated schema.</p>\n", escape(title(page.Domain))))
	for _, section := range page.Sections {
		out.WriteString(fmt.Sprintf("  <section data-component=\"%s\">\n", escape(section.Type)))
		if section.Title != "" {
			out.WriteString(fmt.Sprintf("    <h2>%s</h2>\n", escape(section.Title)))
		}
		for _, item := range section.Items {
			out.WriteString(fmt.Sprintf("    <div><strong>%s</strong><span>%s</span></div>\n", escape(item.Label), escape(item.Value)))
		}
		out.WriteString("  </section>\n")
	}
	out.WriteString("</main>\n")
	return out.String()
}

func escape(value string) string {
	escaped := html.EscapeString(value)
	escaped = strings.ReplaceAll(escaped, "{", "&#123;")
	escaped = strings.ReplaceAll(escaped, "}", "&#125;")
	return escaped
}

func title(value string) string {
	if value == "" {
		return "Custom"
	}
	return strings.ToUpper(value[:1]) + value[1:]
}

func componentName(page schema.PageSchema) string {
	base := page.Title
	if strings.TrimSpace(base) == "" {
		base = page.PageType
	}
	parts := regexp.MustCompile(`[^a-zA-Z0-9]+`).Split(base, -1)
	var out strings.Builder
	for _, part := range parts {
		if part == "" {
			continue
		}
		out.WriteString(strings.ToUpper(part[:1]))
		if len(part) > 1 {
			out.WriteString(part[1:])
		}
	}
	if out.Len() == 0 {
		return "GeneratedPage"
	}
	name := out.String()
	if name[0] >= '0' && name[0] <= '9' {
		name = "Generated" + name
	}
	if !strings.HasSuffix(name, "Page") {
		name += "Page"
	}
	return name
}

package renderer

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/kreasinusantara/ui-generator-backend/internal/designsystem"
	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

// seedOf builds a stable URL-safe seed from text for placeholder media.
func seedOf(s string) string {
	out := strings.Trim(slugRe.ReplaceAllString(strings.ToLower(strings.TrimSpace(s)), "-"), "-")
	if out == "" {
		out = "ui"
	}
	if len(out) > 40 {
		out = out[:40]
	}
	return out
}

func avatarURL(seed string) string {
	return "https://api.dicebear.com/7.x/initials/svg?seed=" + seedOf(seed) + "&backgroundType=gradientLinear&fontWeight=700"
}

var tagRe = regexp.MustCompile(`[^a-z0-9\s,]+`)

func hashNum(s string) int {
	h := 0
	for _, c := range s {
		h = (h*31 + int(c)) % 100000
	}
	return h
}

// photoFor resolves an image source: a real http(s) URL passes through (e.g. from
// an image-gen provider); keyword(s) → a CONTENT-RELEVANT photo (loremflickr); else
// a stable random photo. Mirrors the studio preview so export looks identical.
func photoFor(hint, fallbackSeed string, w, h int) string {
	v := strings.TrimSpace(hint)
	if strings.HasPrefix(strings.ToLower(v), "http://") || strings.HasPrefix(strings.ToLower(v), "https://") {
		return v
	}
	if v != "" {
		tags := tagRe.ReplaceAllString(strings.ToLower(v), "")
		tags = strings.Trim(slugRe.ReplaceAllString(tags, ","), ",")
		if len(tags) > 60 {
			tags = tags[:60]
		}
		return fmt.Sprintf("https://loremflickr.com/%d/%d/%s?lock=%d", w, h, tags, hashNum(v))
	}
	return fmt.Sprintf("https://picsum.photos/seed/%s/%d/%d", seedOf(fallbackSeed), w, h)
}

// generateTokenTSX renders a self-contained Next.js component whose look is driven
// entirely by the design system's CSS-variable tokens — the SAME tokens the studio
// preview uses (internal/designsystem). This is what makes the exported code match
// what the user saw: switching design systems (shadcn → neobrutalism → doodle → …)
// changes the exported file's appearance, not just the preview.
func generateTokenTSX(page schema.PageSchema, ds designsystem.DesignSystem) string {
	var out strings.Builder
	out.WriteString("\"use client\";\n\n")
	out.WriteString(fmt.Sprintf("export default function %s() {\n", componentName(page)))
	out.WriteString("  return (\n")
	out.WriteString("    <div className=\"ui-root\">\n")
	out.WriteString("      <style>{`\n")
	out.WriteString(":root{" + ds.RootVars() + "}\n")
	out.WriteString(tokenSkeletonCSS)
	if css := strings.TrimSpace(ds.CSS); css != "" {
		out.WriteString(css + "\n")
	}
	out.WriteString("`}</style>\n")
	out.WriteString("      <main className=\"ui-page\">\n")
	out.WriteString(fmt.Sprintf("        <header><h1 className=\"ui-h1\">%s</h1><p className=\"ui-sub\">%s</p></header>\n", escape(page.Title), escape(title(page.Domain))+" workspace"))
	out.WriteString("        <div className=\"ui-grid\">\n")
	for _, section := range page.Sections {
		out.WriteString(renderTokenSection(section))
	}
	out.WriteString("        </div>\n")
	out.WriteString("      </main>\n")
	out.WriteString("    </div>\n")
	out.WriteString("  );\n}\n")
	return out.String()
}

func renderTokenSection(section schema.Section) string {
	var b strings.Builder
	card := func(inner string) {
		b.WriteString("          <section className=\"ui-card\">\n")
		b.WriteString(inner)
		b.WriteString("          </section>\n")
	}
	switch section.Type {
	case "statsGrid":
		var s strings.Builder
		if section.Title != "" {
			s.WriteString(fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(section.Title)))
		}
		s.WriteString("            <div className=\"ui-stats\">\n")
		for _, item := range section.Items {
			s.WriteString("              <article className=\"ui-stat\">\n")
			s.WriteString(fmt.Sprintf("                <span className=\"ui-stat-ico\">%s</span>\n", iconSVG(fallbackStr(item.Icon, item.Label))))
			s.WriteString(fmt.Sprintf("                <span className=\"ui-stat-label\">%s</span>\n", escape(item.Label)))
			s.WriteString(fmt.Sprintf("                <strong className=\"ui-stat-value\">%s</strong>\n", escape(item.Value)))
			if item.Trend != "" {
				s.WriteString(fmt.Sprintf("                <span className=\"ui-trend\">%s</span>\n", escape(item.Trend)))
			}
			s.WriteString("              </article>\n")
		}
		s.WriteString("            </div>\n")
		// statsGrid is its own grid; wrap without the card border so it reads like the preview.
		b.WriteString("          <section className=\"ui-block\">\n")
		b.WriteString(s.String())
		b.WriteString("          </section>\n")
	case "chartPanel":
		var s strings.Builder
		s.WriteString(fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(section.Title)))
		s.WriteString("            <div className=\"ui-chart\">\n")
		for _, h := range []int{42, 64, 50, 78, 60, 92, 72, 100, 84} {
			s.WriteString(fmt.Sprintf("              <span className=\"ui-bar\" style={{ height: \"%d%%\" }} />\n", h))
		}
		s.WriteString("            </div>\n")
		card(s.String())
	case "dataTable":
		var s strings.Builder
		if section.Title != "" {
			s.WriteString(fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(section.Title)))
		}
		s.WriteString("            <div style={{ overflowX: \"auto\" }}>\n              <table className=\"ui-table\">\n                <thead><tr>")
		for _, c := range section.Columns {
			s.WriteString(fmt.Sprintf("<th>%s</th>", escape(c)))
		}
		s.WriteString("</tr></thead>\n                <tbody>\n")
		for _, row := range section.Rows {
			s.WriteString("                  <tr>")
			for _, cell := range row {
				s.WriteString(fmt.Sprintf("<td>%s</td>", escape(cell)))
			}
			s.WriteString("</tr>\n")
		}
		s.WriteString("                </tbody>\n              </table>\n            </div>\n")
		card(s.String())
	case "filterToolbar":
		var s strings.Builder
		s.WriteString("            <div style={{ display: \"flex\", flexWrap: \"wrap\", gap: 8, alignItems: \"center\" }}>\n")
		if section.SearchPlaceholder != "" {
			s.WriteString(fmt.Sprintf("              <input className=\"ui-input\" placeholder=\"%s\" />\n", escape(section.SearchPlaceholder)))
		}
		for _, f := range section.Filters {
			s.WriteString(fmt.Sprintf("              <span className=\"ui-chip\">%s</span>\n", escape(f)))
		}
		if section.PrimaryAction != "" {
			s.WriteString(fmt.Sprintf("              <button className=\"ui-btn\">%s</button>\n", escape(section.PrimaryAction)))
		}
		s.WriteString("            </div>\n")
		card(s.String())
	case "formSection":
		var s strings.Builder
		if section.Title != "" {
			s.WriteString(fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(section.Title)))
		}
		for _, field := range section.Fields {
			s.WriteString("            <label className=\"ui-field\">\n")
			s.WriteString(fmt.Sprintf("              <span>%s</span>\n", escape(field.Label)))
			s.WriteString(fmt.Sprintf("              <input className=\"ui-input\" placeholder=\"%s\" />\n", escape(field.Type)))
			s.WriteString("            </label>\n")
		}
		if section.SubmitLabel != "" {
			s.WriteString(fmt.Sprintf("            <button className=\"ui-btn\">%s</button>\n", escape(section.SubmitLabel)))
		}
		card(s.String())
	case "profileSummary":
		entity := fallbackStr(section.Entity, section.Title)
		var s strings.Builder
		s.WriteString("            <div style={{ display: \"flex\", alignItems: \"center\", gap: 14, marginBottom: 14 }}>\n")
		s.WriteString(fmt.Sprintf("              <img className=\"ui-avatar\" src=\"%s\" alt=\"%s\" />\n", avatarURL(entity), escape(entity)))
		s.WriteString(fmt.Sprintf("              <h2 className=\"ui-title\" style={{ margin: 0 }}>%s</h2>\n", escape(entity)))
		s.WriteString("            </div>\n")
		for key, value := range section.Properties {
			s.WriteString(fmt.Sprintf("            <div className=\"ui-prop\"><span>%s</span><strong>%s</strong></div>\n", escape(key), escape(value)))
		}
		card(s.String())
	case "hero":
		var s strings.Builder
		s.WriteString("          <section className=\"ui-hero\">\n            <div>\n")
		s.WriteString(fmt.Sprintf("              <h1 className=\"ui-hero-title\">%s</h1>\n", escape(section.Title)))
		if section.Subtitle != "" {
			s.WriteString(fmt.Sprintf("              <p className=\"ui-hero-sub\">%s</p>\n", escape(section.Subtitle)))
		}
		if section.PrimaryAction != "" {
			s.WriteString(fmt.Sprintf("              <button className=\"ui-btn\" style={{ marginTop: 18 }}>%s</button>\n", escape(section.PrimaryAction)))
		}
		s.WriteString("            </div>\n")
		s.WriteString(fmt.Sprintf("            <img className=\"ui-hero-img\" src=\"%s\" alt=\"\" />\n", photoFor(fallbackStr(section.Image, section.Title), fallbackStr(section.Title, "hero"), 720, 480)))
		s.WriteString("          </section>\n")
		b.WriteString(s.String())
	case "gallery":
		var s strings.Builder
		if section.Title != "" {
			s.WriteString(fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(section.Title)))
		}
		s.WriteString("            <div className=\"ui-gallery\">\n")
		for _, item := range section.Items {
			s.WriteString("              <figure className=\"ui-gcard\">\n")
			s.WriteString(fmt.Sprintf("                <img src=\"%s\" alt=\"%s\" />\n", photoFor(fallbackStr(item.Image, item.Label), fallbackStr(item.Label, item.Value), 480, 320), escape(item.Label)))
			s.WriteString(fmt.Sprintf("                <figcaption><strong>%s</strong><span>%s</span></figcaption>\n", escape(item.Label), escape(item.Value)))
			s.WriteString("              </figure>\n")
		}
		s.WriteString("            </div>\n")
		card(s.String())
	case "featureGrid":
		var s strings.Builder
		if section.Title != "" {
			s.WriteString(fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(section.Title)))
		}
		s.WriteString("            <div className=\"ui-features\">\n")
		for _, item := range section.Items {
			s.WriteString("              <article className=\"ui-feature\">\n")
			s.WriteString(fmt.Sprintf("                <span className=\"ui-feature-ico\">%s</span>\n", iconSVG(fallbackStr(item.Icon, item.Label))))
			s.WriteString(fmt.Sprintf("                <strong>%s</strong>\n", escape(item.Label)))
			if item.Value != "" {
				s.WriteString(fmt.Sprintf("                <p style={{ color: \"var(--muted-fg)\", margin: 0 }}>%s</p>\n", escape(item.Value)))
			}
			s.WriteString("              </article>\n")
		}
		s.WriteString("            </div>\n")
		card(s.String())
	case "activityTimeline", "notificationList":
		var s strings.Builder
		if section.Title != "" {
			s.WriteString(fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(section.Title)))
		}
		for _, item := range section.Items {
			s.WriteString(fmt.Sprintf("            <div className=\"ui-row\"><strong>%s</strong><span>%s</span></div>\n", escape(item.Label), escape(item.Value)))
		}
		card(s.String())
	case "tabbedContent":
		var s strings.Builder
		s.WriteString("            <div style={{ display: \"flex\", gap: 6, flexWrap: \"wrap\" }}>\n")
		for _, tab := range section.Tabs {
			s.WriteString(fmt.Sprintf("              <span className=\"ui-chip\">%s</span>\n", escape(tab.Label)))
		}
		s.WriteString("            </div>\n")
		card(s.String())
	case "actionFooter":
		var s strings.Builder
		s.WriteString("            <div style={{ display: \"flex\", justifyContent: \"flex-end\", gap: 8 }}>\n")
		for _, a := range section.Actions {
			s.WriteString(fmt.Sprintf("              <span className=\"ui-chip\">%s</span>\n", escape(a)))
		}
		if section.PrimaryAction != "" {
			s.WriteString(fmt.Sprintf("              <button className=\"ui-btn\">%s</button>\n", escape(section.PrimaryAction)))
		}
		s.WriteString("            </div>\n")
		card(s.String())
	case "pricingTable":
		var s strings.Builder
		if section.Title != "" {
			s.WriteString(fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(section.Title)))
		}
		s.WriteString("            <div className=\"ui-pricing\">\n")
		for _, item := range section.Items {
			s.WriteString("              <article className=\"ui-price\">\n")
			if item.Trend != "" {
				s.WriteString(fmt.Sprintf("                <span className=\"ui-price-badge\">%s</span>\n", escape(item.Trend)))
			}
			s.WriteString(fmt.Sprintf("                <h3>%s</h3>\n", escape(item.Label)))
			s.WriteString(fmt.Sprintf("                <div className=\"ui-price-amount\">%s</div>\n", escape(item.Value)))
			s.WriteString(fmt.Sprintf("                <button className=\"ui-btn\">%s</button>\n", escape(fallbackStr(section.PrimaryAction, "Choose plan"))))
			s.WriteString("              </article>\n")
		}
		s.WriteString("            </div>\n")
		card(s.String())
	case "testimonials":
		var s strings.Builder
		if section.Title != "" {
			s.WriteString(fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(section.Title)))
		}
		s.WriteString("            <div className=\"ui-quotes\">\n")
		for _, item := range section.Items {
			s.WriteString("              <figure className=\"ui-quote\">\n")
			s.WriteString(fmt.Sprintf("                <blockquote>%s</blockquote>\n", escape(item.Value)))
			s.WriteString("                <figcaption>\n")
			s.WriteString(fmt.Sprintf("                  <img src=\"%s\" alt=\"\" />\n", avatarURL(fallbackStr(item.Label, "user"))))
			s.WriteString(fmt.Sprintf("                  <span><strong>%s</strong>%s</span>\n", escape(item.Label), func() string {
				if item.Trend != "" {
					return "<small>" + escape(item.Trend) + "</small>"
				}
				return ""
			}()))
			s.WriteString("                </figcaption>\n              </figure>\n")
		}
		s.WriteString("            </div>\n")
		card(s.String())
	case "stepper":
		var s strings.Builder
		if section.Title != "" {
			s.WriteString(fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(section.Title)))
		}
		s.WriteString("            <ol className=\"ui-stepper\">\n")
		for i, item := range section.Items {
			s.WriteString("              <li>\n")
			s.WriteString(fmt.Sprintf("                <span className=\"ui-step-num\">%d</span>\n", i+1))
			s.WriteString(fmt.Sprintf("                <div><strong>%s</strong>", escape(item.Label)))
			if item.Value != "" {
				s.WriteString(fmt.Sprintf("<p style={{ color: \"var(--muted-fg)\", margin: 0 }}>%s</p>", escape(item.Value)))
			}
			s.WriteString("</div>\n              </li>\n")
		}
		s.WriteString("            </ol>\n")
		card(s.String())
	case "progressList":
		var s strings.Builder
		if section.Title != "" {
			s.WriteString(fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(section.Title)))
		}
		for _, item := range section.Items {
			s.WriteString("            <div className=\"ui-prog\">\n")
			s.WriteString(fmt.Sprintf("              <div className=\"ui-prog-head\"><span>%s</span><strong>%s</strong></div>\n", escape(item.Label), escape(item.Value)))
			s.WriteString(fmt.Sprintf("              <div className=\"ui-prog-track\"><div className=\"ui-prog-fill\" style={{ width: \"%d%%\" }} /></div>\n", pctOf(item.Value)))
			s.WriteString("            </div>\n")
		}
		card(s.String())
	case "mapPanel":
		var s strings.Builder
		if section.Title != "" {
			s.WriteString(fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(section.Title)))
		}
		s.WriteString("            <div className=\"ui-map\"><div className=\"ui-map-canvas\" /><ul className=\"ui-map-list\">\n")
		for _, item := range section.Items {
			s.WriteString(fmt.Sprintf("              <li><span className=\"ui-map-dot\" /><div><strong>%s</strong>%s</div></li>\n", escape(item.Label), optMuted(item.Value)))
		}
		s.WriteString("            </ul></div>\n")
		card(s.String())
	case "kanbanBoard":
		cols := section.Columns
		if len(cols) == 0 {
			cols = []string{"Backlog", "In Progress", "Done"}
		}
		var s strings.Builder
		if section.Title != "" {
			s.WriteString(fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(section.Title)))
		}
		s.WriteString("            <div className=\"ui-kanban\">\n")
		for ci, col := range cols {
			s.WriteString(fmt.Sprintf("              <div className=\"ui-kb-col\"><div className=\"ui-kb-head\">%s</div>\n", escape(col)))
			for idx, item := range section.Items {
				if idx%len(cols) == ci {
					s.WriteString(fmt.Sprintf("                <div className=\"ui-kb-card\"><strong>%s</strong>%s</div>\n", escape(item.Label), optMuted(item.Value)))
				}
			}
			s.WriteString("              </div>\n")
		}
		s.WriteString("            </div>\n")
		card(s.String())
	case "calendarView":
		var s strings.Builder
		if section.Title != "" {
			s.WriteString(fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(section.Title)))
		}
		s.WriteString("            <div className=\"ui-cal\">\n")
		for _, d := range []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"} {
			s.WriteString(fmt.Sprintf("              <div className=\"ui-cal-dow\">%s</div>\n", d))
		}
		for day := 1; day <= 35; day++ {
			if day > 31 {
				s.WriteString("              <div className=\"ui-cal-cell ui-cal-empty\" />\n")
			} else {
				s.WriteString(fmt.Sprintf("              <div className=\"ui-cal-cell\"><span className=\"ui-cal-day\">%d</span></div>\n", day))
			}
		}
		s.WriteString("            </div>\n")
		card(s.String())
	default:
		inner := fmt.Sprintf("            <h2 className=\"ui-title\">%s</h2>\n", escape(fallbackStr(section.Title, section.Type)))
		card(inner)
	}
	return b.String()
}

func fallbackStr(primary, secondary string) string {
	if strings.TrimSpace(primary) != "" {
		return primary
	}
	return secondary
}

var numRe = regexp.MustCompile(`-?\d+(?:\.\d+)?`)

// pctOf extracts the first number in value and clamps it to 0..100 (for progress bars).
func pctOf(value string) int {
	m := numRe.FindString(value)
	if m == "" {
		return 0
	}
	n, _ := strconv.ParseFloat(m, 64)
	if n < 0 {
		n = 0
	}
	if n > 100 {
		n = 100
	}
	return int(n)
}

// optMuted renders a muted <span> only when value is non-empty.
func optMuted(value string) string {
	if strings.TrimSpace(value) == "" {
		return ""
	}
	return "<span style={{ color: \"var(--muted-fg)\" }}>" + escape(value) + "</span>"
}

// tokenSkeletonCSS is the shared structural CSS that consumes the design tokens.
// It mirrors the studio preview so exported code and preview look the same.
const tokenSkeletonCSS = `*{box-sizing:border-box}
.ui-root{font-family:var(--font);background:var(--content-bg);color:var(--fg);min-height:100vh}
.ui-page{max-width:1180px;margin:0 auto;padding:28px 24px;display:flex;flex-direction:column;gap:20px}
.ui-h1{margin:0;font-size:24px;font-weight:var(--heading-weight,800);text-transform:var(--heading-transform,none)}
.ui-sub{margin:4px 0 0;color:var(--muted-fg);font-size:14px}
.ui-grid{display:flex;flex-direction:column;gap:18px}
.ui-block{display:flex;flex-direction:column;gap:12px}
.ui-card{border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);background:var(--card);box-shadow:var(--shadow);padding:20px}
.ui-title{margin:0 0 14px;font-size:16px;font-weight:var(--heading-weight,700);text-transform:var(--heading-transform,none)}
.ui-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
.ui-stat{border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);background:var(--card);box-shadow:var(--shadow);padding:16px;display:flex;flex-direction:column;gap:6px}
.ui-stat-label{font-size:13px;color:var(--muted-fg);font-weight:600}
.ui-stat-value{font-size:26px;font-weight:800}
.ui-trend{font-size:12px;font-weight:700;color:var(--trend-up,#16a34a)}
.ui-chart{display:flex;align-items:flex-end;gap:8px;height:180px;margin-top:8px}
.ui-bar{flex:1;background:var(--chart-1);border-radius:var(--chart-radius,6px) var(--chart-radius,6px) 0 0}
.ui-table{width:100%;border-collapse:collapse;font-size:14px}
.ui-table th{text-align:left;padding:10px 14px;background:var(--muted);color:var(--muted-fg);font-size:12px;text-transform:uppercase;border-bottom:1px solid var(--border)}
.ui-table td{padding:11px 14px;border-bottom:1px solid var(--border)}
.ui-chip{display:inline-block;padding:5px 12px;border-radius:999px;background:var(--accent);color:var(--accent-fg);font-size:12px;font-weight:600}
.ui-btn{border:0;border-radius:var(--radius);background:var(--primary);color:var(--primary-fg);padding:10px 16px;font-weight:600;cursor:pointer;box-shadow:var(--shadow)}
.ui-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;font-size:14px;font-weight:600}
.ui-input{border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);padding:10px 12px;background:var(--card);color:var(--fg);font:inherit}
.ui-prop{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
.ui-row{display:flex;justify-content:space-between;gap:12px;padding:10px;border-radius:var(--radius);background:var(--muted);margin-bottom:8px}
.ic{width:18px;height:18px;display:block}
.ui-stat-ico{width:36px;height:36px;border-radius:var(--radius);background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center;margin-bottom:4px}
.ui-avatar{width:54px;height:54px;border-radius:var(--radius);object-fit:cover;border:var(--border-width,1px) solid var(--border)}
.ui-hero{display:grid;grid-template-columns:1.1fr .9fr;gap:28px;align-items:center;border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);background:var(--card);box-shadow:var(--shadow);padding:36px;overflow:hidden}
.ui-hero-title{margin:0;font-size:30px;font-weight:var(--heading-weight,800);text-transform:var(--heading-transform,none);line-height:1.1}
.ui-hero-sub{margin:14px 0 0;color:var(--muted-fg);font-size:15px;line-height:1.5}
.ui-hero-img{width:100%;height:260px;object-fit:cover;border-radius:var(--radius);border:var(--border-width,1px) solid var(--border)}
.ui-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.ui-gcard{margin:0;border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--card)}
.ui-gcard img{width:100%;height:150px;object-fit:cover;display:block}
.ui-gcard figcaption{display:flex;flex-direction:column;gap:2px;padding:12px 14px;font-size:14px}
.ui-features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.ui-feature{border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);background:var(--card);box-shadow:var(--shadow);padding:20px;display:flex;flex-direction:column;gap:10px}
.ui-feature-ico{width:44px;height:44px;border-radius:var(--radius);background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center}
.ui-pricing{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.ui-price{position:relative;border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);background:var(--card);box-shadow:var(--shadow);padding:24px;display:flex;flex-direction:column;gap:14px;text-align:center}
.ui-price h3{margin:0;font-size:15px;font-weight:700}
.ui-price-amount{font-size:30px;font-weight:800}
.ui-price-badge{position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--primary);color:var(--primary-fg);font-size:11px;font-weight:700;padding:3px 12px;border-radius:999px}
.ui-quotes{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.ui-quote{margin:0;border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);background:var(--card);box-shadow:var(--shadow);padding:22px;display:flex;flex-direction:column;gap:16px}
.ui-quote blockquote{margin:0;font-size:14px;line-height:1.6}
.ui-quote figcaption{display:flex;align-items:center;gap:12px}
.ui-quote figcaption img{width:40px;height:40px;border-radius:999px;object-fit:cover}
.ui-quote figcaption span{display:flex;flex-direction:column;font-size:13px;font-weight:700}
.ui-stepper{list-style:none;margin:0;padding:0;display:grid;gap:18px}
.ui-stepper li{display:flex;gap:14px;align-items:flex-start}
.ui-step-num{flex-shrink:0;width:30px;height:30px;border-radius:999px;background:var(--primary);color:var(--primary-fg);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}
.ui-prog{display:grid;gap:7px;margin-bottom:14px}
.ui-prog-head{display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:var(--muted-fg)}
.ui-prog-head strong{color:var(--fg)}
.ui-prog-track{height:8px;border-radius:999px;background:var(--muted);overflow:hidden}
.ui-prog-fill{height:100%;border-radius:999px;background:var(--primary)}
.ui-map{display:grid;grid-template-columns:1.4fr 1fr;gap:16px}
.ui-map-canvas{min-height:200px;border-radius:var(--radius);border:1px solid var(--border);background:linear-gradient(135deg,var(--accent),var(--muted))}
.ui-map-list{list-style:none;margin:0;padding:0;display:grid;gap:12px;align-content:start;font-size:13px}
.ui-map-list li{display:flex;gap:10px;align-items:flex-start}
.ui-map-list strong{display:block;font-weight:700}
.ui-map-dot{margin-top:5px;width:8px;height:8px;border-radius:999px;background:var(--primary);flex-shrink:0}
.ui-kanban{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;align-items:start}
.ui-kb-col{background:var(--muted);border-radius:var(--radius);padding:12px;display:grid;gap:10px;align-content:start}
.ui-kb-head{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted-fg)}
.ui-kb-card{background:var(--card);border:1px solid var(--border);border-radius:calc(var(--radius) - 2px);padding:10px 12px;font-size:13px;display:flex;flex-direction:column;gap:3px}
.ui-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.ui-cal-dow{font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted-fg);text-align:center}
.ui-cal-cell{min-height:60px;border:1px solid var(--border);border-radius:calc(var(--radius) - 2px);padding:6px;background:var(--card)}
.ui-cal-empty{background:var(--muted);border-style:dashed}
.ui-cal-day{font-size:12px;font-weight:700;color:var(--muted-fg)}
`

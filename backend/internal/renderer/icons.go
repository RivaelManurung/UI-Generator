package renderer

import "strings"

// iconPaths mirrors the studio preview's lucide-style icon set so EXPORTED code
// renders the same real icons (inline SVG, no dependency) instead of a "■".
var iconPaths = map[string]string{
	"activity":      `<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>`,
	"users":         `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
	"user":          `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
	"calendar":      `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>`,
	"wallet":        `<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>`,
	"dollar":        `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
	"credit-card":   `<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>`,
	"trending-up":   `<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>`,
	"trending-down": `<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>`,
	"box":           `<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>`,
	"cart":          `<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>`,
	"bag":           `<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>`,
	"bar":           `<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>`,
	"line":          `<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>`,
	"pie":           `<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>`,
	"clock":         `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
	"bell":          `<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>`,
	"check":         `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
	"alert":         `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
	"search":        `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
	"file":          `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>`,
	"mail":          `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>`,
	"home":          `<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
	"star":          `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
	"eye":           `<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`,
	"layers":        `<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`,
	"building":      `<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/>`,
	"truck":         `<path d="M5 18H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h11v12"/><path d="M14 9h4l3 3v5a1 1 0 0 1-1 1h-2"/><circle cx="7.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/>`,
	"zap":           `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
	"shield":        `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
	"globe":         `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,
	"target":        `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
	"phone":         `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>`,
	"link":          `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
	"tag":           `<path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>`,
	"filter":        `<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>`,
	"download":      `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
	"upload":        `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>`,
	"message":       `<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>`,
	"lock":          `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
	"gift":          `<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>`,
	"percent":       `<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>`,
	"refresh":       `<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>`,
	"briefcase":     `<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>`,
	"pin":           `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>`,
	"edit":          `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>`,
	"send":          `<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>`,
}

type iconAlias struct {
	keywords []string
	name     string
}

var iconAliases = []iconAlias{
	{[]string{"revenue", "sales", "income", "profit", "growth", "conversion", "rate", "roi", "margin"}, "trending-up"},
	{[]string{"order", "purchase", "checkout", "cart", "basket"}, "cart"},
	{[]string{"product", "sku", "stock", "inventory", "item", "package", "shipment"}, "box"},
	{[]string{"user", "customer", "patient", "student", "member", "people", "staff", "team", "lead", "visitor"}, "users"},
	{[]string{"money", "payment", "invoice", "balance", "cost", "price", "cash", "fee", "spend", "wallet"}, "dollar"},
	{[]string{"card", "transaction"}, "credit-card"},
	{[]string{"appointment", "schedule", "date", "event", "booking", "calendar"}, "calendar"},
	{[]string{"time", "duration", "fulfil", "delivery", "eta", "hour", "pending", "wait"}, "clock"},
	{[]string{"alert", "warn", "risk", "low", "overdue", "error"}, "alert"},
	{[]string{"notification", "message", "inbox", "email", "mail"}, "mail"},
	{[]string{"report", "document", "file", "export"}, "file"},
	{[]string{"chart", "analytic", "metric", "stat", "trend"}, "bar"},
	{[]string{"security", "secure", "shield", "compliance"}, "shield"},
	{[]string{"ship", "truck", "logistic", "warehouse", "transit"}, "truck"},
	{[]string{"store", "shop", "retail", "building", "branch", "office"}, "building"},
	{[]string{"rating", "review", "star", "favorite"}, "star"},
	{[]string{"view", "impression", "traffic", "visit"}, "eye"},
	{[]string{"target", "goal", "objective", "kpi"}, "target"},
}

func resolveIcon(raw string) string {
	key := strings.ToLower(strings.TrimSpace(raw))
	if key != "" {
		if _, ok := iconPaths[key]; ok {
			return key
		}
		for _, a := range iconAliases {
			for _, kw := range a.keywords {
				if strings.Contains(key, kw) {
					return a.name
				}
			}
		}
	}
	return "activity"
}

// iconSVG returns an inline SVG markup string for the resolved icon name.
func iconSVG(name string) string {
	return `<svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">` + iconPaths[resolveIcon(name)] + `</svg>`
}

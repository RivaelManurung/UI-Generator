package ai

import (
	"fmt"
	"math/rand"
	"strings"
)

// Variation makes the generator behave like Stitch: the SAME brief yields a
// visibly DIFFERENT composition on every run, instead of one fixed skeleton.
//
// It varies ONLY structure — composition rhythm, which optional sections
// appear, their order/spans, density and copy tone. It NEVER touches the
// theme/palette: that stays locked to the theme the user chose at generate
// time (a hard product rule). Layout (sidebar vs top-nav) is intentionally left
// to the model, which derives it from the product type, so the shell stays
// coherent across the pages of one generation.

var compositionRhythms = []string{
	"Open with a punchy hero or a bold KPI band, then break into an asymmetric bento grid.",
	"Lead with the primary chart/visualization, surrounded by compact supporting panels.",
	"Editorial rhythm: one wide focal section up top, then a tighter multi-column grid below.",
	"Dense operations console: a KPI band, then a two-thirds work area beside a one-third live side rail.",
	"Card-forward layout: alternate full-width feature rows with paired half-width panels.",
	"Split focus: a prominent left work column with a persistent right insights/activity rail.",
}

var sectionMixBiases = []string{
	"lean on a kanbanBoard or stepper to surface workflow/process.",
	"lean visual with a gallery or featureGrid.",
	"lean operational with an activityTimeline plus a notificationList.",
	"work in a calendarView or mapPanel if the brief has any temporal or location angle.",
	"lean analytics-heavy with a progressList and a second chartPanel.",
	"organize secondary detail compactly inside a tabbedContent block.",
}

var densities = []string{
	"comfortable spacing with generous whitespace",
	"dense, information-rich packing like a pro ops console",
	"spacious, premium spacing built around a few large focal elements",
}

var designTones = []string{
	"confident and product-grade (Linear / Vercel feel)",
	"warm and approachable",
	"sharp, data-driven and editorial",
	"clean, minimal and focused",
}

// variation is one rolled creative direction for a single generation call.
type variation struct {
	Seed        int64
	Rhythm      string
	Mix         string
	Density     string
	Tone        string
	Temperature float64
}

// newVariation rolls a fresh creative direction. math/rand is auto-seeded on
// Go 1.20+, so each process — and each call — produces a different take.
func newVariation() variation {
	seed := rand.Int63()
	return variation{
		Seed:    seed,
		Rhythm:  pickFrom(compositionRhythms, seed),
		Mix:     pickFrom(sectionMixBiases, seed>>8),
		Density: pickFrom(densities, seed>>16),
		Tone:    pickFrom(designTones, seed>>24),
		// 0.82–1.00: enough spread for genuinely distinct takes. GenerateSchema
		// wraps this in a retry (calmer temperature on the 2nd try) so the extra
		// creativity never raises the malformed-JSON → mock-fallback rate.
		Temperature: 0.82 + rand.Float64()*0.18,
	}
}

func pickFrom(pool []string, n int64) string {
	if n < 0 {
		n = -n
	}
	return pool[int(n)%len(pool)]
}

// directive renders the variation as a compact instruction block appended to
// the user prompt. The "token" defeats any provider-side response caching for
// identical prompts and signals the model to produce a fresh take.
func (v variation) directive() string {
	var b strings.Builder
	fmt.Fprintf(&b, "\n\nDESIGN VARIATION (token %d) — produce a DISTINCT take on this brief, NOT a default skeleton:\n", v.Seed%100000)
	fmt.Fprintf(&b, "- Composition: %s\n", v.Rhythm)
	fmt.Fprintf(&b, "- This run, %s\n", v.Mix)
	fmt.Fprintf(&b, "- Density: %s.\n", v.Density)
	fmt.Fprintf(&b, "- Tone: %s.\n", v.Tone)
	b.WriteString("- Vary which OPTIONAL sections appear and their order/spans versus a typical layout, while still satisfying the required sections for this page type.\n")
	b.WriteString("- LOCKED: keep the given theme/palette EXACTLY — do NOT change colors, accent, or theme. Vary only structure, composition, section mix, and copy.")
	return b.String()
}

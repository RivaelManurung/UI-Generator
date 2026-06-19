package ai

import (
	"strings"
	"testing"
)

func TestNewVariationStaysWithinBounds(t *testing.T) {
	for i := 0; i < 200; i++ {
		v := newVariation()
		if v.Temperature < 0.82 || v.Temperature > 1.0 {
			t.Fatalf("temperature out of range: %f", v.Temperature)
		}
		if v.Rhythm == "" || v.Mix == "" || v.Density == "" || v.Tone == "" {
			t.Fatalf("variation has an empty axis: %+v", v)
		}
	}
}

func TestVariationProducesDifferentTakes(t *testing.T) {
	// The whole point is that the SAME brief yields different directions. Over a
	// batch of rolls, the seeds must not all collapse to one value.
	seen := map[int64]struct{}{}
	for i := 0; i < 50; i++ {
		seen[newVariation().Seed] = struct{}{}
	}
	if len(seen) < 25 {
		t.Fatalf("expected varied seeds, got only %d distinct out of 50", len(seen))
	}
}

func TestVariationDirectiveLocksTheme(t *testing.T) {
	d := newVariation().directive()
	if !strings.Contains(d, "LOCKED") || !strings.Contains(strings.ToLower(d), "do not change colors") {
		t.Fatalf("directive must instruct the model to keep the theme/palette locked, got:\n%s", d)
	}
	if !strings.Contains(d, "DESIGN VARIATION") {
		t.Fatalf("directive should carry the variation token header, got:\n%s", d)
	}
}

func TestSchemaUserPromptCarriesVariation(t *testing.T) {
	req := GenerateRequest{Prompt: "finance app", PageType: "dashboard", Domain: "finance", ThemeSlug: "soft"}
	out := schemaUserPrompt(req, newVariation())
	if !strings.Contains(out, "DESIGN VARIATION") || !strings.Contains(out, "LOCKED") {
		t.Fatalf("schemaUserPrompt must append the variation directive")
	}
}

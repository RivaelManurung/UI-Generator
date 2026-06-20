// Package designsystem is the SINGLE SOURCE OF TRUTH for visual design systems
// (shadcn, neobrutalism, doodle, glass, soft, …). The token map drives BOTH the
// live studio preview (frontend, via the /themes API) AND the exported code
// (backend renderer), so the two can no longer drift.
package designsystem

import (
	_ "embed"
	"encoding/json"
	"sort"
	"strings"
)

//go:embed systems.json
var rawSystems []byte

// DesignSystem is one selectable visual style. Tokens are flat CSS custom
// property values keyed WITHOUT the leading "--" (e.g. "radius" → --radius).
type DesignSystem struct {
	Slug        string            `json:"slug"`
	Name        string            `json:"name"`
	Library     string            `json:"library"` // export component library (shadcn/antd/...) for import banners
	Cost        int               `json:"cost"`
	Status      string            `json:"status"`
	Description string            `json:"description"`
	FontURL     string            `json:"fontUrl"`
	CSS         string            `json:"css"` // extra raw CSS appended after the skeleton (structural quirks)
	Tokens      map[string]string `json:"tokens"`
	// Platforms this style is offered for in the studio picker: "web", "mobile",
	// or both. Empty = available for both (back-compat).
	Platforms []string `json:"platforms,omitempty"`
}

var (
	catalog []DesignSystem
	bySlug  map[string]DesignSystem
)

func init() {
	if err := json.Unmarshal(rawSystems, &catalog); err != nil {
		panic("designsystem: invalid systems.json: " + err.Error())
	}
	bySlug = make(map[string]DesignSystem, len(catalog))
	for _, ds := range catalog {
		bySlug[strings.ToLower(ds.Slug)] = ds
	}
}

// All returns every design system in catalog order.
func All() []DesignSystem {
	out := make([]DesignSystem, len(catalog))
	copy(out, catalog)
	return out
}

// Get returns the design system for slug, falling back to shadcn when unknown.
func Get(slug string) DesignSystem {
	if ds, ok := bySlug[strings.ToLower(strings.TrimSpace(slug))]; ok {
		return ds
	}
	return bySlug["shadcn"]
}

// Has reports whether slug is a known design system.
func Has(slug string) bool {
	_, ok := bySlug[strings.ToLower(strings.TrimSpace(slug))]
	return ok
}

// RootVars renders the design system's tokens as a CSS custom-property block
// suitable for injection into ":root{ ... }" — identical for preview and export.
func (ds DesignSystem) RootVars() string {
	keys := make([]string, 0, len(ds.Tokens))
	for k := range ds.Tokens {
		keys = append(keys, k)
	}
	sort.Strings(keys) // stable output so the rendered code is deterministic
	var b strings.Builder
	for _, k := range keys {
		b.WriteString("--")
		b.WriteString(k)
		b.WriteString(":")
		b.WriteString(ds.Tokens[k])
		b.WriteString(";")
	}
	return b.String()
}

// Token returns one token value (empty string when absent).
func (ds DesignSystem) Token(key string) string { return ds.Tokens[key] }

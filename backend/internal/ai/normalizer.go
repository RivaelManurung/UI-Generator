package ai

import (
	"fmt"
	"strings"

	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

type Intent struct {
	PageType string
	Domain   string
	Entities []string
}

func NormalizeIntent(prompt string, fallbackPageType string, fallbackDomain string) Intent {
	trimmed := strings.ToLower(strings.TrimSpace(prompt))
	intent := Intent{
		PageType: fallback(fallbackPageType, "dashboard"),
		Domain:   fallback(fallbackDomain, "custom"),
	}
	switch {
	case strings.Contains(trimmed, "login") || strings.Contains(trimmed, "sign in"):
		intent.PageType = "login"
	case strings.Contains(trimmed, "form"):
		intent.PageType = "form"
	case strings.Contains(trimmed, "detail") || strings.Contains(trimmed, "profile"):
		intent.PageType = "detail"
	case strings.Contains(trimmed, "table") || strings.Contains(trimmed, "list"):
		intent.PageType = "list"
	case strings.Contains(trimmed, "analytics"):
		intent.PageType = "analytics"
	}
	for _, domain := range []string{"hospital", "school", "education", "finance", "inventory", "government", "crm", "pos", "hr"} {
		if strings.Contains(trimmed, domain) {
			intent.Domain = domain
			break
		}
	}
	return intent
}


func ValidateGeneratedSchema(page schema.PageSchema) error {
	// 1. Basic schema validation
	if err := schema.Validate(page); err != nil {
		return err
	}

	// 2. Max sections limit
	if len(page.Sections) > 15 {
		return fmt.Errorf("schema has too many sections: %d (max 15)", len(page.Sections))
	}

	// 3. String length and safety checks
	var checkValue func(val string) error
	checkValue = func(val string) error {
		if len(val) > 5000 {
			return fmt.Errorf("schema contains string exceeding max length of 5000: %d characters", len(val))
		}
		valLower := strings.ToLower(val)

		// Unsafe schemes/URLs
		if strings.HasPrefix(valLower, "javascript:") ||
			strings.HasPrefix(valLower, "data:") ||
			strings.HasPrefix(valLower, "file:") {
			return fmt.Errorf("unsafe URL scheme detected: %q", val)
		}

		// Dangerous HTML/Javascript tags and handlers
		for _, dangerous := range []string{"<script", "onerror", "onload", "onclick", "dangerouslysetinnerhtml"} {
			if strings.Contains(valLower, dangerous) {
				return fmt.Errorf("unsafe content/script tag detected: %q", val)
			}
		}

		// Filesystem path traversal attempt
		if strings.Contains(valLower, "../") || strings.Contains(valLower, "..\\") {
			return fmt.Errorf("potential directory traversal detected: %q", val)
		}

		return nil
	}

	// Traverse page title
	if err := checkValue(page.Title); err != nil {
		return err
	}

	// Traverse sections
	for _, s := range page.Sections {
		if err := checkValue(s.Type); err != nil {
			return err
		}
		if err := checkValue(s.ChartType); err != nil {
			return err
		}
		if err := checkValue(s.DatasetPreset); err != nil {
			return err
		}
		if err := checkValue(s.Title); err != nil {
			return err
		}
		if err := checkValue(s.SearchPlaceholder); err != nil {
			return err
		}
		if err := checkValue(s.SubmitLabel); err != nil {
			return err
		}
		if err := checkValue(s.PrimaryAction); err != nil {
			return err
		}
		if err := checkValue(s.Entity); err != nil {
			return err
		}

		for _, col := range s.Columns {
			if err := checkValue(col); err != nil {
				return err
			}
		}
		for _, row := range s.Rows {
			for _, cell := range row {
				if err := checkValue(cell); err != nil {
					return err
				}
			}
		}
		for _, act := range s.Actions {
			if err := checkValue(act); err != nil {
				return err
			}
		}
		for _, flt := range s.Filters {
			if err := checkValue(flt); err != nil {
				return err
			}
		}
		for _, fld := range s.Fields {
			if err := checkValue(fld.Label); err != nil {
				return err
			}
			if err := checkValue(fld.Type); err != nil {
				return err
			}
			if err := checkValue(fld.Hint); err != nil {
				return err
			}
		}
		for _, item := range s.Items {
			if err := checkValue(item.Label); err != nil {
				return err
			}
			if err := checkValue(item.Value); err != nil {
				return err
			}
			if err := checkValue(item.Trend); err != nil {
				return err
			}
			if err := checkValue(item.Icon); err != nil {
				return err
			}
		}
		for _, tab := range s.Tabs {
			if err := checkValue(tab.Label); err != nil {
				return err
			}
			for _, item := range tab.Items {
				if err := checkValue(item); err != nil {
					return err
				}
			}
		}
		for k, v := range s.Properties {
			if err := checkValue(k); err != nil {
				return err
			}
			if err := checkValue(v); err != nil {
				return err
			}
		}
	}

	return nil
}

func fallback(value string, fallbackValue string) string {
	if strings.TrimSpace(value) == "" {
		return fallbackValue
	}
	return strings.TrimSpace(value)
}

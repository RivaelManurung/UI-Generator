package config

import "testing"

func TestValidateRejectsWeakProductionSecret(t *testing.T) {
	cfg := Config{
		Environment:        "production",
		JWTSecret:          "dev-only-change-me",
		DatabaseURL:        "postgres://example",
		RedisURL:           "redis://example",
		AccessTokenTTL:     1,
		RefreshTokenTTL:    2,
		AllowedCORSOrigins: []string{"https://example.com"},
	}

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected weak production JWT secret to be rejected")
	}
}

func TestValidateRejectsWildcardProductionCORS(t *testing.T) {
	cfg := Config{
		Environment:        "production",
		JWTSecret:          "this-secret-is-long-enough-for-production",
		DatabaseURL:        "postgres://example",
		RedisURL:           "redis://example",
		AccessTokenTTL:     1,
		RefreshTokenTTL:    2,
		AllowedCORSOrigins: []string{"*"},
	}

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected wildcard production CORS to be rejected")
	}
}

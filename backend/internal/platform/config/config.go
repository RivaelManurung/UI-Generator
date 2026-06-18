package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	DatabaseURL        string
	RedisURL           string
	JWTSecret          string
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	AllowedCORSOrigins []string
	Environment        string
	AIProvider         string
	GeminiAPIKey       string
	OpenAIAPIKey       string
	OpenAIBaseURL      string
	OpenAIModel        string
}

func Load() Config {
	_ = godotenv.Load(".env", "backend/.env")

	provider := strings.ToLower(env("AI_PROVIDER", "gemini"))

	// OpenAI-compatible settings. Works with OpenAI, 9Router (a local gateway at
	// http://localhost:20128/v1), CommandCode, OpenRouter, etc. Selecting a known
	// provider defaults its base URL; the key may come from OPENAI_API_KEY,
	// NINEROUTER_API_KEY, or COMMANDCODE_API_KEY.
	openAIBase := os.Getenv("OPENAI_BASE_URL")
	openAIKey := os.Getenv("OPENAI_API_KEY")
	if openAIKey == "" {
		openAIKey = os.Getenv("TOKENROUTER_API_KEY")
	}
	if openAIKey == "" {
		openAIKey = os.Getenv("OPENROUTER_API_KEY")
	}
	if openAIKey == "" {
		openAIKey = os.Getenv("NINEROUTER_API_KEY")
	}
	if openAIKey == "" {
		openAIKey = os.Getenv("COMMANDCODE_API_KEY")
	}
	openAIModel := os.Getenv("OPENAI_MODEL")
	if strings.TrimSpace(openAIBase) == "" {
		switch provider {
		case "tokenrouter":
			openAIBase = "https://api.tokenrouter.com/v1"
		case "openrouter":
			openAIBase = "https://openrouter.ai/api/v1"
		case "9router", "ninerouter":
			openAIBase = "http://localhost:20128/v1"
		case "commandcode":
			openAIBase = "https://api.commandcode.ai/provider/v1"
		}
	}

	return Config{
		Port:               env("PORT", "8080"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		RedisURL:           os.Getenv("REDIS_URL"),
		JWTSecret:          env("JWT_SECRET", "dev-only-change-me"),
		AccessTokenTTL:     durationEnv("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL:    durationEnv("REFRESH_TOKEN_TTL", 30*24*time.Hour),
		AllowedCORSOrigins: csvEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"),
		Environment:        env("APP_ENV", "development"),
		AIProvider:         provider,
		GeminiAPIKey:       os.Getenv("GEMINI_API_KEY"),
		OpenAIAPIKey:       openAIKey,
		OpenAIBaseURL:      openAIBase,
		OpenAIModel:        openAIModel,
	}
}

// isOpenAICompatible reports whether the provider uses the OpenAI Chat
// Completions API shape (OpenAI itself or CommandCode's provider gateway).
func isOpenAICompatible(provider string) bool {
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "openai", "tokenrouter", "openrouter", "commandcode", "9router", "ninerouter":
		return true
	default:
		return false
	}
}

func (c Config) Validate() error {
	if strings.EqualFold(c.Environment, "production") {
		if c.JWTSecret == "" || c.JWTSecret == "dev-only-change-me" || len(c.JWTSecret) < 32 {
			return errors.New("JWT_SECRET must be set to a strong value in production")
		}
		if c.DatabaseURL == "" {
			return errors.New("DATABASE_URL is required in production")
		}
		if c.RedisURL == "" {
			return errors.New("REDIS_URL is required in production")
		}
		for _, origin := range c.AllowedCORSOrigins {
			if origin == "*" {
				return errors.New("wildcard CORS origin is not allowed in production")
			}
		}
		// production cannot start with mock provider
		if strings.EqualFold(c.AIProvider, "mock") {
			return errors.New("mock AI provider is forbidden in production")
		}
		// production must check provider key
		if strings.EqualFold(c.AIProvider, "gemini") && c.GeminiAPIKey == "" {
			return errors.New("GEMINI_API_KEY is required in production when AI_PROVIDER is gemini")
		}
		if isOpenAICompatible(c.AIProvider) && c.OpenAIAPIKey == "" {
			return errors.New("OPENAI_API_KEY (or COMMANDCODE_API_KEY) is required in production for this AI_PROVIDER")
		}
	} else {
		// In local dev, mock is allowed, but other providers must be configured if chosen
		if isOpenAICompatible(c.AIProvider) && c.OpenAIAPIKey == "" {
			return errors.New("OPENAI_API_KEY (or COMMANDCODE_API_KEY) is required when AI_PROVIDER is openai/commandcode")
		}
		if strings.EqualFold(c.AIProvider, "gemini") && c.GeminiAPIKey == "" {
			return errors.New("GEMINI_API_KEY is required when AI_PROVIDER is gemini")
		}
	}
	if c.AccessTokenTTL <= 0 {
		return fmt.Errorf("ACCESS_TOKEN_TTL must be positive")
	}
	if c.RefreshTokenTTL <= c.AccessTokenTTL {
		return fmt.Errorf("REFRESH_TOKEN_TTL must be greater than ACCESS_TOKEN_TTL")
	}
	return nil
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func csvEnv(key, fallback string) []string {
	raw := env(key, fallback)
	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			values = append(values, trimmed)
		}
	}
	return values
}

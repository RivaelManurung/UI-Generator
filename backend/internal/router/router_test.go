package router

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/platform/config"
)

func TestRegisterDuplicateEmailReturnsConflict(t *testing.T) {
	r := NewWithConfig(testConfig())
	body := []byte(`{"name":"Ari","email":"duplicate@example.com","password":"password123"}`)

	first := httptest.NewRecorder()
	r.ServeHTTP(first, httptest.NewRequest(http.MethodPost, "/v1/auth/register", bytes.NewReader(body)))
	if first.Code != http.StatusCreated {
		t.Fatalf("expected first register 201, got %d: %s", first.Code, first.Body.String())
	}

	second := httptest.NewRecorder()
	r.ServeHTTP(second, httptest.NewRequest(http.MethodPost, "/v1/auth/register", bytes.NewReader(body)))
	if second.Code != http.StatusConflict {
		t.Fatalf("expected duplicate register 409, got %d: %s", second.Code, second.Body.String())
	}
	assertErrorCode(t, second.Body.Bytes(), "CONFLICT")
}

func TestAdminRequiresAdminRole(t *testing.T) {
	r := NewWithConfig(testConfig())
	token := loginAccessToken(t, r, "demo@example.com", "password123")

	req := httptest.NewRequest(http.MethodGet, "/v1/admin/users", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)

	if res.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", res.Code, res.Body.String())
	}
	assertErrorCode(t, res.Body.Bytes(), "FORBIDDEN")
}

func TestGenerateValidationReturnsUnprocessableEntity(t *testing.T) {
	r := NewWithConfig(testConfig())
	token := loginAccessToken(t, r, "demo@example.com", "password123")
	pageID := firstPageID(t, r, token)

	req := httptest.NewRequest(http.MethodPost, "/v1/pages/"+pageID+"/generate", bytes.NewReader([]byte(`{
		"prompt": "Create a hospital dashboard",
		"pageType": "rawReact",
		"domain": "hospital"
	}`)))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Idempotency-Key", "route-validation")
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)

	if res.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d: %s", res.Code, res.Body.String())
	}
	assertErrorCode(t, res.Body.Bytes(), "VALIDATION_ERROR")
}

func loginAccessToken(t *testing.T, r http.Handler, email string, password string) string {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewReader([]byte(`{"email":"`+email+`","password":"`+password+`"}`)))
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("login failed with %d: %s", res.Code, res.Body.String())
	}
	var payload struct {
		AccessToken string `json:"accessToken"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode login response: %v", err)
	}
	if payload.AccessToken == "" {
		t.Fatal("expected access token")
	}
	return payload.AccessToken
}

func firstPageID(t *testing.T, r http.Handler, token string) string {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/v1/projects", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("list projects failed with %d: %s", res.Code, res.Body.String())
	}
	var projects []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &projects); err != nil {
		t.Fatalf("decode projects: %v", err)
	}
	if len(projects) == 0 {
		t.Fatal("expected seeded project")
	}

	req = httptest.NewRequest(http.MethodGet, "/v1/projects/"+projects[0].ID+"/pages", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res = httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("list pages failed with %d: %s", res.Code, res.Body.String())
	}
	var detailPayload struct {
		Pages []struct {
			ID string `json:"id"`
		} `json:"pages"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &detailPayload); err != nil {
		t.Fatalf("decode project pages: %v", err)
	}
	if len(detailPayload.Pages) == 0 {
		t.Fatal("expected seeded page")
	}
	return detailPayload.Pages[0].ID
}

func assertErrorCode(t *testing.T, raw []byte, expected string) {
	t.Helper()
	var payload struct {
		Error struct {
			Code      string `json:"code"`
			Message   string `json:"message"`
			RequestID string `json:"requestId"`
		} `json:"error"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("decode error response: %v", err)
	}
	if payload.Error.Code != expected {
		t.Fatalf("expected error code %q, got %q", expected, payload.Error.Code)
	}
	if payload.Error.Message == "" {
		t.Fatal("expected error message")
	}
	if payload.Error.RequestID == "" {
		t.Fatal("expected requestId")
	}
}

func testConfig() config.Config {
	return config.Config{
		Port:               "0",
		JWTSecret:          "test-secret-which-is-long-enough",
		AccessTokenTTL:     time.Minute,
		RefreshTokenTTL:    time.Hour,
		AllowedCORSOrigins: []string{"http://localhost:3000"},
		Environment:        "test",
	}
}

func TestLogoutRequiresAuthentication(t *testing.T) {
	r := NewWithConfig(testConfig())

	req := httptest.NewRequest(http.MethodPost, "/v1/auth/logout", bytes.NewReader([]byte(`{"refreshToken":"some-token"}`)))
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unauthenticated logout, got %d: %s", res.Code, res.Body.String())
	}
}

func TestReadyzDependencyChecks(t *testing.T) {
	cfg := testConfig()
	cfg.DatabaseURL = "" // Starts in mock mode safely, but readyz will report down
	cfg.RedisURL = "redis://unreachable:6379" // Doesn't panic startup, but readyz will report down

	r := NewWithConfig(cfg)
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)

	if res.Code != http.StatusServiceUnavailable {
		t.Errorf("expected status 503, got %d: %s", res.Code, res.Body.String())
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode readyz body: %v", err)
	}

	if payload["status"] != "down" {
		t.Errorf("expected status 'down', got %v", payload["status"])
	}

	checks, ok := payload["checks"].(map[string]interface{})
	if !ok {
		t.Fatal("expected checks field in response")
	}

	if checks["postgres"] != "down" {
		t.Errorf("expected postgres check 'down', got %v", checks["postgres"])
	}

	if checks["redis"] != "down" {
		t.Errorf("expected redis check 'down', got %v", checks["redis"])
	}
}

func TestReadyzHealthy(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	redisURL := os.Getenv("REDIS_URL")
	if dbURL == "" {
		t.Skip("skipping readyz healthy test; DATABASE_URL is not set")
	}

	cfg := testConfig()
	cfg.DatabaseURL = dbURL
	cfg.RedisURL = redisURL

	r := NewWithConfig(cfg)
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d: %s", res.Code, res.Body.String())
	}
}

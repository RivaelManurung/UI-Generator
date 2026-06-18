package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestRateLimiterMemoryEvictionAndCapping(t *testing.T) {
	rl := NewRateLimiter(nil, 5, 20*time.Millisecond)
	defer rl.Close()

	// Fill with distinct keys
	ctx := context.Background()
	for i := 0; i < 10; i++ {
		key := fmt.Sprintf("ip-%d", i)
		if !rl.allow(ctx, key) {
			t.Fatalf("expected key %s to be allowed", key)
		}
	}

	rl.mu.Lock()
	sizeBefore := len(rl.attempts)
	rl.mu.Unlock()

	if sizeBefore != 10 {
		t.Fatalf("expected 10 keys in limiter, got %d", sizeBefore)
	}

	// Wait for expiration
	time.Sleep(30 * time.Millisecond)

	// Explicitly invoke cleanup
	rl.cleanup()

	rl.mu.Lock()
	sizeAfter := len(rl.attempts)
	rl.mu.Unlock()

	if sizeAfter != 0 {
		t.Fatalf("expected 0 keys in limiter after cleanup, got %d", sizeAfter)
	}
}

func TestRecoveryMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(RequestID())
	r.Use(Recovery())
	r.GET("/panic", func(c *gin.Context) {
		panic("something went wrong")
	})

	req := httptest.NewRequest(http.MethodGet, "/panic", nil)
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)

	if res.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", res.Code)
	}

	var body map[string]interface{}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}

	errMap, ok := body["error"].(map[string]interface{})
	if !ok {
		t.Fatal("response should contain error field")
	}

	if errMap["code"] != "INTERNAL_ERROR" {
		t.Errorf("expected code INTERNAL_ERROR, got %v", errMap["code"])
	}

	if errMap["message"] != "An unexpected error occurred." {
		t.Errorf("expected message 'An unexpected error occurred.', got %v", errMap["message"])
	}

	if errMap["requestId"] == "" {
		t.Error("expected requestId in error payload")
	}
}

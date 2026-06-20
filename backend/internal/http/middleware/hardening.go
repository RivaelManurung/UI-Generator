package middleware

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/metrics"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/redis"
)

func BodySizeLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

func Timeout(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		defer cancel()
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Next()
	}
}

func AccessLog() gin.HandlerFunc {
	logger := log.New(os.Stdout, "", 0)
	return func(c *gin.Context) {
		metrics.IncRequest()
		started := time.Now()
		c.Next()

		status := c.Writer.Status()
		if status >= 400 {
			metrics.IncError()
		}

		fields := map[string]interface{}{
			"level":     "info",
			"message":   "http_request",
			"time":      time.Now().UTC().Format(time.RFC3339Nano),
			"requestId": RequestIDFrom(c),
			"method":    c.Request.Method,
			"route":     c.FullPath(),
			"path":      c.Request.URL.Path,
			"status":    status,
			"latencyMs": time.Since(started).Milliseconds(),
		}
		if user, ok := CurrentUser(c); ok {
			fields["userId"] = user.ID
		}
		raw, err := json.Marshal(fields)
		if err != nil {
			return
		}
		logger.Println(string(raw))
	}
}

type RateLimiter struct {
	client *redis.Client
	limit  int
	window time.Duration
	// failOpen controls behaviour when Redis is unavailable. When true (default)
	// the limiter degrades GRACEFULLY to its in-memory counter (still bounded, so
	// requests aren't unlimited and dev isn't blocked). When false it fails CLOSED
	// (denies) — stricter for production financial endpoints. Set via
	// RATE_LIMIT_FAIL_OPEN=false.
	failOpen bool

	mu       sync.Mutex
	attempts map[string]rateEntry
	stopChan chan struct{}
}

type rateEntry struct {
	Count     int
	ExpiresAt time.Time
}

func NewRateLimiter(client *redis.Client, limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		client:   client,
		limit:    limit,
		window:   window,
		failOpen: !strings.EqualFold(strings.TrimSpace(os.Getenv("RATE_LIMIT_FAIL_OPEN")), "false"),
		attempts: map[string]rateEntry{},
		stopChan: make(chan struct{}),
	}
	// The in-memory counter backs BOTH the no-Redis mode and the graceful
	// degradation path when Redis errors, so keep its cleanup loop running always.
	go rl.startCleanupLoop(10 * time.Second)
	return rl
}

// Close stops the background cleanup loop. Used by tests to avoid goroutine
// leaks; the app keeps a single limiter alive for its whole lifetime.
func (r *RateLimiter) Close() {
	if r.stopChan != nil {
		close(r.stopChan)
	}
}

func (r *RateLimiter) startCleanupLoop(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			r.cleanup()
		case <-r.stopChan:
			return
		}
	}
}

func (r *RateLimiter) cleanup() {
	r.mu.Lock()
	defer r.mu.Unlock()
	now := time.Now()
	for k, v := range r.attempts {
		if now.After(v.ExpiresAt) {
			delete(r.attempts, k)
		}
	}
}

func (r *RateLimiter) Middleware(scope string) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := scope + ":" + c.ClientIP()
		if user, ok := CurrentUser(c); ok {
			key = scope + ":user:" + user.ID
		}
		if !r.allow(c.Request.Context(), key) {
			Abort(c, http.StatusTooManyRequests, "RATE_LIMITED", "Too many requests. Please try again later.")
			return
		}
		c.Next()
	}
}

func (r *RateLimiter) allow(ctx context.Context, key string) bool {
	if r.client != nil {
		count, err := r.client.Incr(ctx, "ratelimit:"+key).Result()
		if err != nil {
			// Redis unavailable. Fail CLOSED in strict mode; otherwise degrade to
			// the in-memory limiter below (still bounded — NOT unlimited).
			if !r.failOpen {
				return false
			}
			// fall through to in-memory limiting
		} else {
			if count == 1 {
				r.client.Expire(ctx, "ratelimit:"+key, r.window)
			}
			return int(count) <= r.limit
		}
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()

	// Capacity protection: cap map to 50,000 active keys
	const maxLimiterKeys = 50000
	if len(r.attempts) >= maxLimiterKeys {
		// Evict expired entries immediately
		for k, v := range r.attempts {
			if now.After(v.ExpiresAt) {
				delete(r.attempts, k)
			}
		}
		// If still full, fail closed to prevent memory exhaustion
		if len(r.attempts) >= maxLimiterKeys {
			return false
		}
	}

	entry := r.attempts[key]
	if entry.ExpiresAt.IsZero() || now.After(entry.ExpiresAt) {
		r.attempts[key] = rateEntry{Count: 1, ExpiresAt: now.Add(r.window)}
		return true
	}
	if entry.Count >= r.limit {
		return false
	}
	entry.Count++
	r.attempts[key] = entry
	return true
}

func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, err interface{}) {
		log.Printf("[PANIC] recovered: %v", err)
		Abort(c, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred.")
	})
}

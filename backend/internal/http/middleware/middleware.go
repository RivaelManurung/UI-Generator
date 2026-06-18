package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kreasinusantara/ui-generator-backend/internal/domain"
)

const (
	ContextRequestID = "requestId"
	ContextUser      = "user"
)

type TokenVerifier interface {
	VerifyAccessToken(token string) (domain.User, error)
}

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if strings.TrimSpace(requestID) == "" {
			requestID = randomID()
		}
		c.Set(ContextRequestID, requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

func Auth(verifier TokenVerifier) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			Abort(c, http.StatusUnauthorized, "UNAUTHENTICATED", "Authentication is required.")
			return
		}
		user, err := verifier.VerifyAccessToken(strings.TrimSpace(strings.TrimPrefix(header, "Bearer ")))
		if err != nil {
			Abort(c, http.StatusUnauthorized, "UNAUTHENTICATED", "Invalid or expired access token.")
			return
		}
		c.Set(ContextUser, user)
		c.Next()
	}
}

func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := CurrentUser(c)
		if !ok || user.Role != "admin" {
			Abort(c, http.StatusForbidden, "FORBIDDEN", "Admin role is required.")
			return
		}
		c.Next()
	}
}

func CurrentUser(c *gin.Context) (domain.User, bool) {
	value, ok := c.Get(ContextUser)
	if !ok {
		return domain.User{}, false
	}
	user, ok := value.(domain.User)
	return user, ok
}

func RequestIDFrom(c *gin.Context) string {
	if value, ok := c.Get(ContextRequestID); ok {
		if requestID, ok := value.(string); ok {
			return requestID
		}
	}
	return ""
}

func Abort(c *gin.Context, status int, code string, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{
		"code":      code,
		"message":   message,
		"requestId": RequestIDFrom(c),
	}})
}

func randomID() string {
	var bytes [12]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return "request"
	}
	return hex.EncodeToString(bytes[:])
}

package services

import (
	crand "crypto/rand"
	"errors"
	"testing"
)

type errorReader struct{}

func (errorReader) Read(p []byte) (n int, err error) {
	return 0, errors.New("entropy exhaustion mock error")
}

func TestEntropyFailure(t *testing.T) {
	oldReader := crand.Reader
	crand.Reader = errorReader{}
	defer func() { crand.Reader = oldReader }()

	studio := NewStudioService()
	// Test Register fails
	_, err := studio.Register(RegisterInput{
		Name:     "Test",
		Email:    "test@example.com",
		Password: "password123",
	})
	if err == nil {
		t.Fatal("expected Register to fail under entropy failure")
	}

	// Test Login fails
	_, err = studio.Login(LoginInput{
		Email:    "test@example.com",
		Password: "password123",
	})
	if err == nil {
		t.Fatal("expected Login to fail under entropy failure")
	}
}

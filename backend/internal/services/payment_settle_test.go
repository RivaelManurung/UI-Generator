package services

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/platform/config"
)

// TestSettleOrderIdempotent proves a duplicated Midtrans webhook credits the
// wallet exactly once: same signed settlement delivered twice → +credits once,
// one topup ledger row, order marked paid. Requires a real Postgres (DATABASE_URL).
func TestSettleOrderIdempotent(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("skipping settle idempotency test; DATABASE_URL not set")
	}

	const serverKey = "test-server-key"
	cfg := config.Config{
		DatabaseURL:       dbURL,
		JWTSecret:         "super-secret-key-32-characters-long-to-be-valid-in-prod",
		AccessTokenTTL:    15 * time.Minute,
		RefreshTokenTTL:   30 * 24 * time.Hour,
		Environment:       "development",
		MidtransServerKey: serverKey,
		MidtransEnv:       "sandbox",
	}

	studio := NewStudioServiceWithConfig(cfg)
	payments := NewPaymentService(studio, cfg)
	ctx := context.Background()

	// A fresh user (Register grants 12 free credits — assert on the delta, not absolute).
	email := fmt.Sprintf("paytest-%d@example.com", time.Now().UnixNano())
	session, err := studio.Register(RegisterInput{Name: "Pay Test", Email: email, Password: "password123"})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	userID := session.User.ID
	defer func() {
		// FK ON DELETE CASCADE cleans wallet, payments, and ledger rows.
		_, _ = studio.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID)
	}()

	balance0 := walletBalance(t, studio, userID)

	// A pending order for the seeded 'silver' pack (100 credits).
	orderID := fmt.Sprintf("tx-test-%d", time.Now().UnixNano())
	const credits = 100
	if _, err := studio.pool.Exec(ctx,
		`INSERT INTO payments (user_id, package_slug, amount_idr, credits, order_id) VALUES ($1, 'silver', 690000, $2, $3)`,
		userID, credits, orderID,
	); err != nil {
		t.Fatalf("insert payment: %v", err)
	}

	// A correctly-signed settlement notification.
	const gross = "690000.00"
	sig := sha512Hex(orderID + "200" + gross + serverKey)
	notif := fmt.Sprintf(
		`{"order_id":%q,"status_code":"200","gross_amount":%q,"signature_key":%q,"transaction_status":"settlement","transaction_id":"test-txn-1"}`,
		orderID, gross, sig,
	)

	// Deliver the same webhook twice.
	if err := payments.HandleNotification(ctx, []byte(notif)); err != nil {
		t.Fatalf("first settle: %v", err)
	}
	if err := payments.HandleNotification(ctx, []byte(notif)); err != nil {
		t.Fatalf("duplicate settle: %v", err)
	}

	// Credited exactly once.
	if got := walletBalance(t, studio, userID); got != balance0+credits {
		t.Fatalf("wallet credited wrong amount: want %d, got %d", balance0+credits, got)
	}

	// Exactly one topup ledger row for this order.
	var topups int
	if err := studio.pool.QueryRow(ctx,
		`SELECT count(*) FROM credit_transactions WHERE user_id = $1 AND type = 'topup' AND idempotency_key = $2`,
		userID, orderID,
	).Scan(&topups); err != nil {
		t.Fatalf("count topups: %v", err)
	}
	if topups != 1 {
		t.Fatalf("expected exactly 1 topup ledger row, got %d", topups)
	}

	// Order marked paid.
	var status string
	if err := studio.pool.QueryRow(ctx, `SELECT status FROM payments WHERE order_id = $1`, orderID).Scan(&status); err != nil {
		t.Fatalf("read payment status: %v", err)
	}
	if status != "paid" {
		t.Fatalf("expected payment status 'paid', got %q", status)
	}

	// A tampered signature must be rejected (no state change).
	bad := fmt.Sprintf(
		`{"order_id":"tx-bad","status_code":"200","gross_amount":%q,"signature_key":"deadbeef","transaction_status":"settlement"}`,
		gross,
	)
	if err := payments.HandleNotification(ctx, []byte(bad)); err == nil {
		t.Fatal("expected an error for an invalid signature, got nil")
	}
}

func walletBalance(t *testing.T, s *StudioService, userID string) int {
	t.Helper()
	var balance int
	err := s.pool.QueryRow(context.Background(), `SELECT balance FROM credit_wallets WHERE user_id = $1`, userID).Scan(&balance)
	if err != nil {
		return 0 // no wallet row yet
	}
	return balance
}

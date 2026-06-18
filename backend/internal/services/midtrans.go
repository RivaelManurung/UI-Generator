package services

import (
	"bytes"
	"context"
	"crypto/sha512"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// midtransClient is a minimal Midtrans Snap + Core API client built on the
// standard library (no SDK dependency). It covers the three things the payment
// flow needs: create a Snap transaction, verify a webhook signature, and check
// an order status for reconciliation.
type midtransClient struct {
	serverKey string
	snapBase  string // Snap (checkout) host
	apiBase   string // Core API host (status check)
	http      *http.Client
}

func newMidtransClient(serverKey, env string) *midtransClient {
	snapBase, apiBase := "https://app.sandbox.midtrans.com", "https://api.sandbox.midtrans.com"
	if strings.EqualFold(strings.TrimSpace(env), "production") {
		snapBase, apiBase = "https://app.midtrans.com", "https://api.midtrans.com"
	}
	return &midtransClient{
		serverKey: serverKey,
		snapBase:  snapBase,
		apiBase:   apiBase,
		http:      &http.Client{Timeout: 20 * time.Second},
	}
}

func (m *midtransClient) configured() bool { return strings.TrimSpace(m.serverKey) != "" }

func (m *midtransClient) authHeader() string {
	return "Basic " + base64.StdEncoding.EncodeToString([]byte(m.serverKey+":"))
}

type snapItem struct {
	ID       string `json:"id"`
	Price    int    `json:"price"`
	Quantity int    `json:"quantity"`
	Name     string `json:"name"`
}

// createSnapTransaction asks Midtrans for a Snap token. gross_amount must equal
// the sum of item prices (server-computed, never client-supplied).
func (m *midtransClient) createSnapTransaction(ctx context.Context, orderID string, amount int, item snapItem, custName, custEmail string) (token, redirectURL string, err error) {
	payload := map[string]any{
		"transaction_details": map[string]any{"order_id": orderID, "gross_amount": amount},
		"item_details":        []snapItem{item},
		"customer_details":    map[string]any{"first_name": custName, "email": custEmail},
		"credit_card":         map[string]any{"secure": true},
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, m.snapBase+"/snap/v1/transactions", bytes.NewReader(raw))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", m.authHeader())

	res, err := m.http.Do(req)
	if err != nil {
		return "", "", err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		return "", "", fmt.Errorf("midtrans snap failed (%d): %s", res.StatusCode, string(body))
	}
	var out struct {
		Token       string `json:"token"`
		RedirectURL string `json:"redirect_url"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return "", "", err
	}
	if out.Token == "" {
		return "", "", fmt.Errorf("midtrans snap returned no token: %s", string(body))
	}
	return out.Token, out.RedirectURL, nil
}

// verifySignature validates a webhook notification's signature_key:
// sha512(order_id + status_code + gross_amount + server_key).
func (m *midtransClient) verifySignature(orderID, statusCode, grossAmount, signatureKey string) bool {
	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + m.serverKey))
	expected := hex.EncodeToString(sum[:])
	got := strings.ToLower(strings.TrimSpace(signatureKey))
	// Constant-time compare to avoid a timing oracle on the public webhook.
	return subtle.ConstantTimeCompare([]byte(expected), []byte(got)) == 1
}

// checkStatus queries the Core API for an order's current status (reconciliation
// fallback when a webhook is missed). Returns the decoded JSON map.
func (m *midtransClient) checkStatus(ctx context.Context, orderID string) (map[string]any, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, m.apiBase+"/v2/"+url.PathEscape(orderID)+"/status", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", m.authHeader())
	res, err := m.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	var out map[string]any
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	return out, nil
}

package services

import (
	"crypto/sha512"
	"encoding/hex"
	"testing"
)

func sha512Hex(s string) string {
	sum := sha512.Sum512([]byte(s))
	return hex.EncodeToString(sum[:])
}

func TestVerifySignature(t *testing.T) {
	const serverKey = "SB-Mid-server-TESTKEY"
	m := newMidtransClient(serverKey, "sandbox")

	orderID, statusCode, gross := "tx-abc123", "200", "99000.00"
	good := sha512Hex(orderID + statusCode + gross + serverKey)

	if !m.verifySignature(orderID, statusCode, gross, good) {
		t.Fatal("valid signature was rejected")
	}
	// Uppercase input must still match (we normalize to lower-case hex).
	if !m.verifySignature(orderID, statusCode, gross, "  "+toUpperASCII(good)+"  ") {
		t.Fatal("valid signature rejected after case/space normalization")
	}
	if m.verifySignature(orderID, statusCode, gross, good+"ff") {
		t.Fatal("tampered signature was accepted")
	}
	if m.verifySignature(orderID, statusCode, gross, "") {
		t.Fatal("empty signature was accepted")
	}
	// A different gross amount must change the signature (amount authority).
	if m.verifySignature(orderID, statusCode, "1.00", good) {
		t.Fatal("signature accepted for a mismatched gross amount")
	}
}

func toUpperASCII(s string) string {
	b := []byte(s)
	for i, c := range b {
		if c >= 'a' && c <= 'z' {
			b[i] = c - 32
		}
	}
	return string(b)
}

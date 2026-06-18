package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strconv"

	"github.com/jackc/pgx/v5"

	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/config"
)

// PaymentService handles credit-pack checkout via Midtrans and credits the
// wallet only after a verified, idempotent settlement. Prices are always
// resolved server-side from credit_packages — never trusted from the client.
type PaymentService struct {
	s   *StudioService
	cfg config.Config
	mt  *midtransClient
}

func NewPaymentService(s *StudioService, cfg config.Config) *PaymentService {
	return &PaymentService{
		s:   s,
		cfg: cfg,
		mt:  newMidtransClient(cfg.MidtransServerKey, cfg.MidtransEnv),
	}
}

type PackageDTO struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Description string `json:"description"`
	PriceIDR    int    `json:"priceIdr"`
	Credits     int    `json:"credits"`
}

type CheckoutResultDTO struct {
	OrderID     string `json:"orderId"`
	SnapToken   string `json:"snapToken"`
	RedirectURL string `json:"redirectUrl"`
}

type PaymentStatusDTO struct {
	OrderID     string `json:"orderId"`
	Status      string `json:"status"`
	PackageSlug string `json:"packageSlug"`
	AmountIDR   int    `json:"amountIdr"`
	Credits     int    `json:"credits"`
}

// ListPackages returns the active, purchasable credit packs (pricing source of truth).
func (p *PaymentService) ListPackages(ctx context.Context) ([]PackageDTO, error) {
	rows, err := p.s.pool.Query(ctx,
		`SELECT slug, name, description, price_idr, credits FROM credit_packages WHERE active = true ORDER BY sort ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PackageDTO{}
	for rows.Next() {
		var pkg PackageDTO
		if err := rows.Scan(&pkg.Slug, &pkg.Name, &pkg.Description, &pkg.PriceIDR, &pkg.Credits); err != nil {
			return nil, err
		}
		out = append(out, pkg)
	}
	return out, rows.Err()
}

func (p *PaymentService) getPackage(ctx context.Context, slug string) (PackageDTO, error) {
	var pkg PackageDTO
	err := p.s.pool.QueryRow(ctx,
		`SELECT slug, name, description, price_idr, credits FROM credit_packages WHERE slug = $1 AND active = true`, slug,
	).Scan(&pkg.Slug, &pkg.Name, &pkg.Description, &pkg.PriceIDR, &pkg.Credits)
	if errors.Is(err, pgx.ErrNoRows) {
		return PackageDTO{}, apperrors.NotFound("package not found")
	}
	if err != nil {
		return PackageDTO{}, err
	}
	return pkg, nil
}

// Checkout creates a pending payment order and returns a Midtrans Snap token.
func (p *PaymentService) Checkout(ctx context.Context, userID, packageSlug string) (CheckoutResultDTO, error) {
	if !p.mt.configured() {
		return CheckoutResultDTO{}, apperrors.Internal("payment provider is not configured")
	}
	pkg, err := p.getPackage(ctx, packageSlug)
	if err != nil {
		return CheckoutResultDTO{}, err
	}

	var name, email string
	if err := p.s.pool.QueryRow(ctx, `SELECT name, email FROM users WHERE id = $1`, userID).Scan(&name, &email); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return CheckoutResultDTO{}, apperrors.NotFound("user not found")
		}
		return CheckoutResultDTO{}, err
	}

	id, err := newID()
	if err != nil {
		return CheckoutResultDTO{}, err
	}
	orderID := "tx-" + id

	if _, err := p.s.pool.Exec(ctx,
		`INSERT INTO payments (user_id, package_slug, amount_idr, credits, order_id) VALUES ($1, $2, $3, $4, $5)`,
		userID, pkg.Slug, pkg.PriceIDR, pkg.Credits, orderID,
	); err != nil {
		return CheckoutResultDTO{}, err
	}

	item := snapItem{ID: pkg.Slug, Price: pkg.PriceIDR, Quantity: 1, Name: pkg.Name + " — " + strconv.Itoa(pkg.Credits) + " credits"}
	token, redirectURL, err := p.mt.createSnapTransaction(ctx, orderID, pkg.PriceIDR, item, name, email)
	if err != nil {
		if _, e := p.s.pool.Exec(ctx, `UPDATE payments SET status = 'failed' WHERE order_id = $1`, orderID); e != nil {
			log.Printf("payment: could not mark order %s failed: %v", orderID, e)
		}
		log.Printf("payment: snap create failed for %s: %v", orderID, err)
		return CheckoutResultDTO{}, apperrors.Internal("could not start payment")
	}
	if _, e := p.s.pool.Exec(ctx, `UPDATE payments SET snap_token = $2 WHERE order_id = $1`, orderID, token); e != nil {
		log.Printf("payment: could not persist snap_token for %s: %v", orderID, e)
	}

	return CheckoutResultDTO{OrderID: orderID, SnapToken: token, RedirectURL: redirectURL}, nil
}

// HandleNotification processes a Midtrans webhook. The signature is verified
// before any state change; settlement is idempotent.
func (p *PaymentService) HandleNotification(ctx context.Context, raw []byte) error {
	var n struct {
		OrderID           string `json:"order_id"`
		StatusCode        string `json:"status_code"`
		GrossAmount       string `json:"gross_amount"`
		SignatureKey      string `json:"signature_key"`
		TransactionStatus string `json:"transaction_status"`
		FraudStatus       string `json:"fraud_status"`
		TransactionID     string `json:"transaction_id"`
	}
	if err := json.Unmarshal(raw, &n); err != nil {
		return apperrors.BadRequest("invalid notification payload")
	}
	if n.OrderID == "" || !p.mt.verifySignature(n.OrderID, n.StatusCode, n.GrossAmount, n.SignatureKey) {
		return apperrors.Forbidden("invalid signature")
	}

	switch n.TransactionStatus {
	case "settlement":
		return p.settleOrder(ctx, n.OrderID, n.TransactionID, n.GrossAmount, raw)
	case "capture":
		// Only an accepted fraud screen settles. "challenge" stays pending for
		// manual review; "deny" (and anything unexpected) fails. Never auto-credit
		// a challenged capture.
		switch n.FraudStatus {
		case "accept":
			return p.settleOrder(ctx, n.OrderID, n.TransactionID, n.GrossAmount, raw)
		case "deny":
			return p.markPaymentStatus(ctx, n.OrderID, "failed", raw)
		default:
			return nil
		}
	case "pending":
		return nil
	case "deny", "failure":
		return p.markPaymentStatus(ctx, n.OrderID, "failed", raw)
	case "cancel":
		return p.markPaymentStatus(ctx, n.OrderID, "cancelled", raw)
	case "expire":
		return p.markPaymentStatus(ctx, n.OrderID, "expired", raw)
	default:
		return nil
	}
}

// settleOrder credits the wallet exactly once for a paid order. It locks the
// payment row first; a second webhook on an already-paid order is a no-op.
func (p *PaymentService) settleOrder(ctx context.Context, orderID, providerTxnID, grossAmount string, raw []byte) error {
	tx, err := p.s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var paymentID, userID, status, pkgSlug string
	var credits, amountIDR int
	err = tx.QueryRow(ctx,
		`SELECT id, user_id, status, package_slug, credits, amount_idr FROM payments WHERE order_id = $1 FOR UPDATE`,
		orderID,
	).Scan(&paymentID, &userID, &status, &pkgSlug, &credits, &amountIDR)
	if errors.Is(err, pgx.ErrNoRows) {
		return apperrors.NotFound("payment order not found")
	}
	if err != nil {
		return err
	}
	if status == "paid" {
		return tx.Commit(ctx) // already credited — idempotent
	}
	// Defense-in-depth: the notified amount must match the order's server-side
	// amount, so a tampered/partial gross_amount can never credit a full pack.
	if grossAmount != "" {
		if g, perr := strconv.ParseFloat(grossAmount, 64); perr == nil && int(g) != amountIDR {
			return apperrors.BadRequest(fmt.Sprintf("gross_amount %s does not match order amount %d", grossAmount, amountIDR))
		}
	}

	var balance int
	err = tx.QueryRow(ctx, `SELECT balance FROM credit_wallets WHERE user_id = $1 FOR UPDATE`, userID).Scan(&balance)
	if errors.Is(err, pgx.ErrNoRows) {
		if _, err = tx.Exec(ctx, `INSERT INTO credit_wallets (user_id, balance, updated_at) VALUES ($1, 0, now())`, userID); err != nil {
			return err
		}
		balance = 0
	} else if err != nil {
		return err
	}
	newBalance := balance + credits

	if _, err = tx.Exec(ctx, `UPDATE credit_wallets SET balance = $2, updated_at = now() WHERE user_id = $1`, userID, newBalance); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx,
		`INSERT INTO credit_transactions
		   (id, user_id, type, amount, balance_after, reference_type, reference_id, idempotency_key, description, created_at)
		 VALUES (uuid_generate_v4(), $1, 'topup', $2, $3, 'payment', $4, $5, $6, now())`,
		userID, credits, newBalance, paymentID, orderID, "Top-up "+pkgSlug,
	); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx,
		`UPDATE payments SET status = 'paid', provider_txn_id = $2, paid_at = now(), raw_payload = $3::jsonb WHERE id = $1`,
		paymentID, providerTxnID, string(raw),
	); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (p *PaymentService) markPaymentStatus(ctx context.Context, orderID, status string, raw []byte) error {
	_, err := p.s.pool.Exec(ctx,
		`UPDATE payments SET status = $2, raw_payload = $3::jsonb WHERE order_id = $1 AND status = 'pending'`,
		orderID, status, string(raw))
	return err
}

// GetOrderStatus returns the order; if still pending it reconciles against
// Midtrans (covers a missed webhook) before returning.
func (p *PaymentService) GetOrderStatus(ctx context.Context, userID, orderID string) (PaymentStatusDTO, error) {
	dto, err := p.readOrder(ctx, userID, orderID)
	if err != nil {
		return PaymentStatusDTO{}, err
	}
	if dto.Status == "pending" && p.mt.configured() {
		if st, serr := p.mt.checkStatus(ctx, orderID); serr == nil {
			ts, _ := st["transaction_status"].(string)
			fraud, _ := st["fraud_status"].(string)
			if ts == "settlement" || (ts == "capture" && fraud == "accept") {
				txnID, _ := st["transaction_id"].(string)
				gross, _ := st["gross_amount"].(string)
				rawb, _ := json.Marshal(st)
				if e := p.settleOrder(ctx, orderID, txnID, gross, rawb); e == nil {
					if d, rerr := p.readOrder(ctx, userID, orderID); rerr == nil {
						dto = d
					} else {
						log.Printf("payment: re-read after settle failed for %s: %v", orderID, rerr)
					}
				} else {
					log.Printf("payment: reconcile settle failed for %s: %v", orderID, e)
				}
			}
		}
	}
	return dto, nil
}

func (p *PaymentService) readOrder(ctx context.Context, userID, orderID string) (PaymentStatusDTO, error) {
	var dto PaymentStatusDTO
	err := p.s.pool.QueryRow(ctx,
		`SELECT order_id, status, package_slug, amount_idr, credits FROM payments WHERE order_id = $1 AND user_id = $2`,
		orderID, userID,
	).Scan(&dto.OrderID, &dto.Status, &dto.PackageSlug, &dto.AmountIDR, &dto.Credits)
	if errors.Is(err, pgx.ErrNoRows) {
		return PaymentStatusDTO{}, apperrors.NotFound("payment not found")
	}
	if err != nil {
		return PaymentStatusDTO{}, err
	}
	return dto, nil
}

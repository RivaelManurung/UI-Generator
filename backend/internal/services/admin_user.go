package services

import (
	"context"
	"fmt"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
)

// Per-user admin "360° view": profile, wallet, lifetime money/credit figures,
// payment history, credit transactions, generation activity, and projects —
// all strictly scoped to the path user id. AdminOnly-guarded, but the id is
// still validated as a UUID upstream. Raw pool queries follow the payment.go /
// admin.go style.

// AdminUserOverviewDTO is the aggregate snapshot for one user.
type AdminUserOverviewDTO struct {
	ID                    string `json:"id"`
	Name                  string `json:"name"`
	Email                 string `json:"email"`
	Role                  string `json:"role"`
	Status                string `json:"status"`
	CreatedAt             string `json:"createdAt"`
	WalletBalance         int    `json:"walletBalance"`
	Projects              int    `json:"projects"`
	Pages                 int    `json:"pages"`
	Generations           int    `json:"generations"`
	TotalToppedUpIDR      int    `json:"totalToppedUpIdr"`
	TotalCreditsPurchased int    `json:"totalCreditsPurchased"`
	TotalCreditsConsumed  int    `json:"totalCreditsConsumed"`
}

func (f *FrontendService) AdminUserOverview(ctx context.Context, userID string) (AdminUserOverviewDTO, error) {
	if f.s.pool == nil {
		return AdminUserOverviewDTO{}, errAdminNeedsDB()
	}
	var dto AdminUserOverviewDTO
	var createdAt time.Time
	err := f.s.pool.QueryRow(ctx, `
		SELECT id::text, COALESCE(name,''), COALESCE(email,''), COALESCE(role,'user'),
		       COALESCE(status,'active'), created_at
		FROM users WHERE id=$1`, userID).
		Scan(&dto.ID, &dto.Name, &dto.Email, &dto.Role, &dto.Status, &createdAt)
	if err != nil {
		return AdminUserOverviewDTO{}, apperrors.NotFound("User not found.")
	}
	dto.CreatedAt = isoTime(createdAt)

	_ = f.s.pool.QueryRow(ctx, "SELECT COALESCE(balance,0) FROM credit_wallets WHERE user_id=$1", userID).Scan(&dto.WalletBalance)
	_ = f.s.pool.QueryRow(ctx, "SELECT count(*) FROM projects WHERE user_id=$1 AND deleted_at IS NULL", userID).Scan(&dto.Projects)
	_ = f.s.pool.QueryRow(ctx, "SELECT count(*) FROM page_versions WHERE created_by=$1", userID).Scan(&dto.Pages)
	_ = f.s.pool.QueryRow(ctx, "SELECT count(*) FROM generation_jobs WHERE user_id=$1", userID).Scan(&dto.Generations)

	// Real-money lifetime top-ups (settled Midtrans orders are stored as 'paid').
	_ = f.s.pool.QueryRow(ctx,
		"SELECT COALESCE(SUM(amount_idr),0), COALESCE(SUM(credits),0) FROM payments WHERE user_id=$1 AND status='paid'",
		userID).Scan(&dto.TotalToppedUpIDR, &dto.TotalCreditsPurchased)

	// Lifetime consumed credits = sum of negative movements, reported positive.
	_ = f.s.pool.QueryRow(ctx,
		"SELECT COALESCE(-SUM(amount),0) FROM credit_transactions WHERE user_id=$1 AND amount<0",
		userID).Scan(&dto.TotalCreditsConsumed)

	return dto, nil
}

// AdminUserPaymentDTO is one Midtrans top-up row for the user's payment history.
type AdminUserPaymentDTO struct {
	OrderID     string `json:"orderId"`
	PackageSlug string `json:"packageSlug"`
	AmountIDR   int    `json:"amountIdr"`
	Credits     int    `json:"credits"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
}

func (f *FrontendService) AdminUserPayments(ctx context.Context, userID string) ([]AdminUserPaymentDTO, error) {
	out := []AdminUserPaymentDTO{}
	if f.s.pool == nil {
		return out, nil
	}
	rows, err := f.s.pool.Query(ctx, `
		SELECT order_id, COALESCE(package_slug,''), amount_idr, credits, COALESCE(status,'pending'), created_at
		FROM payments WHERE user_id=$1
		ORDER BY created_at DESC LIMIT 200`, userID)
	if err != nil {
		return nil, fmt.Errorf("admin user payments query: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var d AdminUserPaymentDTO
		var createdAt time.Time
		if err := rows.Scan(&d.OrderID, &d.PackageSlug, &d.AmountIDR, &d.Credits, &d.Status, &createdAt); err != nil {
			return nil, fmt.Errorf("admin user payments scan: %w", err)
		}
		d.CreatedAt = isoTime(createdAt)
		out = append(out, d)
	}
	return out, rows.Err()
}

// AdminUserTransactionDTO is one credit-ledger movement for the user.
type AdminUserTransactionDTO struct {
	ID           string `json:"id"`
	Type         string `json:"type"`
	Amount       int    `json:"amount"`
	BalanceAfter int    `json:"balanceAfter"`
	Description  string `json:"description"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`
}

func (f *FrontendService) AdminUserTransactions(ctx context.Context, userID string) ([]AdminUserTransactionDTO, error) {
	out := []AdminUserTransactionDTO{}
	if f.s.pool == nil {
		return out, nil
	}
	// credit_transactions has no status column; a persisted ledger row is always
	// a completed movement (matches CreditTransactions' derived "succeeded").
	rows, err := f.s.pool.Query(ctx, `
		SELECT id::text, type, amount, balance_after, COALESCE(description,''), created_at
		FROM credit_transactions WHERE user_id=$1
		ORDER BY created_at DESC LIMIT 200`, userID)
	if err != nil {
		return nil, fmt.Errorf("admin user transactions query: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var d AdminUserTransactionDTO
		var createdAt time.Time
		if err := rows.Scan(&d.ID, &d.Type, &d.Amount, &d.BalanceAfter, &d.Description, &createdAt); err != nil {
			return nil, fmt.Errorf("admin user transactions scan: %w", err)
		}
		d.Type = mapTransactionType(d.Type, d.Amount)
		d.Status = "succeeded"
		d.CreatedAt = isoTime(createdAt)
		out = append(out, d)
	}
	return out, rows.Err()
}

// AdminUserGenerations returns the user's generation jobs (the admin job DTO,
// filtered by user_id) — the clearest "what did this user generate" view.
func (f *FrontendService) AdminUserGenerations(ctx context.Context, userID string) ([]AdminJobDTO, error) {
	out := []AdminJobDTO{}
	if f.s.pool == nil {
		return out, nil
	}
	rows, err := f.s.pool.Query(ctx, `
		SELECT id::text, user_id::text, COALESCE(project_id::text,''), COALESCE(page_id::text,''), status,
		       retry_count, COALESCE(error_message,''), started_at, finished_at, created_at
		FROM generation_jobs WHERE user_id=$1
		ORDER BY created_at DESC LIMIT 200`, userID)
	if err != nil {
		return nil, fmt.Errorf("admin user generations query: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var d AdminJobDTO
		var startedAt, finishedAt, createdAt time.Time
		if err := rows.Scan(&d.ID, &d.User, &d.Project, &d.Page, &d.Status,
			&d.RetryCount, &d.ErrorMessage, &startedAt, &finishedAt, &createdAt); err != nil {
			return nil, fmt.Errorf("admin user generations scan: %w", err)
		}
		d.Status = mapAdminJobStatus(d.Status)
		d.Duration = "—"
		if !finishedAt.IsZero() && !startedAt.IsZero() {
			d.Duration = finishedAt.Sub(startedAt).Round(time.Millisecond).String()
		}
		d.CreatedAt = isoTime(createdAt)
		out = append(out, d)
	}
	return out, rows.Err()
}

// AdminUserProjects returns the user's projects in the admin project shape.
func (f *FrontendService) AdminUserProjects(ctx context.Context, userID string) ([]AdminProjectDTO, error) {
	out := []AdminProjectDTO{}
	if f.s.pool == nil {
		return out, nil
	}
	rows, err := f.s.pool.Query(ctx, `
		SELECT p.id::text, p.name, p.domain, COALESCE(p.status,'active'), u.name, u.email,
		  (SELECT count(*) FROM project_pages pg WHERE pg.project_id=p.id AND pg.deleted_at IS NULL) AS pages_count,
		  COALESCE((SELECT AVG(v.quality_score) FROM project_pages pg
		    JOIN page_versions v ON v.id=pg.current_version_id
		    WHERE pg.project_id=p.id AND pg.deleted_at IS NULL), 0) AS quality_avg,
		  p.created_at, p.updated_at
		FROM projects p JOIN users u ON u.id=p.user_id
		WHERE p.user_id=$1 AND p.deleted_at IS NULL
		ORDER BY p.updated_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("admin user projects query: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var d AdminProjectDTO
		var quality float64
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&d.ID, &d.Name, &d.Domain, &d.Status, &d.Owner, &d.OwnerEmail, &d.PagesCount, &quality, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("admin user projects scan: %w", err)
		}
		d.QualityAverage = round1(quality)
		d.CreatedAt = isoTime(createdAt)
		d.UpdatedAt = isoTime(updatedAt)
		out = append(out, d)
	}
	return out, rows.Err()
}

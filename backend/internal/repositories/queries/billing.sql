-- name: GetWalletForUpdate :one
SELECT user_id, balance, updated_at
FROM credit_wallets
WHERE user_id = $1
FOR UPDATE;

-- name: UpsertWallet :exec
INSERT INTO credit_wallets (user_id, balance, updated_at)
VALUES ($1, $2, now())
ON CONFLICT (user_id)
DO UPDATE SET balance = EXCLUDED.balance, updated_at = now();

-- name: CreateCreditTransaction :one
INSERT INTO credit_transactions (id, user_id, type, amount, balance_after, reference_type, reference_id, idempotency_key, description, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
RETURNING id, user_id, type, amount, balance_after, reference_type, reference_id, idempotency_key, description, created_at;

-- name: ListCreditTransactionsByUser :many
SELECT id, user_id, type, amount, balance_after, reference_type, reference_id, idempotency_key, description, created_at
FROM credit_transactions
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: FindCreditTransactionByIdempotencyKey :one
SELECT id, user_id, type, amount, balance_after, reference_type, reference_id, idempotency_key, description, created_at
FROM credit_transactions
WHERE user_id = $1 AND idempotency_key = $2;

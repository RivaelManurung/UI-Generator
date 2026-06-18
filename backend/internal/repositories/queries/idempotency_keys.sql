-- name: CreateIdempotencyKey :one
INSERT INTO idempotency_keys (id, user_id, operation, request_key, resource_type, resource_id, response_json, created_at, expires_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, now(), $8)
RETURNING id, user_id, operation, request_key, resource_type, resource_id, response_json, created_at, expires_at;

-- name: GetIdempotencyKey :one
SELECT id, user_id, operation, request_key, resource_type, resource_id, response_json, created_at, expires_at
FROM idempotency_keys
WHERE user_id = $1 AND operation = $2 AND request_key = $3;

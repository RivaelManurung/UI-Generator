-- name: CreateRefreshToken :exec
INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, rotated_from_id, created_at)
VALUES ($1, $2, $3, $4, $5, now());

-- name: GetRefreshTokenByHash :one
SELECT id, user_id, token_hash, revoked_at, expires_at, created_at, rotated_from_id
FROM refresh_tokens
WHERE token_hash = $1;

-- name: RevokeRefreshToken :exec
UPDATE refresh_tokens
SET revoked_at = $2
WHERE id = $1 AND revoked_at IS NULL;

-- name: RevokeRefreshTokenFamily :exec
UPDATE refresh_tokens
SET revoked_at = $2
WHERE (id = $1 OR rotated_from_id = $1) AND revoked_at IS NULL;

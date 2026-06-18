-- name: CreateUser :one
INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, now(), now())
RETURNING id, name, email, password_hash, role, created_at, updated_at;

-- name: GetUserByID :one
SELECT id, name, email, password_hash, role, created_at, updated_at
FROM users
WHERE id = $1;

-- name: GetUserByEmail :one
SELECT id, name, email, password_hash, role, created_at, updated_at
FROM users
WHERE email = $1;

-- name: ListUsers :many
SELECT id, name, email, password_hash, role, created_at, updated_at
FROM users
ORDER BY created_at ASC;

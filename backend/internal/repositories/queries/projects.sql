-- name: ListProjectsByUser :many
SELECT id, user_id, name, description, default_theme_slug, created_at, updated_at
FROM projects
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY created_at ASC;

-- name: CreateProject :one
INSERT INTO projects (id, user_id, name, description, default_theme_slug, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, now(), now())
RETURNING id, user_id, name, description, default_theme_slug, created_at, updated_at;

-- name: GetOwnedProject :one
SELECT id, user_id, name, description, default_theme_slug, created_at, updated_at
FROM projects
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteOwnedProject :execrows
UPDATE projects
SET deleted_at = now(), updated_at = now()
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: UpdateOwnedProject :one
UPDATE projects
SET name = $3, description = $4, default_theme_slug = $5, updated_at = now()
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
RETURNING id, user_id, name, description, default_theme_slug, created_at, updated_at;

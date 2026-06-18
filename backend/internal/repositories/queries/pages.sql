-- name: CreatePage :one
INSERT INTO project_pages (id, project_id, name, slug, page_type, created_at, updated_at)
SELECT $1, p.id, $3, $4, $5, now(), now()
FROM projects p
WHERE p.id = $2 AND p.user_id = $6 AND p.deleted_at IS NULL
RETURNING id, project_id, name, slug, page_type, current_version_id, created_at, updated_at;

-- name: GetOwnedPage :one
SELECT pp.id, pp.project_id, pp.name, pp.slug, pp.page_type, pp.current_version_id, pp.created_at, pp.updated_at
FROM project_pages pp
JOIN projects p ON p.id = pp.project_id
WHERE pp.id = $1 AND p.user_id = $2 AND pp.deleted_at IS NULL AND p.deleted_at IS NULL;

-- name: ListOwnedProjectPages :many
SELECT pp.id, pp.project_id, pp.name, pp.slug, pp.page_type, pp.current_version_id, pp.created_at, pp.updated_at
FROM project_pages pp
JOIN projects p ON p.id = pp.project_id
WHERE pp.project_id = $1 AND p.user_id = $2 AND pp.deleted_at IS NULL AND p.deleted_at IS NULL
ORDER BY pp.created_at ASC;

-- name: SetCurrentVersion :exec
UPDATE project_pages pp
SET current_version_id = $1, updated_at = now()
FROM projects p
WHERE pp.id = $2 AND pp.project_id = p.id AND p.user_id = $3;

-- name: SoftDeleteOwnedPage :exec
UPDATE project_pages pp
SET deleted_at = now(), updated_at = now()
FROM projects p
WHERE pp.id = $1 AND pp.project_id = p.id AND p.user_id = $2 AND pp.deleted_at IS NULL;

-- name: UpdateOwnedPage :one
UPDATE project_pages pp
SET name = $3, slug = $4, page_type = $5, updated_at = now()
FROM projects p
WHERE pp.id = $1 AND pp.project_id = p.id AND p.user_id = $2 AND pp.deleted_at IS NULL
RETURNING pp.id, pp.project_id, pp.name, pp.slug, pp.page_type, pp.current_version_id, pp.created_at, pp.updated_at;

-- name: CreatePageVersion :one
INSERT INTO page_versions (id, page_id, version_number, prompt, schema_json, generated_code, quality_score, created_by, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
RETURNING id, page_id, version_number, prompt, schema_json, generated_code, quality_score, created_by, created_at;

-- name: ListOwnedPageVersions :many
SELECT pv.id, pv.page_id, pv.version_number, pv.prompt, pv.schema_json, pv.generated_code, pv.quality_score, pv.created_by, pv.created_at
FROM page_versions pv
JOIN project_pages pp ON pp.id = pv.page_id
JOIN projects p ON p.id = pp.project_id
WHERE pv.page_id = $1 AND p.user_id = $2
ORDER BY pv.version_number DESC;

-- name: NextVersionNumber :one
SELECT COALESCE(MAX(version_number), 0)::int + 1
FROM page_versions
WHERE page_id = $1;

-- name: GetOwnedPageVersion :one
SELECT pv.id, pv.page_id, pv.version_number, pv.prompt, pv.schema_json, pv.generated_code, pv.quality_score, pv.created_by, pv.created_at
FROM page_versions pv
JOIN project_pages pp ON pp.id = pv.page_id
JOIN projects p ON p.id = pp.project_id
WHERE pv.id = $1 AND pv.page_id = $2 AND p.user_id = $3;

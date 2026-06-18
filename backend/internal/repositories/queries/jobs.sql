-- name: CreateGenerationJob :one
INSERT INTO generation_jobs (id, user_id, project_id, page_id, request_id, status, prompt, page_type, domain, theme_slug, output_mode, credit_cost, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())
RETURNING id, user_id, project_id, page_id, request_id, status, prompt, page_type, domain, theme_slug, output_mode, credit_cost, error_message, retry_count, started_at, finished_at, created_at, updated_at;

-- name: GetGenerationJobByRequestID :one
SELECT id, user_id, project_id, page_id, request_id, status, prompt, page_type, domain, theme_slug, output_mode, credit_cost, error_message, retry_count, started_at, finished_at, created_at, updated_at
FROM generation_jobs
WHERE request_id = $1;

-- name: ListGenerationJobsForAdmin :many
SELECT id, user_id, project_id, page_id, request_id, status, prompt, page_type, domain, theme_slug, output_mode, credit_cost, error_message, retry_count, started_at, finished_at, created_at, updated_at
FROM generation_jobs
ORDER BY created_at DESC;

-- name: UpdateGenerationJobStatus :exec
UPDATE generation_jobs
SET status = $2, error_message = $3, updated_at = now(), finished_at = CASE WHEN $2 IN ('succeeded', 'failed', 'refunded', 'cancelled') THEN now() ELSE finished_at END
WHERE id = $1;

-- name: GetOwnedGenerationJob :one
SELECT id, user_id, project_id, page_id, request_id, status, prompt, page_type, domain, theme_slug, output_mode, credit_cost, error_message, retry_count, started_at, finished_at, created_at, updated_at
FROM generation_jobs
WHERE id = $1 AND user_id = $2;

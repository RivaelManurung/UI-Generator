-- name: CreateAuditLog :exec
INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, metadata, created_at)
VALUES ($1, $2, $3, $4, $5, $6, now());

-- name: ListAuditLogsForAdmin :many
SELECT id, user_id, action, resource_type, resource_id, metadata, created_at
FROM audit_logs
ORDER BY created_at DESC;

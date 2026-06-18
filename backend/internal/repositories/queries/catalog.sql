-- name: ListThemes :many
SELECT slug, name, accent
FROM themes
ORDER BY name ASC;

-- name: ListTemplates :many
SELECT id, name, domain, page_type, component_hint, tier, description
FROM templates
ORDER BY name ASC;

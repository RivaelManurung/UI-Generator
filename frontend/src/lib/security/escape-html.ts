/**
 * Escapes HTML characters in user-controlled strings to prevent cross-site scripting (XSS)
 * when rendered in HTML templates.
 */
export function escapeHtml(value: string): string {
  if (!value) return "";
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char] ?? char;
  });
}

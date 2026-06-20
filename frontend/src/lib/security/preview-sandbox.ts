/**
 * Security Policy for Generated Code Preview Canvas
 *
 * Mandate: Enforce strict origin isolation and sandboxing to block generated code from executing
 * XSS attacks in the parent SaaS context.
 *
 * Current Rules:
 * 1. An iframe must not have 'allow-same-origin' if it also has 'allow-scripts' AND is hosted on the same domain.
 *    If both are enabled on the same origin, the frame can remove its own sandbox dynamically.
 * 2. To simulate interactivity, we specify sandbox="allow-scripts" only (without allow-same-origin).
 *    This treats the iframe as a unique, isolated, cross-origin resource, blocking cookies,
 *    localStorage, and window.parent accesses.
 * 3. The iframe is rendered using 'srcDoc' with fully HTML-escaped metadata titles and content values.
 */

export const PREVIEW_IFRAME_SANDBOX_POLICY = "allow-scripts";

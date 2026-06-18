# DashboardCraft — Prioritized Backlog

## ✅ Execution status (this session)

**DONE & verified** (go build/vet/test ✓, frontend tsc/build ✓):
- P0 security #2 (constant-time sig), #3 (gross_amount cross-check), #4 (capture=accept gate), #5 (no admin seed in prod), #6 (JWT placeholder rejected by boot guard), #7 (/credits/deduct cap + rate-limit); plus midtrans PathEscape + Checkout DB-error fix + generic error message + error logging on snap/token/status.
- P1 reliability #10–#16, #18 (payment/snap error logs, GetOrderStatus propagation, batch.go list+wallet errors, project-status errors, studio getProjectPages toast + fetchDesignSystems/handleCreateProject catches, AnalyticsKPIs errors), #22 (admin-cache reset on logout).
- DB hardening #35 (indexes), #36 (FKs, NOT VALID), #39 (CHECK + raw_payload ::jsonb) → migration `000007_hardening`.
- UI/UX #25 (tracking-normal), #27 (rose→destructive token), #29 (touch targets ≥24px), #31 partial (Progress aria-label, pending vs succeeded color), #32 (white/70→/90 contrast), #34 (100svh).

**DEFERRED** (reason): #8 NextVersionNumber lock (rare; UNIQUE is the safety net) · #9 FOR-UPDATE-on-read (no-op on pure reads = harmless) · #19 eslint plugins (npm install + surfaces a large new backlog) · #20/#21 canvas listener-cleanup / ResizeObserver (involved, rare) · #23/#24 iframe perf + list-schema plumbing (refactor) · #28 window.confirm→Dialog (functional; a11y-only) · #30 canvas keyboard (part of studio hardening) · #31 Select label htmlFor (minor) · #33 app-shell dual-file · #37 sqlc LIMIT (needs sqlc regen) · #38 uniqueSlug race (rare 500) · #40 tail (CSP/HSTS, X-Request-ID, fail-closed limiter, fontUrl escape) · P2 logging (json.Unmarshal/seedDB).

**CONFIG — user must do:** #1 real Midtrans `SB-Mid-server-` key; #6 strong random `JWT_SECRET`.

---


Synthesized from a 6-agent specialist audit (go-reviewer, react-reviewer, security-reviewer, database-reviewer, silent-failure-hunter, a11y-architect). Deduped; a few agent claims corrected (noted inline). Severity: **P0** = blocks real/paid use or data loss · **P1** = correctness/perf/a11y/consistency · **P2** = hardening/polish.

---

## P0 — Security & money (fix before any real payment use)

1. **Wrong Midtrans key.** `backend/.env` `MIDTRANS_SERVER_KEY` holds a **client** key (`SB-Mid-client-…`). If server+client are both the (public) client key, an attacker can forge a valid webhook signature → mint credits. **Set the real `SB-Mid-server-…` key.** (config — you)
2. **Constant-time signature compare.** `midtrans.go:97` uses `==` on the HMAC → timing oracle on the unauth webhook. Use `crypto/subtle.ConstantTimeCompare`.
3. **Validate `gross_amount` vs DB.** `payment.go HandleNotification`/`settleOrder` never checks the notification amount against `payments.amount_idr`. Compare and reject mismatch.
4. **`capture` + `fraud_status=challenge` auto-settles.** `payment.go:~149` settles any non-`deny` capture → can over-credit. Require `fraud_status == "accept"`; treat `challenge` as pending.
5. **Seeded admin creds.** `auth.go:~82` seeds `admin@example.com / admin12345` (+ demo user) on **every** startup. Guard: only seed when `cfg.Environment != "production"`.
6. **Weak JWT secret.** `.env` `JWT_SECRET` is the example placeholder (guessable). Require a real 32B+ random secret; refuse to boot in production if it's the placeholder/default. *(corrected: it does NOT fall back to "dev-only" — the placeholder is set and used as-is, which is the problem.)*
7. **`/credits/deduct` is uncapped + unrate-limited.** `frontend_handlers.go:287` + route has no limiter; `amount` has no max → one call can drain a wallet. Add the generation rate-limiter, cap amount (≤ balance), truncate `description`.

## P0 — Correctness / data integrity

8. **`NextVersionNumber` race.** `versions.sql` `MAX+1` outside the page row-lock → two concurrent generations on one page collide on `(page_id, version_number)` UNIQUE. Lock the `project_pages` row (`FOR UPDATE`) inside the existing `WithTx` before computing the next number.
9. **`FOR UPDATE` outside a transaction.** `studio.go:594,600,747,753,898,1048` (+`WalletForUser`) call `wallets.GetForUpdate` on the bare pool → lock is a no-op. These are read-only paths → use a plain `SELECT balance`. (Real money paths inside `WithTx` are correct.)

## P1 — Reliability (dangerous silent failures)

10. **`payment.go:118/121`** — failed-status / snap_token UPDATE errors discarded (`_, _`). Log them (token already issued; just make it observable).
11. **`payment.go GetOrderStatus`** — post-settle `readOrder` error discarded → returns stale `pending` after a successful settle. Propagate the error.
12. **`batch.go:145`** — `ListByOwnedProject` error discarded → on a transient DB error, regeneration creates **duplicate pages** per type. Fail the batch instead.
13. **`batch.go:173`** — wallet-lookup error treated as "enough credits" → bypasses the pre-flight credit check. Handle the error explicitly.
14. **`frontend.go:222,263`** — project `status` UPDATE discarded → status correct in the create/update response but wrong on next read. Return the error.
15. **`studio-shell.tsx:~174`** — `getProjectPages` failure silently shows the empty "generate your first page" canvas → user may regenerate and burn a credit. Add an inline error state.
16. **`use-credit-balance.ts:35`** — `deductCredits` swallows failure and returns `false` with no toast/log. Surface it.
17. **`studio-shell.tsx:~120`** — `fetchDesignSystems()` has no `.catch()` (unhandled rejection). **`handleCreateProject`** create has no `.catch()` (silent fail). Add handlers.
18. **`frontend.go AnalyticsKPIs`** — `users.List`/`jobs.ListForAdmin` errors discarded → admin sees all-zero dashboards on DB error. Return/log the error.

## P1 — Frontend correctness & performance

19. **No `eslint-plugin-react-hooks` / `jsx-a11y`.** None installed → every hook-deps and a11y violation passes CI silently. Install + configure (highest leverage — prevents recurrence of most items here).
20. **`screens-canvas.tsx`** window pointer listeners (`startPan`/`startCardDrag`) aren't removed on unmount → leak + state-update-on-unmounted if you navigate mid-drag. Add cleanup/abort.
21. **`screens-canvas.tsx:424`** `getBoundingClientRect()` during render (minimap) → wrong in concurrent/Strict mode. Move to `ResizeObserver` + state.
22. **`use-is-admin.ts`** module-level `cachedAdmin` never reset on logout → next user in same tab sees admin UI (e.g. studio "Publish Free"). Export `resetAdminCache()` and call on logout.
23. **Eager iframes (perf).** `templates`, `projects`, and studio mount N `<iframe>` each running the 1107-line `renderPreview` synchronously. Intersection-gate the thumbnails (render on scroll-into-view) or cache a static snapshot at publish time. Move per-screen `renderPreview` into each card so a theme change recompiles one card, not all.
24. **`ProjectPreviewThumb`** fires one `getProjectPages` per card on mount (N calls for N projects). Return the first-page schema in the projects list response instead.

## P1 — UI/UX consistency (the "messy" feel) + accessibility

25. **Negative tracking everywhere public.** `tracking-tight` on `/templates`, `/pricing` headings + `site-header` logo violates CLAUDE.md (no negative tracking) and breaks visual parity with the landing page (which uses `font-bold tracking-normal`). Normalize.
26. **Public pages drift from landing.** `/templates` + `/pricing` use `font-extrabold` + `.glow`/`.grid-bg` hero + a different eyebrow pill vs the landing's `font-bold` + `landing-hero-bg` + `landing-pill`. Unify the public visual system.
27. **Hardcoded off-token colors.** `projects/page.tsx` delete uses `rose-600` (breaks in admin dark mode) → `text-destructive`/`variant="destructive"`. `free-template-card` `hover:shadow-lg` → `shadow-brand`. Arbitrary `tracking-[0.16em]/[0.22em]` in admin/sidebar/header → define tokens.
28. **`window.confirm()` for delete** in `admin/free-templates` → not accessible, unstyled, blocked in some contexts. Use the `<Dialog>` confirm pattern already in `projects/page.tsx`.
29. **Touch targets < 24px (WCAG 2.2 SC 2.5.8).** `screens-canvas` per-card device toggles are 20×20 and Refine is 24×24 with no spacing. Bump to ≥24px + spacing.
30. **Canvas keyboard/a11y.** `role="application"` with no keyboard pan/nav; cards reposition by pointer only (SC 2.1.1 / 2.5.7). Add arrow-key pan + focusable cards (ties to studio hardening #6).
31. **Form labels not associated.** admin publish-dialog `Project`/`Page` `<Select>` have no `htmlFor`/`id`. Spinners use `aria-label` on the SVG (ignored) instead of `role="status"` live region. `billing` `<Progress>` has no `aria-label`; `pending` vs `succeeded` render identical color (SC 1.4.1).
32. **Contrast.** `text-white/70` on `bg-planetary` (landing pricing card) ≈ 3.4:1 → fails AA; raise to `/90`+.
33. **`app-shell` dual-file drift.** `components/layout/app-shell.tsx` re-exports `components/app/app-shell.tsx` and drops `variant`; imports are split across both paths. Consolidate to one.
34. **Studio mobile.** `100vh` (not `100svh`) on studio panels overflows iOS; actions toolbar `overflow-x-auto` hides buttons (Versions/Refine/Publish) with no affordance. Fix viewport unit + collapse-to-menu.

## P2 — DB hardening

35. **Missing indexes:** `credit_transactions(user_id, idempotency_key)`, `api_keys(key_hash) WHERE revoked_at IS NULL`, `free_templates(source_page_id)`, `free_templates(created_by)`. (`payments.order_id`, `free_templates.slug` already UNIQUE.)
36. **Missing FKs:** `payments.package_slug → credit_packages.slug`; `free_templates.source_page_id → project_pages(id) ON DELETE SET NULL`.
37. **Unbounded admin/list queries** (`ListUsers`, `ListGenerationJobsForAdmin`, `ListAuditLogsForAdmin`, `ListCreditTransactionsByUser`) — add `LIMIT`/cursor pagination.
38. **`free_template.go uniqueSlug`** TOCTOU → use `INSERT … ON CONFLICT (slug)` retry instead of EXISTS-then-insert.
39. **`payment.go` raw_payload binding** — pass `[]byte`/`$3::jsonb` rather than `string(raw)` for the JSONB column. Add `CHECK ((reference_type IS NULL)=(reference_id IS NULL))` on `credit_transactions`.
40. **Other hardening:** `midtrans.go checkStatus` URL → `url.PathEscape(orderID)`; Snap error returned to client verbatim → log detail, return generic; rate-limiter fails-open on Redis error (`hardening.go:154`) — fail-closed for auth; add CSP/HSTS headers; escape/allowlist `fontUrl` injected into iframe `srcDoc` (`preview-compiler.ts:148`); validate `X-Request-ID`; remove duplicate `/v1` route registration (defense-in-depth, *not* an auth bypass — both go through the same auth middleware).

---

## Remaining features (from plan/memory)

- **Studio hardening (PAUSED plan)** — refine-per-screen (bug), persist canvas layout (server JSONB), per-screen failure + retry, version scoping per page, multi-project concurrency, canvas keyboard/touch, undo/redo. (Overlaps #15, #20, #30.)
- **Midtrans live E2E** — blocked on the correct server key (#1) + public webhook tunnel + dashboard notification URL (runbook in `docs/credit-topup-implementation.md`).
- **Done this session:** Midtrans top-up, Free Templates (admin + studio + public), project previews, studio start dialog, themeCost removal, secret-scan + gofmt hooks.

## Recommended execution order
1. **P0 security batch** (#1–7) — small, mostly mechanical, unblocks safe payments.
2. **P0 correctness** (#8–9) + **dangerous silent failures** (#10–16).
3. **Frontend foundation** (#19 lint plugins) → then UI/UX consistency pass (#25–34) to fix the "messy" feel.
4. **Perf** (#23–24), **DB hardening** (#35–40), then resume studio-hardening features.

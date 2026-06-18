# Implementation Report — Credit Top-up via Midtrans

**Status:** Implemented & verified (build/typecheck/migration/signature test green). Pending real sandbox E2E (needs Midtrans keys + public webhook URL).
**Scope:** Monetize credits as one-time top-up packs paid through Midtrans, replacing the previous free credit grant.

---

## 1. Context & goal

Credits are quota: **1 credit = 1 successful page generation**. The *consumption* side was already production-grade (atomic ledger `credit_transactions` + `credit_wallets` with `SELECT … FOR UPDATE`, refund on job failure). The *purchase* side was not: `PurchaseCredits(amount)` simply incremented the wallet for free — no payment, no package concept — and the pricing page was static and disconnected.

**Outcome delivered:** user picks a package → pays via Midtrans (QRIS / VA / e-wallet) → a signature-verified webhook credits the wallet **exactly once** (idempotent) and records a `topup` ledger row. Price is always computed server-side. The free top-up backdoor is removed.

### Locked decisions
- **Model:** one-time top-up (credits never expire; no subscription).
- **Provider:** Midtrans (Snap checkout + signature-verified webhook).
- **Packages (IDR), price corrected so per-credit decreases with size:**

  | Package | Price | Credits | Per credit |
  |---|---|---|---|
  | Individual | Rp 99.000 | 12 | Rp 8.250 |
  | Silver | Rp 690.000 | **100** (was 70) | Rp 6.900 |
  | Premium (popular) | Rp 1.250.000 | 250 | Rp 5.000 |

- **Entitlement = credits only.** All features available to everyone; "Priority support" is operational, not code-gated. No entitlement subsystem built.

---

## 2. Backend changes

### Data model — `backend/migrations/000005_payments.up.sql` / `.down.sql`
- `credit_packages` (pricing source of truth, admin-editable): `slug`, `name`, `price_idr`, `credits`, `sort`, `active`, `description`. Seeded with the 3 packages above (idempotent `ON CONFLICT DO NOTHING`).
- `payments` (order record): `id`, `user_id`, `package_slug`, `amount_idr`, `credits`, `status` (`pending|paid|failed|expired|cancelled`), `provider`, `order_id` (unique), `snap_token`, `provider_txn_id`, `raw_payload` (jsonb), `created_at`, `paid_at`.
- Reuses existing `credit_transactions` for the `topup` row with `idempotency_key = order_id`.

### Midtrans client — `backend/internal/services/midtrans.go`
Minimal stdlib client (no SDK / no network dependency at build): Snap `createSnapTransaction`, `verifySignature` (SHA512 of `order_id+status_code+gross_amount+server_key`), `checkStatus` (Core API for reconciliation). Sandbox/production hosts switched by `MIDTRANS_ENV`.

### PaymentService — `backend/internal/services/payment.go`
- `ListPackages` / `getPackage` — active packs from `credit_packages`.
- `Checkout(userID, packageSlug)` — **server computes the price** (client input ignored), inserts a pending `payments` row with `order_id = "tx-<uuid>"`, requests a Snap token, stores it.
- `HandleNotification(raw)` — verifies signature first; maps `transaction_status` (`settlement`/`capture+accept` → settle; `deny|cancel|expire|failure` → mark; `pending` → no-op).
- `settleOrder` — single `pool.Begin` transaction: lock the payment row (`FOR UPDATE`); if already `paid`, no-op (idempotent); else lock/create wallet, add credits, insert `topup` ledger row (`idempotency_key = order_id`), mark payment `paid`.
- `GetOrderStatus` — reconciles a stuck-pending order against Midtrans Core API (covers missed webhooks).

### Routes — `backend/internal/router/router.go`
- Public: `GET /v1/credit-packages`; `POST /v1/payments/midtrans/notification` (no auth — secured by signature).
- Authenticated: `POST /v1/payments/checkout`; `GET /v1/payments/:orderId`.
- **Removed** `POST /v1/credits/purchase`.

### Other backend
- `backend/internal/handlers/payment_handlers.go` — handlers for the routes above.
- `backend/internal/handlers/handlers.go` — `Handler` + `New` take a `*PaymentService`.
- `backend/internal/platform/config/config.go` — `MidtransServerKey`, `MidtransClientKey`, `MidtransEnv`.
- **Backdoor closed:** `FEPurchaseCredits` handler and `FrontendService.PurchaseCredits` (free top-up) deleted.
- `themeCost` charging concept dropped (all themes included → always 1 credit/page).

---

## 3. Frontend changes

- `src/types/credit.ts` — `CreditPackage`, `CheckoutResult`, `PaymentStatus`.
- `src/lib/services/credit-service.ts` — `listPackages`, `checkout`, `getPayment` (removed `purchaseCredits`).
- `src/lib/payments/midtrans-snap.ts` — lazy-loads Snap.js (client key from `NEXT_PUBLIC_*`), `payWithSnap`.
- `src/lib/payments/use-checkout.ts` — auth-gated checkout → Snap flow (`onPaid` is UI refresh only; credits come from the webhook).
- `src/components/pricing/pricing-plans.tsx` — fetches packages, renders cards (IDR), drives checkout; reused on both pricing and billing.
- `src/app/pricing/page.tsx` — live packages, FAQ updated (one-time, never expire); removed the misleading per-tier compare matrix.
- `src/app/app/billing/page.tsx` — "Buy credits" section + balance refresh after payment; removed the fake top-up.
- `src/components/settings/billing-settings.tsx` + `src/app/app/settings/page.tsx` — top-up button now links to `/app/billing`; removed mock "Stripe checkout".
- `src/components/studio/studio-shell.tsx` — header balance refreshes after a generation completes (**fixes stale balance**); studio "Top Up" routes to `/app/billing`.
- `src/hooks/use-credit-balance.ts` — removed `purchaseCredits`.
- `themeCost` removed across studio components (`prompt-input-box`, `empty-preview`, `generation-confirm-dialog`, `theme-picker-sheet`) and from the `DesignSystem` type.

---

## 4. Security & correctness

- **Price authority:** server resolves price from `credit_packages`; client-supplied amounts are never trusted.
- **Webhook signature verification** is mandatory before any state change (unit-tested).
- **Idempotent settlement:** guarded by `order_id` at both the payment row (`FOR UPDATE` + status check) and the ledger (`idempotency_key`), so a duplicated/retried webhook never double-credits.
- **Async methods supported:** QRIS/VA orders stay `pending` until `settlement`; reconciliation fallback covers missed webhooks.
- Secrets are env-only; the public webhook is secured by signature, not auth.

---

## 5. Configuration

**Backend** (`backend/.env`):
```
MIDTRANS_ENV=sandbox
MIDTRANS_SERVER_KEY=<from Midtrans dashboard>
MIDTRANS_CLIENT_KEY=<from Midtrans dashboard>
```
**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_MIDTRANS_ENV=sandbox
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=<public client key>
```

---

## 6. Verification performed

- `go build ./...` ✓ · `go vet` (changed packages) ✓
- Migration `000005` validated up→down→up inside a rolled-back transaction (dev DB untouched); seed values correct, idempotent ✓
- `go test -run TestVerifySignature` ✓ (valid passes, tampered/empty/amount-mismatch rejected)
- `go test -run TestSettleOrderIdempotent` ✓ — **DB-backed**: a duplicated signed `settlement` webhook credits the wallet **exactly once**, writes exactly one `topup` ledger row, marks the order `paid`, and rejects a tampered signature. (`backend/internal/services/payment_settle_test.go`; gated on `DATABASE_URL`, cleans up via FK cascade.)
- Frontend `tsc --noEmit` ✓ · `npm run build` ✓

The webhook → settlement → idempotency logic is now proven by automated tests **without** needing real Midtrans. What remains is exercising the real Snap UI + the Midtrans dashboard, which require your sandbox credentials and a public URL.

### Live sandbox runbook (requires your Midtrans account)
1. **Keys** — from the Midtrans dashboard (Sandbox), copy Server Key + Client Key into `backend/.env` (`MIDTRANS_SERVER_KEY`) and `frontend/.env.local` (`NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`); keep `*_ENV=sandbox`.
2. **Restart** both apps (backend re-runs migrations automatically; Next.js must restart to inline `NEXT_PUBLIC_*`).
3. **Public webhook** — start a tunnel to the backend, e.g. `ngrok http 8081`, giving `https://<sub>.ngrok.io`.
4. **Dashboard** — in Midtrans → Settings → Configuration, set **Payment Notification URL** to `https://<sub>.ngrok.io/v1/payments/midtrans/notification`.
5. **Pay** — open `/pricing` (or `/app/billing`), click a pack, complete payment in the Snap popup using a sandbox method (QRIS/VA simulator).
6. **Assert** — wallet balance increases by the pack's credits; `/app/billing` shows a `topup` row; the `payments` row is `paid`. Re-sending the notification from the dashboard must **not** double-credit (already covered by the automated test).

---

## 7. Appendix — other changes this session
- Backend port moved to **8081** (`backend/.env`); frontend `NEXT_PUBLIC_API_URL` + dev proxy default aligned.
- App workspace (`.app-interface`, incl. Studio) now inherits the planetary palette instead of the neutral shadcn override.
- Consolidated into a **monorepo** (removed nested `.git` in `backend/`/`frontend/`); added root `.gitignore`, CI (`backend-ci.yml`, `frontend-ci.yml`), and CD (Dockerfiles + `docker-publish.yml` → GHCR).

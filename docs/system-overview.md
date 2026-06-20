# UI Generator — Penjelasan Sistem

Dokumen ini menjelaskan **cara kerja produk UI Generator (DashboardCraft)** kita sendiri:
sebuah generator yang mengubah *brief produk* (prompt) menjadi halaman UI siap pakai —
dashboard, admin panel, internal tool, list/table, form, detail, dan landing.

Inti idenya: **schema-first**. Prompt tidak langsung jadi kode acak. Prompt diubah dulu
menjadi *skema halaman* yang tervalidasi, lalu skema itu di-render menjadi kode + preview.
Karena preview dan kode ekspor membaca sumber token yang sama, hasilnya konsisten.

---

## 1. Gambaran Besar

```
┌────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js)                                                   │
│  Public  ·  Studio (editor)  ·  App dashboard  ·  Admin dashboard     │
│        │ panggil REST API (JWT Bearer) via lib/api/http.ts            │
└────────┼─────────────────────────────────────────────────────────────┘
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  BACKEND (Go)                                                         │
│  cmd/api   → HTTP API (handlers → services → repositories)           │
│  cmd/worker→ proses job generation async (queue)                     │
│                                                                      │
│  Pipeline generation:                                                │
│   prompt ──► AI provider ──► PageSchema ──► validasi/normalisasi      │
│              (ai/*.go)        (schema.go)    (schema + normalizer)    │
│                                   │                                   │
│                                   ▼                                   │
│                            renderer (renderer/*.go)                   │
│                            code.go · token.go · icons.go · kits.go    │
│                                   │                                   │
│                                   ▼                                   │
│                       GeneratedFile[] (.tsx/.css/.json) + version     │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
  Postgres (migrations/*.sql)   ·   Redis (queue job async)
```

- **Backend**: Go, dua entrypoint — `backend/cmd/api` (REST API) dan `backend/cmd/worker`
  (pekerja job generation async).
- **Frontend**: Next.js (App Router) di `frontend/`, bicara ke backend lewat REST
  (`frontend/src/lib/api/http.ts`, token JWT dari `lib/api/auth.ts`).
- **Data**: Postgres (skema di `backend/migrations/`), antrian job pakai Redis.
- **Design system**: satu sumber token di backend (`internal/designsystem`) dipakai
  bersama oleh preview live dan kode ekspor → tidak bisa "beda tampilan".

---

## 2. Konsep Data Inti

Hierarki: **Project → Page → Version → File**, plus skema per halaman.

| Entitas | Isi penting | Tipe (frontend) |
|---|---|---|
| **Project** | name, domain, status, defaultThemeSlug, pagesCount, qualityAverage | `types/project.ts` |
| **Page** | satu layar (dashboard/list/detail/form/login/analytics), punya schema + files | `GeneratedPage` |
| **PageSchema** | `pageType`, `domain`, `layout`, `theme`, `brand`, `nav[]`, `sections[]` | `types/generation.ts` |
| **SchemaSection** | satu blok UI (`type`), span grid, items/series/columns/rows/fields, dst | `SchemaSection` |
| **GenerationVersion** | versi hasil generate: `files[]` + `schema` + `qualityScore` | `GenerationVersion` |
| **GeneratedFile** | `path`, `language` (`typescript`/`css`/`json`), `content` | `GeneratedFile` |

**Komponen/section yang valid** dijaga whitelist di backend (`internal/schema/schema.go`),
mis. `statsGrid`, `chartPanel`, `dataTable`, `activityTimeline`, `filterToolbar`,
`formSection`, `profileSummary`, `tabbedContent`, `kanbanBoard`, `calendarView`,
`notificationList`, `emptyState`, `actionFooter`, dan section kaya seperti `hero`,
`gallery`, `featureGrid`, `pricingTable`, `testimonials`.

**pageType yang valid**: `dashboard`, `list`, `form`, `detail`, `login`, `analytics`.

> Validasi whitelist ini yang membuat output stabil: AI hanya boleh memakai blok yang
> bisa kita render, sisanya dinormalisasi/ditolak (`normalizer.go`, `schema.go`).

---

## 3. Pipeline Generation (dari prompt ke UI)

Status job mengikuti `GenerationStatus` di `types/generation.ts`:

```
queued → analyzing_prompt → planning_layout → generating_schema
       → generating_code → validating → building_preview → completed
                                                          ↘ failed / cancelled
```

Langkah konkretnya:

1. **Prompt masuk.** User menulis brief di Studio (tujuan, audience, data inti, state
   yang dibutuhkan), pilih *design system / theme* dan jumlah halaman.
2. **AI provider memproses** (`backend/internal/ai/`): provider bisa **mock / gemini /
   openai** (dipilih lewat config). Provider menghasilkan struktur halaman, bukan kode mentah.
3. **PageSchema dibentuk & divalidasi** (`internal/schema/schema.go` + `normalizer.go`):
   pageType dan komponen dicek terhadap whitelist; data (angka metric, series chart,
   rows tabel) dinormalisasi agar masuk akal per domain.
4. **Renderer mengubah skema jadi kode** (`internal/renderer/`):
   - `token.go` → menyuntik token design-system jadi CSS variables.
   - `icons.go` → ikon SVG nyata.
   - `kits.go` / `code.go` → menyusun komponen `.tsx`, `.css`, dan `.json` final.
5. **Hasil disimpan sebagai Version**: kumpulan `GeneratedFile` + `schema` + `qualityScore`.
6. **Preview dibangun** di frontend (`lib/generation/preview-compiler.ts`) memakai token
   yang sama dengan kode ekspor.

Job berat dijalankan **async** oleh `cmd/worker` lewat queue; frontend memantau dengan
`pollGenerationJob()` (`lib/services/generation-service.ts`) sampai status terminal
(`succeeded` / `failed` / `refunded` / `canceled`), dengan timeout supaya UI tidak
menggantung kalau worker/Redis tidak tersedia.

---

## 4. Endpoint Generation Utama

Diambil dari `frontend/src/lib/services/generation-service.ts`:

| Aksi | Endpoint | Catatan |
|---|---|---|
| Generate banyak halaman dari 1 prompt | `POST /projects/:id/generate-pages` | set halaman koheren (dashboard/list/detail/form) |
| Ambil semua halaman project | `GET /projects/:id/app-pages` | untuk tab Studio |
| Regenerate satu halaman | `POST /pages/:id/generate` | async → kembalikan `jobId` untuk di-poll |
| Rename / hapus halaman | `PATCH /pages/:id` · `DELETE /pages/:id` | re-slug dari nama baru |
| Buat job generation (single) | `POST /projects/:id/generations` | idempotent |
| Refine satu section | `POST /projects/:id/generations/refine` | edit terarah per blok |
| Daftar versi / versi aktif | `GET /projects/:id/versions` · `/versions/active` | |
| Ambil file versi | `GET /projects/:id/versions/:vid/files` | |
| Restore versi | `POST /projects/:id/versions/:vid/restore` | rollback |
| Export project | `GET /projects/:id/export.zip` | zip dibangun di server |

---

## 5. Design System & Theme (kunci konsistensi)

- Sumber kebenaran token ada di backend: `internal/designsystem` (disajikan via
  `GET /design-systems`), dikonsumsi frontend lewat `lib/generation/design-systems.ts`.
- Satu `DesignSystem` = satu gaya visual (shadcn, neobrutalism, glass, soft, dll.)
  berisi `tokens` (font, radius, warna, shadow, sidebar, …) + opsi CSS tambahan.
- **Preview live dan kode ekspor membaca token yang sama**, jadi yang dilihat user di
  Studio = yang diekspor. Tidak ada drift tampilan.

> Catatan: design-system di sini adalah token tampilan untuk **UI yang DIGENERATE**.
> Berbeda dari `globals.css` aplikasi (palette planetary indigo + font Inter) yang
> dipakai untuk *chrome* aplikasi kita sendiri (landing/studio/app/admin).

---

## 6. Surface (Halaman) Frontend

- **Public** (`/`): menjelaskan produk + arahkan ke generator/registrasi.
- **Studio** (`app/app/studio`): layar kerja utama editor —
  panel kiri (brief/prompt/setting), tengah (preview kanvas + device controls),
  kanan (code / schema / version / log). Bisa regenerate per halaman & refine per section.
- **App dashboard** (`app/app/...`): Projects, Project detail + Pages, Billing, Settings, Templates.
- **Admin dashboard** (`app/admin/...`): Users (360 per user), Billing/Payments, Analytics,
  Generations, Templates, Free templates, Themes — pakai `AdminShell`.

---

## 7. Credit, Pembayaran, Auth

- **Credit**: tiap job generation memesan (reserve) credit; kalau gagal/cancel,
  credit **di-refund** (status `refunded`/`canceled`). Lihat `credit-service.ts`,
  `internal/services/payment.go`.
- **Pembayaran**: top-up credit via **Midtrans (IDR)** —
  `lib/payments/midtrans-snap.ts`, `use-checkout.ts`, backend `services/midtrans.go`
  + `payment.go` (migrasi `000005_payments`).
- **Auth**: JWT access token (login/register), `lib/api/auth.ts` + `internal/services/auth.go`.

---

## 8. Peta File Penting

**Backend (Go)**
- `backend/cmd/api/main.go` — entrypoint REST API
- `backend/cmd/worker/main.go` — worker job generation async
- `backend/internal/ai/` — provider.go (mock/gemini/openai), normalizer.go, variation.go, image.go
- `backend/internal/schema/schema.go` — definisi & validasi PageSchema (whitelist)
- `backend/internal/renderer/` — code.go, token.go, icons.go, kits.go (skema → kode)
- `backend/internal/designsystem/` — katalog design system (sumber token)
- `backend/internal/services/` — generation, studio, payment, admin, auth, free_template, dst
- `backend/migrations/*.sql` — skema database

**Frontend (Next.js)**
- `frontend/src/types/generation.ts` — kontrak PageSchema/Version/File + status
- `frontend/src/lib/services/generation-service.ts` — semua panggilan generation
- `frontend/src/lib/generation/preview-compiler.ts` — render preview dari token
- `frontend/src/lib/generation/design-systems.ts` — fetch + fallback design system
- `frontend/src/lib/api/http.ts` — REST client (Bearer JWT)

---

## 9. Ringkas Satu Kalimat

> User menulis brief → AI mengubahnya jadi **skema halaman tervalidasi** → renderer
> mengubah skema jadi **kode + preview** dengan token design-system yang sama →
> hasil disimpan sebagai **versi** yang bisa di-preview, di-refine, di-rollback, dan
> di-export sebagai zip — dengan credit/pembayaran dan dashboard admin di belakangnya.

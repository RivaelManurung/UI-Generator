# UI Generator

Monorepo dengan dua bagian:

- **`frontend/`** — Next.js 16 (App Router, TypeScript)
- **`backend/`** — Go + Gin REST API

## Struktur

```
.
├── frontend/            # Next.js app
│   └── src/
│       ├── app/         # halaman & layout (App Router)
│       └── data/        # seed data demo sementara untuk layar yang belum terintegrasi
└── backend/             # Go Gin API
    ├── cmd/api/         # entrypoint API baru
    ├── cmd/server/      # entrypoint kompatibilitas lama
    ├── cmd/worker/      # bootstrap worker
    ├── migrations/      # migration PostgreSQL reversible
    ├── openapi/         # kontrak API
    └── internal/
        ├── http/        # middleware request/auth/RBAC
        ├── platform/    # config, logger, postgres, redis
        ├── repositories/ # kontrak repository + sqlc queries
        ├── seed/        # seed data demo backend
        ├── router/      # registrasi route + middleware
        └── handlers/    # handler tiap endpoint
```

## Seeder

- Backend seed ada di `backend/internal/seed/data.go` dan dipakai otomatis saat `services.NewStudioService()` dibuat.
- Frontend seed ada di `frontend/src/data/seed.ts`; `frontend/src/lib/api/client.ts` hanya menjadi layer client yang membaca data tersebut.
- Catatan production: seed/mock tidak boleh menjadi source of truth untuk authenticated product flow. Ini masih sisa pekerjaan untuk halaman selain auth/studio/admin gate.

## Infrastruktur lokal

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
docker compose up -d postgres redis
```

Migration SQL ada di `backend/migrations/`. Saat tool migration dipilih, jalankan file `*.up.sql` ke database dari `DATABASE_URL`; rollback memakai `*.down.sql`.

## Menjalankan backend

```bash
cd backend
go run ./cmd/api
# berjalan di http://localhost:8080 (atur PORT untuk ubah)
```

Env penting:

- `PORT`
- `CORS_ALLOWED_ORIGINS`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`

Demo login lokal:

- User: `demo@example.com` / `password123`
- Admin: `admin@example.com` / `admin12345`

Endpoint:

- `GET /healthz`
- `GET /readyz`
- `GET /api/health` → `{ "status": "ok", "message": "backend is running" }`
- `GET /api/hello?name=Budi` → `{ "message": "hello, Budi" }`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/projects` memakai `Authorization: Bearer <accessToken>`

Catatan: `/v1/*` juga tersedia tanpa prefix `/api` untuk kontrak production.

## Menjalankan frontend

```bash
cd frontend
npm install
npm run lint
npm run typecheck
npm run dev
# berjalan di http://localhost:3000
```

Frontend mem-proxy `/api/*` ke backend (lihat `frontend/next.config.ts`).
Salin `frontend/.env.local.example` ke `.env.local` untuk mengubah `BACKEND_URL`.

Jalankan kedua server, lalu buka http://localhost:3000 — halaman utama
akan menampilkan status dari backend.

## Status Production Hardening

Yang sudah masuk:

- Auth register/login/refresh/logout dengan access token + refresh token rotation.
- Middleware request ID, bearer auth, RBAC admin, dan error JSON konsisten.
- Ownership check untuk project/page/version/generation path.
- CORS dari env whitelist, bukan wildcard.
- Migration PostgreSQL awal, sqlc query files, repository contracts, dan OpenAPI awal.
- `/healthz` dan `/readyz`.
- Guard frontend dasar untuk `/app` dan `/admin`.
- `npm run lint` dan `npm run typecheck` memakai TypeScript strict check yang kompatibel dengan Next 16.

Yang masih harus dilanjutkan:

- Runtime repository PostgreSQL/pgx/sqlc menggantikan repository in-memory.
- Redis queue dan worker generation async penuh.
- Credit reserve/consume/refund berbasis transaksi DB dan row locking.
- FE authenticated product pages selain Studio masih perlu dipindahkan dari seed lokal ke endpoint backend.
# UI-Generator

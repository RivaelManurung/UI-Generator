# Plan: Ganti Theme Tanpa Generate Ulang + Render Library Asli

> ## ⛔ DIBATALKAN (klarifikasi user 2026-06-18)
> User menegaskan: **theme dipilih SAAT generate dan TERKUNCI ke hasilnya. Setelah digenerate, mengganti picker theme TIDAK boleh mengubah hasil — mau ganti theme harus GENERATE ULANG.** Premis plan ini (ganti theme tanpa regenerate) **kebalikan** dari yang diinginkan.
>
> **Tindakan koreksi yang sudah dilakukan:**
> - Preview **dilepas dari picker**: `screenCards` kini memakai `generatedThemeSlug` (theme saat di-generate), bukan `selectedThemeSlug` (picker). Mengganti picker **tidak** lagi me-re-skin hasil.
> - `selectedThemeSlug` = theme untuk generate BERIKUTNYA saja; preview terkunci ke `generatedThemeSlug` (di-set saat generate mulai & saat buka project dari `defaultThemeSlug`).
> - Endpoint free-switch dimatikan: route `PUT /projects/:id/theme` dihapus, `generationService.setProjectTheme` dihapus, `handleSelectTheme` cuma `setSelectedThemeSlug`. (Handler/service backend `SetProjectTheme` ditinggal sebagai dead code tak terjangkau.)
>
> Sisa dokumen di bawah hanya arsip rencana lama. **Jangan dieksekusi.**

---

> Status: ~~REVISED — keputusan terkunci~~ **DIBATALKAN (lihat atas).**

## Status eksekusi (per 2026-06-18)

- ✅ **Fase 1 (token re-theme tanpa regenerate) SELESAI & terverifikasi statis** (go build/vet/test, tsc, next build semua hijau). Endpoint `PUT /projects/:id/theme` + `SetProjectTheme` (re-render `generated_code` in-place, no-AI no-kredit) + repo `UpdateGeneratedCode` + frontend `setProjectTheme`/`handleSelectTheme` + init theme dari project. **Belum di-live-QA** (atas permintaan user, QA browser tidak dilakukan).
- 🟡 **Fase 2 (render library asli) — PRASYARAT SELESAI, Sandpack DITAHAN.**
  - ✅ **kits.go dilengkapi** (build/vet/test hijau): export antd/mui/chakra kini chart **data-driven** (bar dari schema, bukan kotak gradient palsu), antd `dataTable` terisi `dataSource` nyata (key `c{i}`), dan **`default` data-aware** (items/fields/rows/primaryAction dirender — tak ada lagi card kosong). Helper bersama `writeKitChart`/`writeKitContent`.
  - ⏳ **Sandpack live-render DITAHAN** (atas keputusan user): fitur visual murni + dependency runtime baru, tak bisa dipercaya tanpa verifikasi visual yang sekarang off. Lanjut saat QA visual diizinkan.

## Keputusan terkunci (dari review)

1. **Simpan kode hasil re-theme ke DB** (bukan render-on-demand murni). View Code & export ambil dari `generated_code` yang sudah di-refresh.
2. **Update di tempat** — tidak membuat versi histori baru saat ganti theme.
3. **Render library ASLI masuk scope** (Fase 2) — bukan sekadar token-approximation.
4. Plan **prompt-fidelity dibuat terpisah** → `docs/prompt-fidelity-plan.md`.

## Pendekatan dua fase

- **Fase 1 — Re-theme token tanpa regenerate** (cepat, fondasi): ganti theme → re-render kode (token) → simpan ke DB → preview/View Code/ZIP konsisten. Tanpa AI, tanpa kredit.
- **Fase 2 — Render library asli** (berat): preview & kode memakai komponen nyata (shadcn/ui, antd, mui) via sandbox in-browser. Bergantung pada Fase 1 + kit code generator yang dilengkapi.

## 1. Konteks & masalah

User ingin: **theme dipilih saat generate, dan hasilnya bisa diganti theme-nya tanpa harus generate ulang** (hemat waktu + kredit). Pertanyaan turunan: apakah perlu menyimpan library komponen (shadcn/antd/dll) di sistem? **Tidak** — theming di sini berbasis **token**, bukan komponen asli.

## 2. Insight kunci (kenapa ini murah)

- **Schema itu theme-independent.** Ia hanya struktur + data. Theme ditempel **saat render**.
- **Renderer bersifat deterministik** dari `schema + token`:
  - Preview: `renderPreview(schema, { designSystem })` — [preview-compiler.ts](../frontend/src/lib/generation/preview-compiler.ts) (client-side).
  - Export: `renderer.Generate(schema, "tsx", themeSlug)` — `backend/internal/renderer/token.go` / `kits.go` (server-side).
- Token = peta CSS variable di **satu sumber**: `backend/internal/designsystem/systems.json` → `GET /design-systems` → [design-systems.ts](../frontend/src/lib/generation/design-systems.ts).

**Konsekuensi:** ganti theme = render ulang schema yang sama dengan token berbeda. **Tidak memanggil AI, tidak memakan kredit.**

## 3. Keadaan saat ini (terverifikasi)

| Bagian | Status sekarang | Bukti |
|---|---|---|
| **Preview** | ✅ **Sudah re-skin live** saat picker theme berubah | `screenCards` useMemo bergantung `selectedThemeSlug` — [studio-shell.tsx](../frontend/src/components/studio/studio-shell.tsx) (memo ~L243, dep `selectedThemeSlug`) |
| **Theme tersimpan di project** | ⚠️ Hanya di-set saat **create** project (`defaultThemeSlug`), tidak di-update saat user ganti picker pasca-generate | studio-shell.tsx L206/L229 |
| **Kode export (Download ZIP)** | ❌ Pakai **file TSX yang sudah di-bake** saat generate, bukan re-render | `ExportProjectZip` membaca `p.Files` (`r.pageTSX = file.Content`) — `frontend.go` (~L694+) |
| **View Code / Copy / Files** | ❌ Tampilkan `selectedPage.files` (file tersimpan, theme lama) | studio-shell.tsx (CodeViewerDialog/ProjectFilesSheet pakai `files`) |

Jadi: **preview** sudah bisa ganti theme; yang belum: **persistensi theme** + **kode (export/view) ikut theme baru**.

## 4. Tujuan

1. Setelah generate, user bisa **ganti theme** dan **preview + kode export + view-code semuanya ikut**, **tanpa generate ulang & tanpa kredit**.
2. Theme pilihan **tersimpan** di project (saat dibuka lagi, theme terakhir dipakai).
3. (Opsional, terpisah) opsi render **library asli** untuk theme tertentu — dengan biaya jelas.

---

## 5. Fase 1 — Re-theme berbasis token TANPA regenerate

Pendekatan terkunci: ganti theme → **re-render kode dari `schema_json` + theme baru → SIMPAN ke `page_versions.generated_code` (update di tempat, tanpa versi baru)**. Preview re-skin live (sudah jalan); View Code & ZIP baca `generated_code` yang baru.

### Backend
1. **Service + endpoint (deterministik, no-AI, no-credit):**
   `PUT /v1/projects/:id/theme` body `{ themeSlug }` → `FrontendService.SetProjectTheme(userID, projectID, themeSlug)`:
   - Validasi `themeSlug` ada di katalog (`designsystem.Has` / kit dikenal).
   - Update `projects.default_theme_slug`.
   - Untuk tiap page milik project: parse `current_version.schema_json` → `renderer.Generate(schema, "tsx", themeSlug)` → **UPDATE `page_versions.generated_code` di tempat** (juga set `theme_slug` versi bila ada kolomnya). **Tidak** buat versi baru, **tidak** sentuh kredit/AI.
   - Route admin/auth biasa (pemilik project), tanpa `generationLimiter`.
2. **Export ikut theme:** `ExportProjectZip` sudah baca `p.Files`/`generated_code`; karena #1 sudah me-refresh `generated_code`, ZIP otomatis ikut. (Tidak perlu render-on-demand — sesuai keputusan "simpan ke DB".)
   - Verifikasi sumber di `frontend.go` `ExportProjectZip` (`r.pageTSX`).

### Frontend
3. **Service:** `generationService.setProjectTheme(projectId, slug)` → `PUT /projects/:id/theme`.
4. **Wiring `onSelectTheme`** ([studio-shell.tsx](../frontend/src/components/studio/studio-shell.tsx)): jika project sudah punya halaman → panggil `setProjectTheme`, lalu `setSelectedThemeSlug(slug)` (preview re-skin instan) + `refreshPages()` (View Code/ZIP ikut) + update `project.defaultThemeSlug` lokal. Jika pra-generate → cukup set state (perilaku sekarang).
5. **Init theme dari project:** saat buka project, set `selectedThemeSlug` dari `project.defaultThemeSlug` (sekarang hardcoded `"shadcn"`, studio-shell.tsx L122).
6. **UX:** badge "Ganti theme gratis — tanpa generate ulang" di `ThemePickerSheet` saat project sudah punya halaman.

### Hasil Fase 1
Ganti theme pasca-generate → preview, View Code, Copy, Download ZIP konsisten; **0 kredit, tanpa AI**; theme tersimpan & dipulihkan saat project dibuka lagi.

---

## 6. Fase 2 — Render LIBRARY ASLI (dipilih, in-scope)

Tujuan: preview & kode memakai **komponen nyata** (shadcn/ui, antd, mui, chakra) — bukan token-approximation.

### Tantangan inti
Preview sekarang = HTML/CSS self-contained (token). Untuk komponen asli, perlu **menjalankan React + library** di dalam sandbox.

### Pilihan teknis (untuk diputuskan saat eksekusi)
| Pendekatan | Cara | Plus | Minus |
|---|---|---|---|
| **Sandpack** (`@codesandbox/sandpack-react`) — REKOMENDASI | Beri TSX hasil generate + `package.json` (dep library) → bundler in-browser merender live | Komponen + interaksi asli; tak butuh server; ekosistem matang | Bundle besar, render awal lebih lambat, fetch dep dari CDN |
| **esbuild-wasm + import maps (esm.sh)** | Compile TSX in-browser, load React+lib dari `esm.sh` | Lebih ringan dari Sandpack, kontrol penuh | Banyak plumbing, error-prone |
| **SSR Node sidecar** | Service Node (lib terinstall) render → HTML | Aman, cepat dilihat | Statis (tanpa hidrasi = tanpa interaksi); butuh proses Node + dep |

### Prasyarat (penting — gap saat ini)
- **Kit code generator harus dilengkapi & diisi data.** Sekarang `kits.go` (antd/mui/chakra) hanya implement `statsGrid`/`dataTable`/`chartPanel`, sisanya stub `<Card>` kosong, dan `dataSource={[]}` (tabel kosong). Render asli akan **memperlihatkan kekosongan ini** → harus lengkapi semua section type + isi data dari schema, untuk tiap library. Ini bagian terberat.
- **Per-library chart**: render chart pakai lib chart (mis. `recharts`) agar konsisten dengan komponen.

### Rancangan
1. Mode preview baru di studio: toggle **"Live (library asli)"** vs **"Cepat (token)"**. Default tetap token (instan); Live untuk theme berbasis library.
2. Komponen `LiveSandboxPreview` (frontend) memuat Sandpack dengan file TSX (dari `generated_code`) + `package.json` sesuai `library`.
3. Lengkapi `kits.go` per library: semua section type + data nyata + chart lib.
4. Tandai theme mana yang "library asli" (field `library` di katalog design-system sudah ada) → studio memilih mode otomatis.

### Risiko Fase 2
Berat & lambat dibanding token; perlu menjaga keamanan sandbox; biaya pemeliharaan tinggi (tiap library = generator + mapping sendiri). Disarankan **kerjakan Fase 1 dulu sampai stabil**, baru Fase 2 di belakangnya.

---

## 7. Di luar scope (item terkait, terpisah)

- **Prompt-fidelity** ("prompt login malah jadi dashboard"): plan terpisah → **`docs/prompt-fidelity-plan.md`**. Catatan: Fase 2-nya (code-gen komponen nyata) beririsan dengan Fase 2 plan theme ini (render library asli) — arah sama: dari "isi slot schema" → "hasilkan kode komponen nyata".

## 8. Verifikasi (saat nanti dieksekusi)

- Backend: `go build ./...`, `go vet`, unit test `SetProjectTheme`/`ExportProjectZip` (schema sama, theme beda → output token berbeda; tanpa job/kredit baru).
- Frontend: `tsc --noEmit`, `npm run build`.
- E2E manual: generate 1 project → ganti theme di picker → cek (a) preview berubah, (b) View Code berubah, (c) Download ZIP berisi token baru, (d) saldo kredit **tidak** berkurang, (e) buka ulang project → theme terakhir dipakai.

## 9. Risiko

- Re-render kode untuk banyak halaman bisa menambah latensi export — mitigasi: render-on-demand hanya saat export/view, atau cache `generated_code`.
- Konsistensi theme antara preview (client `design-systems.ts`) dan export (server `systems.json`) — sudah satu sumber via `/design-systems`, jaga agar tetap sinkron.
- Jika menyimpan ulang `generated_code` tanpa versi baru, histori versi tak mencatat perubahan theme (keputusan di §5).

## 10. Urutan eksekusi (saat diberi aba-aba)

**Fase 1 (token re-theme, no-AI):**
1. Backend: `SetProjectTheme` + endpoint `PUT /projects/:id/theme` (update `default_theme_slug` + re-render `generated_code` di tempat). Pastikan `ExportProjectZip` baca `generated_code` yang sudah di-refresh.
2. Frontend: `generationService.setProjectTheme` + wiring `onSelectTheme` (panggil endpoint → set state → `refreshPages`) + init `selectedThemeSlug` dari `project.defaultThemeSlug`.
3. UX badge "gratis tanpa generate ulang" + verifikasi (kredit tak berkurang, semua konsisten, theme dipulihkan saat buka project).

**Fase 2 (library asli, setelah Fase 1 stabil):**
4. Lengkapi `kits.go` per library (semua section + data + chart lib).
5. `LiveSandboxPreview` (Sandpack) + toggle mode preview Live/Cepat + auto-pilih mode dari field `library`.
6. Verifikasi per library.

> **Status keputusan: TERKUNCI** (DB, update di tempat, library asli in-scope, prompt-fidelity plan terpisah). Menunggu aba-aba "jalankan" — mulai dari Fase 1.

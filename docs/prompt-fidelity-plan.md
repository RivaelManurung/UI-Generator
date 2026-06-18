# Plan: Prompt-Fidelity — Hasil Generate Sesuai Prompt (default)

> Status: **DRAFT — menunggu review. Belum dieksekusi.**
> Disusun dari pembacaan kode (sitasi file:line). Tidak ada perubahan kode yang dibuat.
> Terpisah dari `docs/theme-switching-plan.md`.

## Status eksekusi (per 2026-06-18)

- ✅ **Fase 1 (planning sadar-prompt) SELESAI & terverifikasi statis** (go build/vet/test, tsc, next build hijau). `resolveAppPlan` kini memakai `PlanApp` (AI) untuk tipe halaman dan cap ke `PageCount`; fallback `promptAwarePlan`/`NormalizeIntent`. Manual `Pages:1` + prompt "login" → halaman **login** (bukan dashboard buta).
- ✅ **Fase 2 (authForm) SELESAI & terverifikasi statis.** Section `authForm` ditambah lintas schema (whitelist+validasi), mock `buildSchema` login, prompt (single+multi-page), renderer preview (kartu login terpusat: logo, email/password + toggle show-password, remember me, forgot, primary, divider, "Continue with Google", background gradient), dan export `token.go`.
- ⚠️ **Belum di-live-QA** (atas permintaan user, QA browser tidak dilakukan). Verifikasi sejauh ini hanya statis (build/test/tsc).

## 1. Masalah

Prompt detail "Buat halaman login modern… form di tengah, gradient bg, toggle show password, remember me, forgot password, tombol Google, dark/light mode…" → hasilnya malah **Operations Dashboard** (KPI + chart + activity). Prompt tidak dihormati.

## 2. Akar masalah (terverifikasi)

### A. Planning memaksa tipe halaman saat jumlah halaman manual
[`resolveAppPlan`](../backend/internal/services/frontend.go#L520-L523):
```go
if !in.Auto && in.PageCount >= 1 {
    return planPages(in.PageCount)   // rencana TETAP, prompt diabaikan untuk tipe
}
```
[`planPages`](../backend/internal/services/frontend.go#L451-L457) = fix `Overview(dashboard) / Records(list) / Detail / Create Form`. `planPages(1)` → selalu `dashboard`. Pilih "Pages: 1" → tipe halaman **selalu dashboard**, apa pun prompt.

### B. Tiap page di-generate dengan PageType dipaksa
[frontend.go L582-588](../backend/internal/services/frontend.go#L582-L588): `GenerateSyncForUser(..., GenerateInput{ Prompt: in.Prompt, PageType: it.plan.PageType, ... })`. Prompt dikirim sebagai brief, **tapi PageType dari rencana** → AI disuruh "bikin dashboard dari teks ini". Niat "login" hilang sebelum AI mulai.

### C. Domain generik + fallback mock
Prompt "login/SaaS/Stripe" tak cocok domain → label default `Operations Dashboard / Total Records / …` (`provider.go domainLabels` default). Jika output AI gagal validasi → [`ReprocessWithMock`](../backend/internal/services/frontend.go#L595-L602) = template dashboard mock.

### D. (Lebih dalam) sistem schema-first, bukan code-first
Output dibatasi kosakata schema (21 section) + shell admin tetap. Detail visual/UX prompt (card tengah, gradient, toggle password, Google btn, dark mode, struktur folder, dummy auth) **tak punya slot** → dibuang. Template `login` pun cuma `formSection + actionFooter`.

**Catatan:** Mode **Auto** sudah benar — `PlanApp` (AI) membaca prompt & memilih tipe (termasuk `login`). Masalah hanya pada jalur **manual page count**.

## 3. Tujuan

Default (termasuk jumlah halaman manual) **menghormati prompt**: prompt "login" → halaman `login`; prompt "inventory" → list/detail/form yang relevan; dan kualitas layar mengikuti maksud prompt sejauh kosakata mengizinkan.

## 4. Pendekatan dua fase

### Fase 1 — Planning sadar-prompt (cepat, dampak besar)
Buat jalur manual tetap menentukan **tipe halaman dari prompt**, bukan rencana buta.

1. **`resolveAppPlan`** ([frontend.go L520](../backend/internal/services/frontend.go#L520)): saat manual (`!Auto && PageCount>=1`):
   - Tentukan tipe halaman dari prompt. Opsi:
     - (a) **Reuse `PlanApp`** (AI) lalu ambil `PageCount` halaman pertama — paling akurat, tapi 1 panggilan AI ringan saat planning.
     - (b) **Heuristik `NormalizeIntent(prompt)`** ([normalizer.go L16](../backend/internal/ai/normalizer.go#L16)) untuk halaman utama, lalu lengkapi dengan tipe pendukung relevan — tanpa AI, lebih cepat, kurang pintar.
   - **Rekomendasi:** (a) untuk Auto **dan** manual; kalau `PlanApp` gagal/timeout → fallback (b) → fallback `planPages`. Jadi manual = "pakai PlanApp tapi dibatasi `PageCount`".
2. **Single page (`PageCount=1`)**: halaman tunggal = tipe dominan hasil intent (login/list/form/dashboard), bukan paksa `Overview`.
3. **Nama halaman** dari prompt (sudah ada `defaultPageName`/PlanApp name), bukan "Overview" generik.

**Hasil Fase 1:** prompt "login" + Pages:1 → halaman **login**. Ini langsung memperbaiki keluhan utama.

### Fase 2 — Ekspresivitas layar (lebih berat)
Agar layar login (dan lainnya) benar-benar sesuai detail prompt:
1. **Perkaya template `login`/auth** di renderer + schema: section `authForm` (card tengah, logo, email/password + toggle show, remember me, forgot link, tombol utama, divider, tombol Google/social), opsi background (gradient/blur). Tambah ke `preview-compiler.ts` + `schema.go` (whitelist + validasi) + prompt single-page agar AI mengisinya.
2. **Honor sinyal visual prompt** (dark mode, gradient) sebagai opsi schema/section bila layak.
3. **(Paling jauh) pindah sebagian ke code-gen** agar struktur folder/komponen & detail UX benar-benar dihormati — selaras dengan Fase 2 di `theme-switching-plan.md` (render library asli). Berbagi arah: dari "isi slot schema" → "hasilkan kode komponen nyata".

## 5. Out of scope
Theme switching → `docs/theme-switching-plan.md`.

## 6. Verifikasi (saat dieksekusi)
- Unit: `resolveAppPlan` manual → tipe sesuai prompt (login/list/form), dengan fallback berlapis.
- E2E: prompt login + Pages:1 → halaman login; prompt analytics → analytics; dll.
- Tidak ada regресi pada Auto.
- `go build`/`vet`/test; FE `tsc`/build.

## 7. Risiko
- Memakai `PlanApp` untuk manual menambah 1 panggilan AI ringan saat planning (latensi/biaya kecil) — mitigasi: cache/timeout + fallback heuristik.
- Mengubah perilaku default planning bisa mempengaruhi test yang mengasумsikan `planPages`. Perlu update test.
- Fase 2 (authForm dll) menyentuh schema whitelist + validasi + prompt + renderer + export — area luas, kerjakan setelah Fase 1.

## 8. Urutan eksekusi (saat diberi aba-aba)
1. Fase 1: `resolveAppPlan` sadar-prompt (PlanApp + fallback) + nama halaman + update test. → 2. Verifikasi E2E. → 3. (Opsional lanjut) Fase 2: section `authForm` + prompt + renderer + export.

> Menunggu keputusan: **kerjakan Fase 1 saja dulu, atau Fase 1+2?** Rekomendasi: Fase 1 dulu (cepat & menyelesaikan keluhan inti), Fase 2 menyusul.

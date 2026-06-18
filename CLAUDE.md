# CLAUDE.md

Panduan ini adalah sumber kebenaran desain untuk UI Generator. Semua halaman baru dan refactor halaman lama harus mengarah ke sistem desain ini.

## Arah Produk

DashboardCraft adalah project UI generator untuk membuat dashboard, admin panel, internal tool, landing page, form, table view, dan halaman operasional dari brief produk.

Desain harus terasa:

- Colorful, bersih, dan modern.
- Product-builder, bukan "AI gimmick".
- Profesional tapi tidak kaku.
- Konsisten dari public page, templates, pricing, app dashboard, admin dashboard, dan studio.
- Cepat dipindai, dengan struktur UI yang jelas.

Jangan membuat desain terasa seperti:

- Halaman AI generik dengan sparkle berlebihan.
- Dashboard biru shadcn default yang dingin.
- Editorial beige/black yang berat.
- Landing page terpisah gaya dari dashboard.
- Demo statis yang tidak terasa sebagai UI generator.

## Palette Wajib

Gunakan palette planetary dari `frontend/src/app/globals.css`.

- Planetary: `#334EAC`
- Universe: `#7096D1`
- Venus: `#BAD6EB`
- Meteor: `#F7F2EB`
- Galaxy: `#081F5C`
- Sky: `#D0E3FF`
- White: `#FFFFFF`

Token Tailwind yang tersedia:

- `bg-planetary`, `text-planetary`, `border-planetary`
- `bg-universe`, `text-universe`, `border-universe`
- `bg-venus`, `text-venus`, `border-venus`
- `bg-meteor`, `text-meteor`, `border-meteor`
- `bg-galaxy`, `text-galaxy`, `border-galaxy`
- `bg-sky`, `text-sky`, `border-sky`

Token semantik tetap dipakai:

- `bg-background`
- `bg-card`
- `text-foreground`
- `text-muted-foreground`
- `border-border`
- `bg-primary`
- `text-primary-foreground`
- `bg-muted`
- `bg-accent`

Aturan warna:

- Background utama halaman harus putih atau sangat terang.
- Galaxy dipakai untuk teks utama, sidebar gelap, dan kontras kuat.
- Planetary dipakai untuk CTA utama, active state penting, progress, dan chart aktif.
- Universe/Venus/Sky dipakai untuk panel pendukung, preview, chart pasif, empty state, dan highlight.
- Meteor dipakai untuk neutral warm surface, bukan sebagai warna dominan.
- Jangan pakai beige/black lama: `#15130f`, `#f7f3ec`, `#fffdf8`, `#efe5d5`, `#d7c4a3`, `#1c1914`.
- Jangan hardcode warna lama. Kalau butuh warna baru, tambahkan token dulu dan jelaskan alasannya.

## Typography

- Font wajib Geist dari root layout.
- Jangan pakai `font-serif`.
- Jangan pakai letter spacing negatif.
- Heading harus kuat tapi clean: `font-bold` atau `font-black`, `tracking-normal`.
- Gunakan uppercase letter-spaced hanya untuk eyebrow kecil, label section, dan metadata.
- Jangan scale font dengan viewport width.

Ukuran umum:

- Public hero: besar dan ekspresif, tapi tetap Geist.
- Dashboard page title: compact, 16-24px.
- Card title: 14-18px.
- Metric value: `tabular-nums`, bold, tidak terlalu dekoratif.

## Layout Global

Semua halaman harus punya satu pola visual:

- Background terang.
- Border tipis `border-border` atau `border-galaxy/10`.
- Card rounded 2xl atau rounded xl sesuai kepadatan.
- Shadow lembut berbasis Galaxy/Planetary, bukan shadow hitam berat.
- Panel dan preview memakai kombinasi White, Sky, Venus, dan Meteor.
- CTA utama rounded-full atau rounded-xl, memakai Planetary.

Jangan membuat card di dalam card secara dekoratif. Boleh ada framed preview/tool surface jika memang itu area kerja seperti Studio atau preview template.

## Shell Dan Topbar

Public pages:

- Wajib memakai `frontend/src/components/layout/site-header.tsx`.
- Jangan membuat `SiteHeader` lokal di route public.
- Route public termasuk `/`, `/templates`, `/pricing`.

App dashboard:

- Wajib memakai `AppShell`.
- Jangan membuat topbar kedua di dalam halaman app.
- Konten app harus mengikuti token global planetary.

Admin dashboard:

- Wajib memakai `AdminShell`.
- Jangan membuat header/topbar lokal di halaman admin.
- Admin tidak boleh memakai beige/black lama. Admin harus memakai planetary tokens.

Studio:

- Studio boleh punya header kerja sendiri karena ini editor surface, tapi warnanya tetap harus planetary.
- Header Studio tidak boleh terlihat seperti sistem lain.
- Panel kiri, preview tengah, dan panel kanan harus memakai token global.

## Public Page Pattern

Public page boleh lebih ekspresif, tetapi tetap satu sistem.

Struktur yang disarankan:

1. Shared `SiteHeader`.
2. Hero dengan background putih dan aksen planetary.
3. Product preview atau generator preview.
4. Section cards dengan variasi Sky, Venus, Meteor, White.
5. CTA Planetary.
6. Footer konsisten.

Public page jangan:

- Memakai topbar berbeda.
- Memakai warna di luar palette.
- Menggunakan gradient berlebihan.
- Menggunakan copy "AI" terlalu dominan.
- Membuat visual statis yang tidak menunjukkan UI generator.

## Dashboard Pattern

Dashboard user/admin harus operational, bukan landing.

Struktur:

1. Shell header/topbar.
2. Page title, subtitle, action.
3. KPI cards.
4. Main work area: table, chart, queue, list, editor, atau form.
5. Supporting panels.
6. Empty/loading/error state.

Dashboard boleh colorful, tapi:

- Warna harus membantu status dan struktur.
- Jangan membuat hero besar di app/admin.
- Jangan membuat halaman operational terasa seperti marketing.

## Studio Pattern

Studio adalah layar kerja utama, jadi harus terasa seperti tool:

- Header compact.
- Panel kiri untuk brief/prompt/settings.
- Preview tengah sebagai kanvas utama.
- Panel kanan untuk code/schema/version/log.
- Tabs harus jelas.
- Empty state harus jelas dan tidak terlalu kosong.
- Error state memakai destructive/rose, bukan alert besar yang merusak layout.
- Device controls harus stabil ukurannya.

Warna Studio:

- Main background: `bg-background` atau `bg-sky/30`.
- Panels: `bg-card`.
- Active tab/control: `bg-primary text-primary-foreground`.
- Passive panel: `bg-muted` atau `bg-sky/40`.
- Code preview boleh gelap Galaxy.

## Komponen

Gunakan komponen lokal sebelum membuat yang baru:

- `Button`
- `Card`
- `Badge`
- `Table`
- `Tabs`
- `Dialog`
- `DropdownMenu`
- `Select`
- `Input`
- `Textarea`
- `Switch`
- `Checkbox`
- `Progress`
- `Tooltip`
- `SectionCard`

Aturan:

- Button utama: `variant="default"` atau class `bg-primary`.
- Button sekunder: `outline`, `secondary`, atau class dengan `bg-sky`.
- Icon button wajib punya `aria-label`.
- Gunakan lucide icons seperlunya, bukan untuk dekorasi berlebihan.
- Status harus memakai badge/pill dengan label, bukan warna saja.
- Tabel harus punya header, hover, empty state, dan alignment angka.

## Copywriting

Gunakan bahasa produk yang konkret.

Pakai:

- Generate project UI
- Build dashboard drafts
- Preview layout
- Export interface
- Review versions
- Templates
- Projects
- Studio

Hindari:

- AI magic
- Supercharge
- Revolutionary
- Powered by AI berulang-ulang
- Prompt theater
- Klaim hype tanpa fitur nyata

## Responsive

Semua halaman wajib aman di mobile dan desktop:

- Tidak ada teks keluar container.
- Toolbar boleh wrap.
- Grid turun menjadi satu kolom.
- Sidebar/header tidak menutupi konten.
- Table panjang punya overflow atau layout alternatif.
- Preview Studio tetap bisa dipakai di layar kecil.

## Aksesibilitas

- Button icon wajib `aria-label`.
- Input wajib label.
- Focus ring tetap terlihat.
- Jangan hanya mengandalkan warna untuk status.
- Pastikan kontras Galaxy/Planetary/Sky aman.
- Jangan membuat text kecil di atas warna low contrast.

## Larangan Tegas

Jangan lakukan:

- Membuat public topbar baru selain `SiteHeader`.
- Membuat app/admin topbar kedua di dalam halaman.
- Memakai warna lama beige/black.
- Memakai `font-serif`.
- Memakai negative tracking.
- Menambah palette baru tanpa token.
- Membuat halaman public, templates, pricing, studio, admin, dan app beda bahasa visual.
- Membuat desain terlalu "AI" dengan sparkle/glow berlebihan.
- Menggunakan hardcoded `#15130f`, `#f7f3ec`, `#fffdf8`, `#efe5d5`, `#d7c4a3`.

## Audit Sebelum Selesai

Sebelum mengakhiri pekerjaan desain, cek:

- Tidak ada `function SiteHeader` lokal di route public.
- Tidak ada topbar ganda dalam satu shell.
- Tidak ada warna lama dengan `rg "#15130f|#f7f3ec|#fffdf8|#efe5d5|#d7c4a3|#1c1914" frontend/src`.
- Tidak ada `font-serif` dan `tracking-[`.
- `npm run lint` berhasil.
- `npm run build` berhasil jika mengubah layout, route, atau shared component.

## File Penting

- Global tokens: `frontend/src/app/globals.css`
- Public topbar: `frontend/src/components/layout/site-header.tsx`
- App shell: `frontend/src/components/app/app-shell.tsx`
- App topbar: `frontend/src/components/app/topbar.tsx`
- Admin shell: `frontend/src/components/layout/admin-shell.tsx`
- Sidebar: `frontend/src/components/layout/dashboard-sidebar.tsx`
- Studio: `frontend/src/components/studio/studio-page.tsx`
- Public landing: `frontend/src/app/page.tsx`
- Public templates: `frontend/src/app/templates/page.tsx`
- Public pricing: `frontend/src/app/pricing/page.tsx`

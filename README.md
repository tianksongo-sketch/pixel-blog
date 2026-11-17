# Pixel Blog

Blog pribadi bergaya Google Pixel / Material 3 Expressive. Next.js 15 + React 19 + TypeScript,
CSS biasa (tanpa Tailwind), database & foto di Upstash Redis. Tema warna acak Material You,
like 1 orang = 1 like (server), komentar, share, dan admin tersembunyi.

Tanpa Redis pun web tetap jalan dalam **mode demo** (data contoh di memori, tidak permanen).

## Deploy (cuma git push, tanpa CLI lain)

1. Upload seluruh folder ini ke repository GitHub.
2. Buka [vercel.com](https://vercel.com) → **Add New → Project** → **Import** repo tersebut → Deploy.
3. Di proyek Vercel: tab **Storage** → **Create Database** → **Upstash for Redis** → pilih paket **Free**.
4. **Connect Project** ke proyek blog ini (env `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` terisi otomatis).
5. Tab **Deployments** → titik tiga pada deployment terbaru → **Redeploy**. Selesai.

## Buka halaman admin (rahasia, tidak ada tautan publik)

- **HP:** ketuk teks **©** di footer **5× cepat** (dalam ±2,5 detik).
- **Komputer:** tekan **Ctrl+Shift+A** (Windows/Linux) atau **Cmd+Shift+A** (Mac).
- Pertama kali: buat password admin (min. 8 karakter). Opsional: set env `ADMIN_PASSWORD`
  di Vercel untuk menimpa password dari UI.

## Lupa password admin

1. Buka dashboard Upstash → **Data Browser**.
2. Cari dan **hapus key `admin:hash`** (boleh juga hapus `admin:secret` untuk memutus semua sesi).
3. Buka lagi `/admin` → layar "Buat password admin" muncul → buat password baru.

## Pengembangan lokal (opsional)

```bash
npm install
npm run dev

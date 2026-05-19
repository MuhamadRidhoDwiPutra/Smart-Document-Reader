# Smart Document Reader

Aplikasi ekstraksi resi/invoice dengan **Next.js 15**, **Cloudflare Workers** (OpenNext), **D1**, **R2**, dan **Gemini Vision**.

## Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js App Router, React 19, Tailwind |
| Runtime | Cloudflare Workers via `@opennextjs/cloudflare` |
| Database | Cloudflare D1 (users, sessions, documents, line_items) |
| Storage | Cloudflare R2 (file upload) |
| AI | Google Gemini (`gemini-2.0-flash`) Vision |

## Setup lokal

```bash
npm install
cp .dev.vars.example .dev.vars
# Isi GEMINI_API_KEY, SESSION_SECRET, SEED_SECRET
```

### Cloudflare resources

```bash
npx wrangler d1 create smart-doc-db
# Salin database_id ke wrangler.jsonc

npx wrangler r2 bucket create smart-doc-uploads

npm run db:migrate:local
```

### Seed akun demo

```bash
npm run dev
# Di terminal lain (setelah app jalan dengan binding lokal):
curl -X POST http://localhost:3000/api/seed-demo -H "x-seed-secret: local-dev-seed-only"
```

**Demo login:** `demo@smartdoc.local` / `demo12345`

### Preview Workers runtime

```bash
npm run preview
```

### Deploy

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SEED_SECRET
npm run db:migrate:remote
npm run deploy
```

## Fitur

- Register / login (PBKDF2-SHA256, session di D1)
- Halaman protected (middleware)
- Upload → R2 + D1 (`uploaded` → `processing` → ekstraksi)
- Gemini Vision: vendor, tanggal, total, currency, line items + `field_confidence`
- UI review dengan highlight field confidence &lt; 0.7
- Simpan koreksi → status `saved`
- Gagal / bukan resi → `failed` + pesan
- Daftar dokumen + filter vendor/tanggal + export CSV

## AI workflow & contoh prompt

Prompt sistem ada di `src/lib/gemini.ts`. Model menerima gambar/PDF sebagai inline base64 dan mengembalikan JSON terstruktur.

**Contoh hasil yang diharapkan:**

```json
{
  "is_receipt": true,
  "vendor": "Indomaret",
  "document_date": "2025-05-10",
  "total": 125000,
  "currency": "IDR",
  "line_items": [{ "description": "Kopi", "quantity": 2, "unit_price": 15000, "amount": 30000 }],
  "field_confidence": { "vendor": 0.95, "document_date": 0.8, "total": 0.9, "currency": 0.99, "line_items": 0.75 },
  "failure_reason": null
}
```

**Handling akurasi rendah:** threshold default `0.7` (`LOW_CONFIDENCE_THRESHOLD` di wrangler). Status `needs_review`; field ditandai di form review.

## Tools AI yang dipakai (wajib brief)

| Bagian | Tool |
|--------|------|
| Scaffold project, API, UI, migrasi | **Cursor Agent** |
| Ekstraksi OCR/vision runtime | **Google Gemini API** |
| (Opsional) iterasi prompt | Edit manual + uji di Google AI Studio |

## Asumsi & keterbatasan (jujur)

- PDF multi-halaman: hanya halaman pertama yang dikirim ke Gemini (belum split).
- File &gt; ~4 MB base64 bisa lambat/gagal di Workers — batas upload 10 MB.
- Semua query dokumen memfilter `user_id` (tidak pakai localStorage untuk data dokumen).
- `SESSION_SECRET` disiapkan untuk rotasi/validasi lanjutan; saat ini session ID acak di D1.

## Improvement jika waktu 2×

- Background queue (Queues) untuk ekstraksi async
- Multi-page PDF
- Retry Gemini + fallback model
- Unit test untuk `password.ts` dan parser JSON
- Dashboard analytics per vendor

## Akun demo (production)

Setelah deploy, jalankan seed sekali:

```bash
curl -X POST https://YOUR_URL/api/seed-demo -H "x-seed-secret: YOUR_SEED_SECRET"
```

## Struktur folder

```
src/
  app/          # pages + API routes
  components/   # UI
  lib/          # auth, gemini, documents, db helpers
migrations/     # D1 SQL
```

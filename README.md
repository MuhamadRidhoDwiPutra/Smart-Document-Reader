# Smart Document Reader

Aplikasi ekstraksi resi/invoice dengan **Next.js 15**, **Cloudflare Workers** (OpenNext), **D1**, **R2**, dan **Cloudflare Workers AI** (vision).

## Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js App Router, React 19, Tailwind |
| Runtime | Cloudflare Workers via `@opennextjs/cloudflare` |
| Database | Cloudflare D1 (users, sessions, documents, line_items) |
| Storage | Cloudflare R2 (file upload) |
| OCR/AI | **Workers AI** — `@cf/meta/llama-3.2-11b-vision-instruct` |

### Alasan pilihan Workers AI (akurasi, biaya, kecepatan)

| Kriteria | Workers AI |
|----------|------------|
| **Akurasi** | Model vision Llama 3.2 cukup untuk struk/invoice Indonesia; output JSON terstruktur via prompt |
| **Biaya** | **Gratis** ~10.000 Neurons/hari (Workers Free); cukup untuk development & demo tes |
| **Kecepatan** | Satu request di edge Cloudflare; tidak perlu API key pihak ketiga |
| **Stack kantor** | Selaras brief: Workers + D1 + R2 tanpa billing Google |

---

## AI Workflow Log

### Tools & Agents Used

| Tools | Purpose |
|-------|---------|
| **Cursor Agent (Claude Code)** | Scaffold project, write API routes, build UI components, debug extraction issues |
| **Cloudflare Workers AI** | Vision model for OCR extraction from receipt images |
| **Next.js App Router** | Frontend framework with API routes |

### Workflow Steps

1. **Project Setup** → Cursor Agent scaffolded Next.js + Cloudflare Workers project
2. **Database Schema** → Created D1 tables (users, sessions, documents, line_items)
3. **API Routes** → Built REST endpoints for CRUD operations
4. **OCR Extraction** → Integrated Workers AI vision model with custom prompt
5. **UI Development** → Built upload, review, and dashboard pages
6. **Iterasi Prompt** → Fine-tuned extraction prompt for Indonesian receipts

### Example Prompt (Most Critical)

```typescript
const USER_PROMPT = `You are an AI that extracts structured data from receipt/invoice images.

Return ONLY a valid JSON object with these exact fields:
- is_receipt: boolean (true if this is a receipt/invoice)
- vendor: string or null (store/merchant name)
- document_date: string or null (date in YYYY-MM-DD format)
- total: number or null (total amount, as a number not string)
- currency: string or null (currency code like IDR, USD)
- line_items: array of items, each with description, quantity, unit_price, amount
- field_confidence: object with confidence scores 0-1 for each field
- failure_reason: string or null (reason if not a receipt)

Example:
{"is_receipt":true,"vendor":"Alfamart","document_date":"2024-05-20","total":25000,"currency":"IDR","line_items":[...],"field_confidence":{...},"failure_reason":null}`;
```

### Why This Prompt Works

- **Structured output** ensures consistent JSON parsing
- **Indonesian-friendly** - model understands local merchant names
- **Confidence scores** allow human review of low-certainty fields
- **Failure reason** provides actionable error messages

---

## Cara Menangani Akurasi Rendah

### Confidence Threshold

Field dengan confidence < 0.7 ditandai dengan border kuning dan label "confidence rendah".

### Strategies:

1. **Manual Review** → User dapat edit field yang confidence-nya rendah sebelum menyimpan
2. **Re-extraction** → Klik "Ekstrak Ulang" untuk mencoba ulang dengan prompt yang sama
3. **Manual Input** → User dapat input manual untuk field yang gagal diekstrak
4. **Better Image** → Gunakan foto dengan kualitas lebih baik

### Error Handling

| Error | Solusi |
|-------|--------|
| OCR gagal baca | Upload ulang dengan foto lebih jelas |
| Vendor tidak terdeteksi | Input manual |
| Tanggal salah format | Edit manual ke YYYY-MM-DD |
| Total tidak sesuai | Koreksi manual |

---

## Asumsi yang Diambil

1. **Format file**: Hanya JPG/PNG/WebP (PDF tidak didukung Workers AI vision)
2. **Bahasa**: Indonesia (resi lokal)
3. **Single upload**: Satu file per upload (bukan multi-upload)
4. **Halaman pertama saja**: Hanya halaman pertama yang diproses
5. **Tanpa autentikasi pihak ketiga**: Cukup email/password

---

## Keterbatasan

- **PDF** tidak didukung Workers AI vision — gunakan foto JPG/PNG
- Kuota gratis ~10k Neurons/hari; hindari spam ekstraksi ulang
- File upload maks. 10 MB
- Single file upload (multi-upload belum diimplementasi)

---

## Yang Akan Diperbaiki Jika Waktu 2x Lipat

1. **Multi-upload** - Batch upload untuk beberapa resi sekaligus
2. **PDF Support** - Konversi PDF ke gambar sebelum OCR
3. **Multi-page Processing** - Proses semua halaman invoice
4. **Image Enhancement** - Otomatis tingkatkan kecerahan/kontras gambar
5. **Better Receipt Parsing** - Algoritma khusus untuk tabel receipt
6. **Export Formats** - Tambahan export ke Excel, JSON, PDF
7. **Dashboard Analytics** - Statistik spending per vendor/bulan
8. **Mobile App** - Progressive Web App untuk akses mobile

---

## Troubleshooting: `npm run dev` gagal

### Error: "register a workers.dev subdomain" (kode 10063)

**Wajib sekali (gratis):**

1. Buka https://dash.cloudflare.com
2. Klik **Workers & Pages** di menu kiri (tunggu halaman load)
3. Jalankan lagi:
   ```bash
   npm run workers-ai:agree
   npm run dev
   ```

### Error R2: "Please enable R2" (kode 10042)

Hanya untuk **deploy/production**. Untuk **lokal**, R2 disimulasikan Miniflare.

### Database sudah ada

Pesan `database with that name already exists` = **normal**. Pakai `database_id` yang sudah di `wrangler.jsonc`.

---

## Setup Lokal

```bash
# Install dependencies
npm install

# Copy environment file
copy .dev.vars.example .dev.vars   # Windows
# atau: cp .dev.vars.example .dev.vars

# Run database migration
npm run db:migrate:local

# Accept Meta license (for Workers AI)
npm run workers-ai:agree

# Start development server
npm run dev
```

Buka http://localhost:3000 → register/login → upload **foto** struk (JPG/PNG/WebP).

---

## Deploy

```bash
# Set secrets
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SEED_SECRET

# Migrate production database
npm run db:migrate:remote

# Deploy to Cloudflare
npm run deploy
```

---

## Struktur Folder

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # Login, register, logout
│   │   └── documents/     # CRUD documents, upload, export
│   ├── documents/         # Document list, upload, review pages
│   ├── login/            # Login page
│   └── register/         # Register page
├── components/          # UI components
├── lib/
│   ├── auth.ts           # Authentication logic
│   ├── documents.ts      # D1 + R2 operations
│   ├── extract.ts        # Workers AI vision + JSON parse
│   └── types.ts         # TypeScript interfaces
└── middleware.ts         # Auth protection
```
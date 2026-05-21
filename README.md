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

**Tidak perlu** Google AI Studio / `GEMINI_API_KEY`.

---

## Troubleshooting: `npm run dev` gagal

### Error: "register a workers.dev subdomain" (kode 10063)

**Wajib sekali (gratis):**

1. Buka https://dash.cloudflare.com  
2. Klik **Workers & Pages** di menu kiri (tunggu halaman load — subdomain `*.workers.dev` dibuat otomatis)  
3. Jalankan lagi:
   ```bash
   npm run workers-ai:agree
   npm run dev
   ```

### Error R2: "Please enable R2" (kode 10042)

Hanya untuk **deploy/production**. Untuk **lokal**, R2 disimulasikan Miniflare — **tidak perlu** `wrangler r2 bucket create` jika hanya `npm run dev`.

Aktifkan R2 di dashboard hanya jika akan `npm run deploy`.

### Database sudah ada

Pesan `database with that name already exists` = **normal**. Pakai `database_id` yang sudah di `wrangler.jsonc`.

---

## Yang perlu disiapkan (checklist)

### 1. Akun & tools di komputer

- [ ] Akun [Cloudflare](https://dash.cloudflare.com/sign-up) (gratis)
- [ ] Node.js 18+ dan npm
- [ ] Git
- [ ] Login Wrangler: `npx wrangler login`

### 2. Resource Cloudflare (sekali)

```bash
npm install

# Database D1
npx wrangler d1 create smart-doc-db
# Salin database_id ke wrangler.jsonc (ganti REPLACE_WITH_YOUR_D1_DATABASE_ID)

# Bucket file (aktifkan R2 di dashboard jika diminta)
npx wrangler r2 bucket create smart-doc-uploads

# Migrasi tabel
npm run db:migrate:local
```

### 3. Environment lokal

```bash
copy .dev.vars.example .dev.vars   # Windows
# atau: cp .dev.vars.example .dev.vars
```

Isi `.dev.vars`:

```env
SESSION_SECRET=string-acak-minimal-32-karakter
SEED_SECRET=local-dev-seed-only
```

**Tidak ada** `GEMINI_API_KEY`.

### 4. Lisensi Meta (sekali per akun Cloudflare)

Model vision wajib disetujui sekali:

```bash
npm run workers-ai:agree
```

Atau saat ekstraksi pertama, aplikasi mencoba `prompt: "agree"` otomatis.

### 5. Jalankan aplikasi

```bash
npm run dev
```

Buka http://localhost:3000 → register/login → upload **foto** struk (JPG/PNG/WebP).

### 6. Deploy (submit tes)

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SEED_SECRET
npm run db:migrate:remote
npm run deploy
```

Jalankan `npm run workers-ai:agree` terhadap akun production jika belum.

---

## Setup lokal (ringkas)

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run workers-ai:agree
npm run dev
```

### Seed akun demo

```bash
curl -X POST http://localhost:3000/api/seed-demo -H "x-seed-secret: local-dev-seed-only"
```

**Demo login:** `demo@smartdoc.local` / `demo12345`

---

## Fitur

- Register / login (PBKDF2-SHA256, session di D1)
- Upload foto struk → R2 + ekstraksi Workers AI
- Review & koreksi + confidence field
- Daftar, filter, export CSV, hapus dokumen

## AI workflow & contoh prompt

Prompt di `src/lib/extract.ts`. Model menerima gambar sebagai data URI base64.

**Contoh prompt penentuan:**

```
Analyze this receipt/invoice image. Return ONLY valid JSON:
{"is_receipt":boolean,"vendor":...,"field_confidence":{...}}
```

## Tools AI (brief)

| Bagian | Tool |
|--------|------|
| Scaffold, API, UI | **Cursor Agent** |
| Ekstraksi vision | **Cloudflare Workers AI** |
| Iterasi prompt | Edit `src/lib/extract.ts` |

## Keterbatasan

- **PDF** tidak didukung Workers AI vision — gunakan foto JPG/PNG
- Kuota gratis ~10k Neurons/hari; hindari spam ekstraksi ulang
- File upload maks. 10 MB

## Struktur folder

```
src/lib/extract.ts   # Workers AI vision + JSON parse
src/lib/documents.ts # D1 + R2
wrangler.jsonc       # binding DB, UPLOADS, AI
```

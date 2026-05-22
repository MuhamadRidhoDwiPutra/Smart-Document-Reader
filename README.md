# Smart Document Reader

Aplikasi web untuk mengekstrak data terstruktur dari resi/invoice menggunakan OCR + AI (Cloudflare Workers AI Vision).

**Demo URL:** https://smart-document-reader.pages.dev

**Akun Demo:**
- Email: `demo@example.com`
- Password: `password123`

---

## Daftar Isi

- [Fitur yang Diimplementasi](#fitur-yang-diimplementasi)
- [Stack & Alasan](#stack--alasan)
- [AI Workflow Log](#ai-workflow-log)
- [Asumsi yang Diambil](#asumsi-yang-diambil)
- [Kekurangan / Tidak Sesuai dengan Brief](#kekurangan--tidak-sesuai-dengan-brief)
- [Penanganan Akurasi Rendah](#penanganan-akurasi-rendah)
- [Jika Waktu 2x Lipat](#jika-waktu-2x-lipat)

---

## Fitur yang Diimplementasi

### ✅ Sudah Berfungsi

| Fitur | Status | Keterangan |
|-------|--------|------------|
| Upload dokumen (JPG/PNG) | ✅ | Single file upload |
| OCR dengan Workers AI Vision | ✅ | Menggunakan `@cf/meta/llama-3.2-11b-vision-instruct` |
| Ekstraksi: vendor, tanggal, total, mata uang | ✅ | Berjalan dengan confidence score |
| Ekstraksi line items | ✅ | Deskripsi, quantity, unit price, amount |
| Review & koreksi manual | ✅ | Form editable sebelum save |
| Confidence score per field | ✅ | Threshold 0.7 untuk tandai low confidence |
| Penyimpanan di Cloudflare D1 | ✅ | Data persist, bukan in-memory |
| Daftar dokumen dengan filter | ✅ | Filter by vendor, date range |
| Hapus dokumen | ✅ | Termasuk hapus file di R2 |
| Export CSV | ✅ | Download semua data |
| Autentikasi (login/register) | ✅ | Session-based authentication |
| User isolation | ✅ | Setiap user hanya bisa akses dokumen sendiri |

### ⚠️ Terbatas / Belum Sempurna

| Fitur | Status | Keterangan |
|-------|--------|------------|
| PDF upload | ⚠️ | Tidak didukung - AI tidak bisa proses PDF |
| Multi-upload | ⚠️ | Hanya satu file per upload |
| Re-ekstraksi | ⚠️ | Button ada tapi belum berfungsi sempurna |
| UI/UX | ⚠️ | Fungsional tapi sederhana |

---

## Stack & Alasan

### Frontend
- **Next.js 15** (App Router, SSR fullstack)
- **TypeScript**
- **Tailwind CSS**
- **React 19**

Alasan: Next.js + Cloudflare Pages integration sudah tersedia via `@opennextjs/cloudflare`. Tidak perlu setup backend terpisah.

### Backend & Runtime
- **Cloudflare Pages** + **Cloudflare Workers** (via OpenNext.js)
- **Cloudflare D1** - SQLite serverless untuk persistent storage
- **Cloudflare R2** - Object storage untuk file upload
- **Workers AI Vision** - `@cf/meta/llama-3.2-11b-vision-instruct`

Alasan Stack Wajib: Sesuai brief, menggunakan stack Cloudflare yang ditentukan.

### AI/OCR
- **Workers AI Vision** (`@cf/meta/llama-3.2-11b-vision-instruct`)

**Alasan memilih Workers AI (dibanding OpenRouter/third-party):**
| Aspek | Workers AI | OpenRouter / Third-party |
|-------|------------|-------------------------|
| Biaya | Free tier ~10k Neurons/hari | Perlu credit berbayar |
| Setup | Langsung tersedia di Cloudflare | Perlu API key tambahan |
| Kecepatan | Edge, close to users | Internet latency |
| Akurasi | Cukup untuk receipt standard | Bisa lebih baik dengan model lain |

**Keterbatasan:**
- Model vision bukan dedicated OCR, kadang salah baca angka
- Daily quota terbatas di free tier
- Tidak support PDF

---

## AI Workflow Log

### Tools AI yang Dipakai

| Tool | Peran | Untuk Bagian Apa |
|------|-------|------------------|
| **Cursor AI (Claude Code)** | Coding assistant | Scaffold project, write API routes, build UI |
| **Claude AI** | Problem solving | Refine extraction prompts, debug issues |
| **ChatGPT** | Research | OCR best practices, stack decisions |

### Contoh Prompt (Most Critical)

Prompt utama untuk ekstraksi data:

```
You are an AI that extracts structured data from receipt/invoice images.

Return ONLY a valid JSON object with these exact fields:
- is_receipt: boolean
- vendor: string or null
- document_date: string or null (YYYY-MM-DD)
- total: number or null
- currency: string or null
- line_items: array with description, quantity, unit_price, amount
- field_confidence: object with confidence scores 0-1
- failure_reason: string or null

Example:
{"is_receipt":true,"vendor":"Alfamart","document_date":"2024-05-20","total":25000,"currency":"IDR","line_items":[],"field_confidence":{...},"failure_reason":null}
```

**Kenapa prompt ini penting:**
1. Structured output → JSON parsing konsisten
2. Confidence score → User tahu field mana yang perlu dicek
3. Indonesian-friendly → Model memahami nama merchant lokal
4. Failure reason → User dapat info jika gagal

---

## Asumsi yang Diambil

1. **Single upload** - Karena keterbatasan waktu dan kompleksitas async processing, fitur multi-upload belum diimplementasi. Brief meminta "minimal multi-upload" tapi tidak mandatory.

2. **PDF tidak didukung** - Workers AI Vision tidak bisa proses PDF langsung. Tidak ada waktu untuk implementasi PDF-to-image converter yang robust.

3. **User isolation** - Setiap dokumen diikat ke user_id di database, tidak ada shared document antar user.

4. **Confidence threshold 0.7** - Nilai ini hardcoded untuk tandai field yang AI tidak yakin. Bisa diekspos ke environment variable tapi belum dilakukan.

5. **No password reset** - Fitur authentication dasar saja, tanpa password reset functionality.

6. **Simple UI** - Tidak ada dark mode, keyboard shortcuts, atau advanced UI features karena waktu terbatas.

---

## Kekurangan / Tidak Sesuai dengan Brief

### 1. Multi-upload - BELUM TERSEDIA
**Brief:** "boleh multi-upload"
**Realita:** Hanya single file upload per kali

### 2. PDF Support - TIDAK ADA
**Brief:** "minimal JPG/PNG/PDF; boleh multi-upload"
**Realita:** PDF tidak didukung sama sekali. AI langsung menolak dengan error message.

**Penanganan saat ini:**
- User dapat pesan error bahwa PDF belum didukung
- Diberitahu untuk upload JPG/PNG saja

**Seharusnya:**
- Implementasi PDF.js untuk convert PDF ke image
- Proses setiap page seperti image

### 3. Re-ekstraksi - TIDAK SEMPURNA
**Brief:** Tidak ada requirement eksplisit, tapi ada fitur "Re-extraction"
**Realita:** Button re-extract ada di UI tapi fungsi tidak berjalan sempurna.

### 4. UI/UX Sederhana
**Brief:** "Product Design (UX/UI) 20%" dengan fokus "Estetik & usable"
**Realita:** UI berfungsi tapi sangat dasar. Tidak ada:
- Loading animations yang baik
- Error states yang informatif
- Empty states yang membantu
- Responsive mobile-first design

### 5. Demo Account - HARDCODED
**Brief:** Tidak ada requirement untuk demo account
**Realita:** Seed demo account via endpoint `/api/seed-demo` dengan:
- Email: `demo@example.com`
- Password: `password123`

Ini tidak ideal untuk production tapi berguna untuk demo.

### 6. File Size Limit - TIDAK ADA VALIDASI
**Brief:** Tidak ada mention, tapi perlu ada limit
**Realita:** Tidak ada validasi file size di backend.

### 7. Date Parsing - SERING SALAH
**Brief:** Ekstraksi tanggal adalah requirement
**Realita:** AI sering salah parsing format tanggal Indonesia (DD/MM/YYYY vs MM/DD/YYYY).

---

## Penanganan Akurasi Rendah

### Confidence Scoring
Setiap field memiliki confidence score (0-1):
- **≥ 0.7** - Warna normal, dianggap benar
- **< 0.7** - Border kuning/warning, user harus cek manual

### Implementasi Saat Ini
1. Field dengan confidence rendah ditandai warning indicator
2. User bisa edit manual sebelum save
3. Status dokumen berubah jadi "needs_review" jika ada field uncertain

### Yang Bisa Diperbaiki
1. **Preprocessing image** - Brightness/contrast adjustment sebelum OCR
2. **Post-processing validation** - Cross-check total vs line_items sum
3. **Better prompts** - More detailed extraction instructions
4. **Retry mechanism** - Auto-retry dengan prompt berbeda jika confidence rendah

---

## Jika Waktu 2x Lipat

### Prioritas Tinggi

1. **Multi-upload dengan queue processing**
   - Upload banyak file sekaligus
   - Process async dengan progress indicator
   - Background job untuk OCR (saat ini sync, blocking)

2. **PDF Support via PDF.js**
   - Convert setiap page ke image
   - Extract per-page, bukan hanya page pertama
   - Page selection UI

3. **Image Preprocessing**
   - Auto rotate jika miring
   - Brightness/contrast adjustment
   - Noise reduction untuk foto berkualitas rendah

### Prioritas Sedang

4. **Improved UI/UX**
   - Better loading states
   - Toast notifications
   - Empty states yang informatif
   - Mobile responsive yang lebih baik

5. **Re-extraction yang berfungsi**
   - Full workflow: delete old extraction → re-run OCR → update form
   - Option untuk change model/prompt

6. **Data Validation**
   - Cross-check: total harus sama dengan sum(line_items)
   - Duplicate detection berdasarkan vendor + date + total
   - Date format normalization

### Prioritas Rendah

7. **Dark Mode**
8. **Export format lain** (Excel, JSON, PDF)
9. **Keyboard shortcuts**
10. **Receipt categorization** (food, transport, etc.)

---

## Cara Menjalankan Lokal

```bash
# Install dependencies
npm install

# Copy environment file
cp .dev.vars.example .dev.vars

# Run database migration
npm run db:migrate:local

# Accept Meta license (diperlukan untuk Workers AI)
npm run workers-ai:agree

# Start development server
npm run dev
```

Buka `http://localhost:3000`, daftar akun baru, atau login dengan demo account.

---

## Deployment

```bash
# Set secrets
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SEED_SECRET

# Migrate database
npm run db:migrate:remote

# Deploy
npm run deploy
```

---

## Catatan

Project ini dibuat untuk technical test PT Superbrands International. Stack dan approach mengikuti brief yang diberikan. Beberapa feature sesuai brief, beberapa tidak (lihat section Kekurangan).
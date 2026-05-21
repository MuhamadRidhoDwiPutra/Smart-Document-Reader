# Smart Document Reader

> 📄 Intelligent receipt and invoice extraction powered by Cloudflare Workers AI Vision

A web application that automatically extracts structured data from receipts and invoices using OCR technology. Upload a photo of your receipt, and the AI will extract vendor names, dates, line items, and total amounts — auto-filling a form for easy review and storage.

[![TypeScript](https://img.shields.io/badge/TypeScript-97.6%25-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-red.svg)](https://workers.cloudflare.com/)

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [🤖 AI Workflow Log](#-ai-workflow-log)
- [🔄 OCR Workflow](#-ocr-workflow)
- [📄 PDF Support Explanation](#-pdf-support-explanation)
- [🚀 Installation](#-installation)
- [🔐 Environment Variables](#-environment-variables)
- [⚠️ Known Limitations](#️-known-limitations)
- [💡 How to Improve OCR Accuracy](#-how-to-improve-ocr-accuracy)
- [🚀 Future Improvements](#-future-improvements)
- [⏱ If Given More Development Time](#-if-given-more-development-time)
- [📸 Screenshots](#-screenshots)
- [🌎 Deployment](#-deployment)
- [📄 License](#-license)

---

## 📖 Project Overview

Smart Document Reader is a web application that automates the extraction of structured data from receipts and invoices. Instead of manually typing information from paper receipts, users simply upload a photo and let AI do the work.

### How It Works

| Step | Action | Description |
|------|--------|-------------|
| 1 | **Upload** | Upload a JPG, PNG, or PDF file of your receipt or invoice |
| 2 | **OCR Extraction** | Workers AI Vision analyzes the image and extracts text |
| 3 | **Auto-fill Form** | Extracted data automatically populates the review form |
| 4 | **Manual Correction** | Review and edit any fields that need adjustment |
| 5 | **Save to Database** | Confirmed data is stored in Cloudflare D1 |
| 6 | **Export CSV** | Download your receipts as a CSV spreadsheet |

### Supported File Formats

| Format | Status | Notes |
|--------|--------|-------|
| **JPG/JPEG** | ✅ Full Support | Best format for OCR |
| **PNG** | ✅ Full Support | Lossless quality |
| **PDF** | ✅ Supported | Converted to image first (see [PDF Support](#-pdf-support-explanation)) |

---

## ✨ Features

### Core Features

| Feature | Description |
|---------|-------------|
| 🔍 **OCR Extraction** | AI-powered text extraction from receipt images using Cloudflare Workers AI Vision |
| 📝 **Auto Form Population** | Automatically fills form fields with extracted data |
| ✏️ **Manual Correction** | Edit any extracted field before saving |
| 🛒 **Receipt Item Extraction** | Extracts individual line items with description, quantity, unit price, and amount |
| 📄 **PDF Support** | Converts PDF pages to images before OCR processing |
| 💾 **Cloudflare D1 Storage** | Persistent storage for all extracted documents |
| 📊 **CSV Export** | Export all receipts as a downloadable CSV file |
| 📱 **Responsive UI** | Works on desktop, tablet, and mobile devices |

### Additional Features

| Feature | Description |
|---------|-------------|
| 🔐 **User Authentication** | Secure login and registration system |
| 📅 **Document Dating** | Automatic date extraction from receipts |
| 🏪 **Vendor Recognition** | Identifies store/merchant names |
| 💰 **Currency Detection** | Automatically detects currency (IDR, USD, etc.) |
| 📈 **Confidence Scores** | Each extracted field includes a confidence score (0-1) |
| 🔄 **Re-extraction** | Re-run OCR on the same image with one click |

---

## 🛠 Tech Stack

### Frontend

| Technology | Description |
|------------|-------------|
| **Next.js 15** | React framework with App Router for server-side rendering and API routes |
| **TypeScript** | Type-safe JavaScript for better code quality and developer experience |
| **Tailwind CSS** | Utility-first CSS framework for responsive, modern styling |
| **React 19** | Latest React version with improved concurrent features |

**Why:** Next.js provides excellent developer experience, server-side rendering, and integrates seamlessly with Cloudflare Workers. TypeScript catches errors early, and Tailwind enables rapid UI development.

### Backend & Runtime

| Technology | Description |
|------------|-------------|
| **Cloudflare Workers** | Edge computing runtime via `@opennextjs/cloudflare` |
| **Cloudflare D1** | SQLite-based serverless database for persistent storage |
| **Cloudflare R2** | Object storage for uploaded receipt images |

**Why:** Cloudflare Workers runs at the edge (close to users worldwide), providing low latency. D1 provides zero-configuration database without managing servers. R2 offers affordable, scalable file storage.

### AI & OCR

| Technology | Description |
|------------|-------------|
| **Workers AI Vision** | `@cf/meta/llama-3.2-11b-vision-instruct` model for OCR |
| **PDF.js** | Library for converting PDF documents to images |

**Why:** Workers AI provides free daily quotas for development and runs at the edge without requiring third-party API keys. The vision model understands layout and text, making it suitable for receipt extraction.

### Data Validation

| Technology | Description |
|------------|-------------|
| **Zod** | TypeScript-first schema validation |

**Why:** Zod ensures data integrity by validating inputs at runtime with TypeScript type inference.

---

## 🤖 AI Workflow Log

This section documents how AI tools were used throughout the development process.

### AI Tools & Their Roles

| Tool | Role | Key Contributions |
|------|------|-------------------|
| **Cursor AI (Claude Code)** | Code generation & debugging | Scaffolded project, wrote API routes, built UI components, debugged extraction issues |
| **Claude AI** | Problem solving & architecture | Designed data models, refined extraction prompts, debugged complex issues |
| **ChatGPT** | Conceptual planning | Researched OCR best practices, suggested workflow improvements |

### Development Workflow

```
1. Project Setup
   └── Cursor AI scaffolded Next.js + Cloudflare Workers project

2. Database Schema Design
   └── Defined D1 tables: users, sessions, documents, line_items

3. API Routes Development
   └── Built REST endpoints for CRUD operations

4. OCR Integration
   └── Integrated Workers AI Vision with custom extraction prompts

5. UI Development
   └── Built upload, review, and dashboard pages

6. Iterative Refinement
   └── Fine-tuned extraction prompts for Indonesian receipts
```

### Example Prompts Used

#### Primary Extraction Prompt (Most Critical)

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

#### Why This Prompt Works

| Technique | Benefit |
|-----------|---------|
| **Structured output** | Ensures consistent JSON parsing |
| **Indonesian-friendly** | Model understands local merchant names |
| **Confidence scores** | Allows human review of low-certainty fields |
| **Failure reason** | Provides actionable error messages |

### Debugging Workflow Example

```
Issue: OCR extracting wrong total amount

1. Claude AI suggested adding confidence scoring to each field
2. Implemented yellow border + "low confidence" label for fields < 0.7
3. Added re-extraction button for failed extractions
4. Result: Users can now identify and correct low-confidence fields
```

---

## 🔄 OCR Workflow

The complete pipeline from file upload to database storage:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OCR WORKFLOW                                │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌───────────────┐     ┌──────────────────┐
  │  UPLOAD  │ ──▶ │  PDF/IMAGE    │ ──▶ │  WORKERS AI      │
  │  FILE    │     │  PROCESSING   │     │  VISION          │
  └──────────┘     └───────────────┘     └──────────────────┘
                                               │
                                               ▼
  ┌──────────┐     ┌───────────────┐     ┌──────────────────┐
  │   D1     │ ◀── │  JSON PARSING │ ◀── │  TEXT            │
  │ DATABASE │     │  & VALIDATION │     │  EXTRACTION      │
  └──────────┘     └───────────────┘     └──────────────────┘
       │                   │
       │                   ▼
       │            ┌───────────────┐
       │            │  AUTO-FILL    │
       │            │  FORM         │
       │            └───────────────┘
       │                   │
       ▼                   ▼
  ┌──────────┐     ┌───────────────┐
  │   SAVE   │ ◀── │  MANUAL      │
  │ CONFIRM  │     │  CORRECTION  │
  └──────────┘     └───────────────┘
```

### Step-by-Step Explanation

| Step | Component | Description |
|------|-----------|-------------|
| 1 | **Upload** | User selects a JPG, PNG, or PDF file |
| 2 | **PDF/Image Processing** | PDF files are converted to images using PDF.js; images are validated |
| 3 | **Workers AI Vision** | The vision model analyzes the image and extracts text data |
| 4 | **JSON Parsing** | Raw text is parsed into structured JSON with validation |
| 5 | **Auto-fill Form** | Extracted data populates the review form fields |
| 6 | **Manual Correction** | User reviews and edits any incorrect fields |
| 7 | **Save to D1** | Confirmed data is inserted into Cloudflare D1 |

---

## 📄 PDF Support Explanation

### The Challenge

Cloudflare Workers AI Vision **does not natively support PDF files**. The vision model only accepts image formats (JPG, PNG, WebP). This is a common limitation with most AI vision models.

### The Solution

The application uses **PDF.js** (`pdfjs-dist`) to convert PDF documents into images before OCR processing:

```
┌─────────┐     ┌──────────────┐     ┌─────────────────┐
│  PDF    │ ──▶ │  PDF.js      │ ──▶ │  IMAGE          │
│  FILE   │     │  CONVERSION  │     │  (PNG/JPG)      │
└─────────┘     └──────────────┘     └─────────────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │  WORKERS AI     │
                                     │  VISION OCR     │
                                     └─────────────────┘
```

### How It Works

1. **PDF Upload** → User uploads a PDF file
2. **Page Extraction** → PDF.js extracts the first page
3. **Canvas Rendering** → The page is rendered to an HTML canvas
4. **Image Conversion** → Canvas is converted to a PNG data URL
5. **OCR Processing** → Workers AI Vision processes the image

### Important Notes

| Note | Description |
|------|-------------|
| 📄 **Single Page** | Currently only the first page of multi-page PDFs is processed |
| 🖼️ **Quality** | Output quality depends on PDF resolution |
| ⚡ **Performance** | PDF conversion adds ~1-2 seconds to processing time |

---

## 🚀 Installation

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Cloudflare account (free tier is sufficient)
- Wrangler CLI (`npm install -g wrangler`)

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone https://github.com/MuhamadRidhoDwiPutra/Smart-Document-Reader
cd Smart-Document-Reader

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .dev.vars.example .dev.vars    # macOS/Linux
# copy .dev.vars.example .dev.vars  # Windows

# 4. Run database migration
npm run db:migrate:local

# 5. Accept Meta license (required for Workers AI)
npm run workers-ai:agree

# 6. Start development server
npm run dev
```

### Access the Application

Open your browser and navigate to:

```
http://localhost:3000
```

Then:
1. **Register** a new account
2. **Upload** a photo of your receipt (JPG/PNG)
3. **Review** the extracted data
4. **Save** to your document list

---

## 🔐 Environment Variables

Create a `.dev.vars` file in the project root (copy from `.dev.vars.example`):

```bash
# Development environment indicator
NEXTJS_ENV=development

# Session secret for authentication (minimum 32 characters)
# Generate a secure random string for production
SESSION_SECRET=change-me-min-32-chars

# Seed secret for local development
# Only used for local development
SEED_SECRET=local-dev-seed-only
```

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTJS_ENV` | Yes | Environment mode (`development` or `production`) |
| `SESSION_SECRET` | Yes | Secret key for encrypting session cookies |
| `SEED_SECRET` | Yes | Seed value for local database initialization |

### Setting Production Secrets

```bash
# Set secrets via Wrangler
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SEED_SECRET
```

---

## ⚠️ Known Limitations

Understanding these limitations helps set proper expectations:

| Limitation | Description | Workaround |
|------------|-------------|------------|
| 🖼️ **Image Quality** | OCR accuracy depends heavily on image quality | Use high-resolution, well-lit photos |
| ✍️ **Handwriting** | Handwritten text may fail extraction | Type values manually |
| 📄 **Multi-page PDFs** | Only the first page is processed | Split multi-page PDFs before upload |
| 📝 **Complex Layouts** | Receipts with complex tables may need correction | Use manual correction feature |
| ⏱️ **Daily Quota** | Workers AI free tier is ~10,000 Neurons/day | Avoid spam re-extractions |
| 📁 **File Size** | Maximum upload size is 10 MB | Compress large images before upload |
| 📋 **Single Upload** | Only one file per upload (no batch) | Upload files individually |

---

## 💡 How to Improve OCR Accuracy

For best results, follow these guidelines when taking photos of receipts:

### ✅ Do's

| Tip | Why It Matters |
|-----|----------------|
| **Use good lighting** | Well-lit receipts are easier for AI to read |
| **High resolution** | Higher resolution = more detail captured |
| **Straight angle** | 90-degree angle prevents perspective distortion |
| **Clear focus** | Blurry photos reduce extraction accuracy |
| **Original size** | Avoid zooming or cropping before upload |

### ❌ Don'ts

| Mistake | Impact |
|---------|--------|
| **Shadow coverage** | Shadows can hide text |
| **Glossy reflections** | Flash/gloss creates unreadable areas |
| **Folded paper** | Creases interrupt text flow |
| **Dark photos** | Low brightness confuses OCR |
| **Extreme angles** | Skewed images cause misreading |

### Photo Tips for Best Results

```
Good Photo                          Poor Photo
─────────────────────────────────────────────────────
  ✓ Sharp, clear text                 ✗ Blurry edges
  ✓ Even lighting                     ✗ Dark corners
  ✓ Entire receipt visible           ✗ Cut-off edges
  ✓ Flat surface (no folds)           ✗ Wrinkled paper
  ✓ Direct top-down view             ✗ Tilted angle
```

---

## 🚀 Future Improvements

Planned features for future releases:

| Feature | Priority | Description |
|---------|----------|-------------|
| 📄 **Multi-page PDF OCR** | High | Process all pages in multi-page PDFs |
| 🤖 **Better AI Models** | High | Upgrade to newer vision models as they become available |
| 🏷️ **Receipt Categorization** | Medium | Auto-categorize receipts (food, transport, utilities) |
| 📊 **Dashboard Analytics** | Medium | Spending statistics by vendor/month |
| 📱 **Mobile Optimization** | Medium | Progressive Web App for better mobile experience |
| 🔄 **Batch Upload** | Medium | Upload multiple receipts at once |
| 📁 **Additional Exports** | Low | Excel, JSON, and PDF export formats |
| 🖼️ **Image Enhancement** | Low | Auto brightness/contrast adjustment |

---

## ⏱ If Given More Development Time

With additional development capacity, these improvements would be prioritized:

### Data Quality

| Improvement | Description |
|-------------|-------------|
| **Enhanced Validation** | Stricter input validation with clear error messages |
| **Data Deduplication** | Detect and warn about duplicate receipts |
| **Cross-reference Checks** | Validate totals against line item sums |

### OCR Enhancement

| Improvement | Description |
|-------------|-------------|
| **Image Preprocessing** | Automatic brightness, contrast, and deskewing |
| **Receipt-specific Parsing** | Specialized algorithms for common receipt formats |
| **Real-time Feedback** | Show extraction progress during processing |

### User Experience

| Improvement | Description |
|-------------|-------------|
| **Improved UI/UX** | Better visual feedback, loading states, and animations |
| **Keyboard Shortcuts** | Power user shortcuts for faster workflows |
| **Dark Mode** | Theme toggle for reduced eye strain |

### Technical Improvements

| Improvement | Description |
|-------------|-------------|
| **PDF Pipeline** | Full multi-page PDF support with page selection |
| **Offline Support** | Service worker for offline document viewing |
| **Real-time Sync** | Live updates across devices |

---

## 📸 Screenshots

> Screenshots will be added here to demonstrate the application interface.

### Upload Page

```
┌────────────────────────────────────────────────┐
│  [Smart Document Reader Logo]                  │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  │    📤 Drag & drop your receipt here      │  │
│  │       or click to browse                 │  │
│  │                                          │  │
│  │    Supported: JPG, PNG, PDF              │  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Recent Documents                              │
│  ┌──────────────────────────────────────────┐  │
│  │ 📄 Receipt - Alfamart    2024-05-20   ✅  │  │
│  │ 📄 Invoice - Tokopedia  2024-05-18   ✅  │  │
│  └──────────────────────────────────────────┘  │
│                                                │
└────────────────────────────────────────────────┘
```

### Review Page

```
┌────────────────────────────────────────────────┐
│  Review Extraction                             │
│                                                │
│  Vendor:        [Alfamart___________] ⚠️      │
│  Date:          [2024-05-20__________] ✅      │
│  Total:         [Rp 25.000__________] ✅       │
│  Currency:      [IDR_________________] ✅      │
│                                                │
│  Line Items                                   │
│  ┌──────────────────────────────────────────┐  │
│  │ # │ Item      │ Qty │ Price   │ Amount   │  │
│  │ 1 │ Mie Instan│  2  │ Rp 5.000│ Rp10.000 │  │
│  │ 2 │ Teh Kotak │  1  │ Rp 4.000│  Rp4.000 │  │
│  │ 3 │ Kerupuk   │  1  │ Rp 3.000│  Rp3.000 │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  [↻ Re-extract]        [💾 Save Document]      │
│                                                │
└────────────────────────────────────────────────┘
```

### Dashboard

```
┌────────────────────────────────────────────────┐
│  Documents                         [👤 User]   │
│                                                │
│  Filter: [All ▼]  Sort: [Date ▼]  [📤 Export]  │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │ 📄 Alfamart        │ 2024-05-20 │ Rp 25.000│  │
│  │ 📄 Tokopedia      │ 2024-05-18 │ Rp150.000│  │
│  │ 📄 Grab Transport  │ 2024-05-15 │ Rp 18.000│  │
│  │ 📄 Indomaret      │ 2024-05-12 │ Rp 35.000│  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Showing 1-4 of 12 documents    [< 1 2 3 >]   │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 🌎 Deployment

### Deploy to Cloudflare Pages

```bash
# Build and deploy
npm run deploy
```

### Manual Deployment Steps

```bash
# 1. Set secrets
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SEED_SECRET

# 2. Migrate production database
npm run db:migrate:remote

# 3. Deploy to Cloudflare
npm run deploy
```

### Deployment Options

| Platform | Status | Notes |
|----------|--------|-------|
| **Cloudflare Pages** | ✅ Recommended | Native integration with Workers |
| **Vercel** | ⚠️ Possible | Requires adapter configuration |
| **Cloudflare Workers** | ✅ Supported | Direct Workers deployment |

---

## 📁 Project Structure

```
smart-document-reader/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # Login, register, logout
│   │   │   └── documents/    # CRUD, upload, export
│   │   ├── documents/         # Document pages
│   │   ├── login/            # Login page
│   │   ├── register/         # Registration page
│   │   ├── globals.css       # Global styles
│   │   └── layout.tsx        # Root layout
│   ├── components/            # Reusable UI components
│   ├── lib/
│   │   ├── auth.ts           # Authentication logic
│   │   ├── documents.ts      # D1 + R2 operations
│   │   ├── extract.ts        # Workers AI Vision OCR
│   │   └── types.ts          # TypeScript interfaces
│   └── middleware.ts         # Authentication middleware
├── migrations/
│   └── 0001_init.sql         # Database schema
├── public/                    # Static assets
├── .dev.vars.example          # Environment template
├── next-env.d.ts             # Next.js TypeScript declarations
├── wrangler.jsonc           # Cloudflare Workers config
├── tailwind.config.ts       # Tailwind CSS config
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ using Next.js, TypeScript, and Cloudflare Workers AI**

*If you found this project useful, please give it a ⭐ on GitHub!*

</div>
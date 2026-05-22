/// <reference path="../../cloudflare-env.d.ts" />
import { getEnv } from "../../env";
import type { ExtractionResult, FieldConfidence } from "./types";

/** Vision model — free tier ~10k Neurons/hari di Workers Free. */
export const WORKERS_AI_VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

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

IMPORTANT: Return ONLY the JSON. No markdown, no explanation.

Example:
{"is_receipt":true,"vendor":"Alfamart","document_date":"2024-05-20","total":25000,"currency":"IDR","line_items":[{"description":"Mie Goreng","quantity":1,"unit_price":25000,"amount":25000}],"field_confidence":{"vendor":0.95,"document_date":0.9,"total":0.85,"currency":0.9,"line_items":0.8},"failure_reason":null}`;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function imageDataUri(bytes: ArrayBuffer, mimeType: string): string {
  const mime = mimeType?.startsWith("image/") ? mimeType : "image/jpeg";
  return `data:${mime};base64,${arrayBufferToBase64(bytes)}`;
}

/**
 * Extract text from Workers AI response.
 * Handles various response formats that the AI might return.
 */
function extractResponseText(result: unknown): string {
  if (result == null || typeof result !== "object") {
    return "";
  }

  const r = result as Record<string, unknown>;

  // Case 1: { response: "..." } - most common from Workers AI
  if (typeof r.response === "string") {
    return r.response;
  }

  // Case 2: { result: "..." } - alternative format
  if (typeof r.result === "string") {
    return r.result;
  }

  // Case 3: { text: "..." } - some models use this
  if (typeof r.text === "string") {
    return r.text;
  }

  // Case 4: { choices: [{ message: { content: "..." } }] } - chat format
  if (Array.isArray(r.choices) && r.choices.length > 0) {
    const choice = r.choices[0] as Record<string, unknown>;
    if (choice && typeof choice.message === "object") {
      const msg = choice.message as Record<string, unknown>;
      if (typeof msg.content === "string") {
        return msg.content;
      }
    }
  }

  // Case 5: Fallback - stringify the whole response
  return JSON.stringify(r);
}

/**
 * Safe JSON parser with multiple fallback strategies.
 */
function safeParseAIResponse(text: string): ExtractionResult | null {
  if (!text || !text.trim()) {
    return null;
  }

  // Strategy 1: Direct parse (when AI returns clean JSON)
  try {
    const parsed = JSON.parse(text);
    // If the parsed result is a JSON string (AI wrapped it), parse again
    if (typeof parsed === "string") {
      try {
        const inner = JSON.parse(parsed);
        if (typeof inner === "object" && inner !== null) {
          return validateExtractionResult(inner);
        }
      } catch {
        // The string is not JSON, return it as-is
        return null;
      }
    }
    // If parsed is already an object
    if (typeof parsed === "object" && parsed !== null) {
      return validateExtractionResult(parsed);
    }
  } catch {
    // Direct parse failed, try other strategies
  }

  // Strategy 2: Strip markdown code blocks
  const stripped = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(stripped);
    if (typeof parsed === "object" && parsed !== null) {
      return validateExtractionResult(parsed);
    }
  } catch {
    // Stripped parse failed, try regex extraction
  }

  // Strategy 3: Extract JSON object using regex
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed === "object" && parsed !== null) {
        return validateExtractionResult(parsed);
      }
    } catch {
      // Regex extraction failed
    }
  }

  // All strategies failed
  return null;
}

/**
 * Validate that a parsed object has the required ExtractionResult structure.
 */
function validateExtractionResult(obj: unknown): ExtractionResult | null {
  if (typeof obj !== "object" || obj === null) {
    return null;
  }

  const result = obj as Record<string, unknown>;

  // Check for is_receipt field (required)
  if (typeof result.is_receipt !== "boolean") {
    return null;
  }

  // Build the extraction result with defaults for missing fields
  return {
    is_receipt: result.is_receipt,
    vendor: result.vendor == null ? null : String(result.vendor),
    document_date: result.document_date == null ? null : String(result.document_date),
    total: result.total == null ? null : Number(result.total),
    currency: result.currency == null ? null : String(result.currency),
    line_items: Array.isArray(result.line_items) ? result.line_items.map((item) => ({
      description: item?.description == null ? null : String(item.description),
      quantity: item?.quantity == null ? null : Number(item.quantity),
      unit_price: item?.unit_price == null ? null : Number(item.unit_price),
      amount: item?.amount == null ? null : Number(item.amount),
    })) : [],
    field_confidence: (typeof result.field_confidence === "object" && result.field_confidence !== null)
      ? result.field_confidence as FieldConfidence
      : {},
    failure_reason: result.failure_reason == null ? null : String(result.failure_reason),
  };
}

function needsMetaLicenseAcceptance(msg: string): boolean {
  return /agree|license|acceptable use/i.test(msg);
}

async function acceptMetaLicense(AI: Ai): Promise<void> {
  await AI.run(WORKERS_AI_VISION_MODEL, { prompt: "agree" });
}

async function runVision(
  AI: Ai,
  bytes: ArrayBuffer,
  mimeType: string
): Promise<ExtractionResult> {
  const result = await AI.run(WORKERS_AI_VISION_MODEL, {
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: imageDataUri(bytes, mimeType),
          },
        },
        {
          type: "text",
          text: USER_PROMPT,
        },
      ],
    },
  ],
  max_tokens: 2048,
  temperature: 0.1,
});

  const text = extractResponseText(result);

  if (!text || !text.trim()) {
    return {
      is_receipt: false,
      vendor: null,
      document_date: null,
      total: null,
      currency: null,
      line_items: [],
      field_confidence: {},
      failure_reason: "AI tidak memberikan respons. Silakan coba lagi.",
    };
  }

  // Try to parse the response
  const extraction = safeParseAIResponse(text);

  if (extraction) {
    return extraction;
  }

  // All parsing strategies failed
  return {
    is_receipt: false,
    vendor: null,
    document_date: null,
    total: null,
    currency: null,
    line_items: [],
    field_confidence: {},
    failure_reason: "Gagal membaca data dari gambar. Silakan input manual atau coba lagi.",
  };
}

export async function extractFromImage(
  bytes: ArrayBuffer,
  mimeType: string
): Promise<ExtractionResult> {
  if (mimeType === "application/pdf") {
    return {
      is_receipt: false,
      vendor: null,
      document_date: null,
      total: null,
      currency: null,
      line_items: [],
      field_confidence: {},
      failure_reason:
        "PDF belum didukung. Silakan upload foto struk (JPG/PNG/WebP).",
    };
  }

  const { AI } = getEnv();
  if (!AI) {
    return {
      is_receipt: false,
      vendor: null,
      document_date: null,
      total: null,
      currency: null,
      line_items: [],
      field_confidence: {},
      failure_reason:
        "Workers AI belum dikonfigurasi. Tambahkan binding AI di wrangler.jsonc.",
    };
  }

  try {
    return await runVision(AI, bytes, mimeType);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (needsMetaLicenseAcceptance(msg)) {
      try {
        await acceptMetaLicense(AI);
        return await runVision(AI, bytes, mimeType);
      } catch {
        return {
          is_receipt: false,
          vendor: null,
          document_date: null,
          total: null,
          currency: null,
          line_items: [],
          field_confidence: {},
          failure_reason: "Lisensi Meta belum disetujui. Jalankan: npm run workers-ai:agree",
        };
      }
    }
    return {
      is_receipt: false,
      vendor: null,
      document_date: null,
      total: null,
      currency: null,
      line_items: [],
      field_confidence: {},
      failure_reason: msg || "Terjadi kesalahan saat ekstraksi.",
    };
  }
}

export function needsReview(extraction: ExtractionResult, threshold: number): boolean {
  if (!extraction.is_receipt) return true;
  const fc = extraction.field_confidence;
  for (const k of ["vendor", "document_date", "total", "currency"] as const) {
    if (fc[k] !== undefined && fc[k] < threshold) return true;
  }
  if ((fc.line_items ?? 1) < threshold) return true;
  return false;
}
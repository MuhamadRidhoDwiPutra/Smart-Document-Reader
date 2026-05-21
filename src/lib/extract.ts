/// <reference path="../../cloudflare-env.d.ts" />
import { getEnv } from "./env";
import type { ExtractionResult, FieldConfidence } from "./types";

/** Vision model — free tier ~10k Neurons/hari di Workers Free. */
export const WORKERS_AI_VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

const USER_PROMPT = `You are an AI that extracts data from receipt/invoice images.

Extract the following information:
- vendor: The store/merchant name (string)
- document_date: The date on the receipt in YYYY-MM-DD format
- total: The total amount (number, not string)
- currency: The currency code like IDR, USD (string)
- line_items: Array of items with description, quantity, unit_price, amount
- field_confidence: Confidence scores (0-1) for each field
- is_receipt: true if this is a receipt/invoice, false otherwise
- failure_reason: Reason if not a receipt

IMPORTANT: Return ONLY a valid JSON object. No markdown, no text before or after.

Example response:
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

function extractResponseText(result: unknown): string {
  if (!result || typeof result !== "object") return "";
  const r = result as Record<string, unknown>;

  // Workers AI typically returns { response: "..." } or { result: "..." }
  if (typeof r.response === "string") {
    // Check if response is a JSON string wrapped inside
    try {
      const parsed = JSON.parse(r.response);
      if (typeof parsed === "object" && parsed !== null) {
        // It's a JSON string, return it directly
        return r.response;
      }
    } catch {
      // It's a plain text response, return as-is
      return r.response;
    }
  }
  if (typeof r.result === "string") return r.result;
  if (typeof r.text === "string") return r.text;

  // Sometimes the response is nested in a 'choices' array
  if (Array.isArray(r.choices)) {
    const choice = r.choices[0] as Record<string, unknown>;
    if (choice && typeof choice.message === "object") {
      const msg = choice.message as Record<string, unknown>;
      if (typeof msg.content === "string") return msg.content;
    }
  }

  return JSON.stringify(r);
}

function extractJsonFromText(text: string): string | null {
  // Try to find JSON object in the text
  // Handle cases where AI returns {"response": "{...json..."}
  try {
    const obj = JSON.parse(text);
    if (typeof obj.response === "string") {
      // Unwrap the response field which is itself a JSON string
      return obj.response;
    }
  } catch {
    // Continue with other extraction methods
  }

  // Try to find JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return null;
}

function parseModelJson(text: string): ExtractionResult {
  const trimmed = text.trim();

  // Remove markdown code blocks if present
  let cleaned = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Try direct parse first
  try {
    const parsed = JSON.parse(cleaned) as ExtractionResult;
    if (typeof parsed.is_receipt !== "boolean") {
      throw new Error("Missing is_receipt field");
    }
    if (!parsed.field_confidence) parsed.field_confidence = {} as FieldConfidence;
    if (!Array.isArray(parsed.line_items)) parsed.line_items = [];
    return parsed;
  } catch {
    // Try to extract JSON from text if direct parse fails
    const extracted = extractJsonFromText(cleaned);
    if (extracted) {
      try {
        const parsed = JSON.parse(extracted) as ExtractionResult;
        if (typeof parsed.is_receipt !== "boolean") {
          throw new Error("Missing is_receipt field");
        }
        if (!parsed.field_confidence) parsed.field_confidence = {} as FieldConfidence;
        if (!Array.isArray(parsed.line_items)) parsed.line_items = [];
        return parsed;
      } catch {
        // Fall through to error response
      }
    }
  }

  // If all parsing fails, return failure response with a user-friendly message
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
        role: "system",
        content:
          "You extract structured data from receipt photos. Respond with a single JSON object only, no markdown.",
      },
      { role: "user", content: USER_PROMPT },
    ],
    image: imageDataUri(bytes, mimeType),
    max_tokens: 2048,
    temperature: 0.2,
  });

  const text = extractResponseText(result);
  if (!text.trim()) {
    throw new Error("Workers AI returned an empty response.");
  }
  return parseModelJson(text);
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
        "PDF belum didukung untuk Workers AI vision. Unggah foto struk (JPG/PNG/WebP).",
    };
  }

  const { AI } = getEnv();
  if (!AI) {
    throw new Error(
      "Workers AI binding tidak tersedia. Tambahkan blok ai { binding = \"AI\" } di wrangler.jsonc."
    );
  }

  try {
    return await runVision(AI, bytes, mimeType);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (needsMetaLicenseAcceptance(msg)) {
      await acceptMetaLicense(AI);
      return await runVision(AI, bytes, mimeType);
    }
    throw err;
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

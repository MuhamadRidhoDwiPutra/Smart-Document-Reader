import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractionResult, FieldConfidence } from "./types";
import { getEnv } from "./env";

const PROMPT = `Analyze this receipt/invoice image. Return ONLY valid JSON:
{"is_receipt":boolean,"vendor":string|null,"document_date":"YYYY-MM-DD"|null,"total":number|null,"currency":string|null,"line_items":[{"description":string,"quantity":number|null,"unit_price":number|null,"amount":number|null}],"field_confidence":{"vendor":0-1,"document_date":0-1,"total":0-1,"currency":0-1,"line_items":0-1},"failure_reason":string|null}
If not a receipt or unreadable, is_receipt=false with failure_reason.`;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function extractFromImage(
  bytes: ArrayBuffer,
  mimeType: string
): Promise<ExtractionResult> {
  const { GEMINI_API_KEY } = getEnv();
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent([
    { text: PROMPT },
    { inlineData: { mimeType: mimeType || "image/jpeg", data: arrayBufferToBase64(bytes) } },
  ]);

  const text = result.response.text().trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
  try {
    const parsed = JSON.parse(text) as ExtractionResult;
    if (!parsed.field_confidence) parsed.field_confidence = {} as FieldConfidence;
    if (!Array.isArray(parsed.line_items)) parsed.line_items = [];
    return parsed;
  } catch {
    return {
      is_receipt: false,
      vendor: null,
      document_date: null,
      total: null,
      currency: null,
      line_items: [],
      field_confidence: {},
      failure_reason: "AI returned invalid JSON.",
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

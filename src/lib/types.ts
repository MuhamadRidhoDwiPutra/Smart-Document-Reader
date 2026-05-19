export type DocumentStatus =
  | "uploaded"
  | "processing"
  | "saved"
  | "failed"
  | "needs_review";

export type FieldConfidence = Record<string, number>;

export interface LineItem {
  id: string;
  document_id: string;
  line_order: number;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
  field_confidence: FieldConfidence | null;
}

export interface Document {
  id: string;
  user_id: string;
  file_key: string;
  original_filename: string | null;
  mime_type: string | null;
  status: DocumentStatus;
  vendor: string | null;
  document_date: string | null;
  total: number | null;
  currency: string | null;
  field_confidence: FieldConfidence | null;
  error_message: string | null;
  created_at: number;
  updated_at: number;
}

export interface ExtractionResult {
  is_receipt: boolean;
  vendor: string | null;
  document_date: string | null;
  total: number | null;
  currency: string | null;
  line_items: Array<{
    description: string;
    quantity: number | null;
    unit_price: number | null;
    amount: number | null;
  }>;
  field_confidence: FieldConfidence;
  failure_reason: string | null;
}

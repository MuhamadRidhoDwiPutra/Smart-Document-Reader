import { getEnv, getLowConfidenceThreshold } from "./env";
import type { Document, DocumentStatus, LineItem } from "./types";
import { formatExtractionError } from "./errors";
import { extractFromImage, needsReview } from "./extract";

function parseDoc(row: Document): Document {
  return {
    ...row,
    field_confidence:
      typeof row.field_confidence === "string"
        ? JSON.parse(row.field_confidence)
        : row.field_confidence,
  };
}

export async function listDocuments(
  userId: string,
  filters: { vendor?: string; dateFrom?: string; dateTo?: string }
): Promise<Document[]> {
  const { DB } = getEnv();
  let sql = `SELECT * FROM documents WHERE user_id = ?`;
  const binds: (string | number)[] = [userId];
  if (filters.vendor) {
    sql += ` AND vendor LIKE ?`;
    binds.push(`%${filters.vendor}%`);
  }
  if (filters.dateFrom) {
    sql += ` AND document_date >= ?`;
    binds.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    sql += ` AND document_date <= ?`;
    binds.push(filters.dateTo);
  }
  sql += ` ORDER BY created_at DESC`;
  const { results } = await DB.prepare(sql).bind(...binds).all<Document>();
  return (results ?? []).map(parseDoc);
}

export async function getDocument(
  userId: string,
  docId: string
): Promise<(Document & { line_items: LineItem[] }) | null> {
  const { DB } = getEnv();
  const doc = await DB.prepare(
    `SELECT * FROM documents WHERE id = ? AND user_id = ?`
  )
    .bind(docId, userId)
    .first<Document>();
  if (!doc) return null;
  const { results } = await DB.prepare(
    `SELECT * FROM line_items WHERE document_id = ? ORDER BY line_order`
  )
    .bind(docId)
    .all<LineItem>();
  const line_items = (results ?? []).map((li: LineItem) => ({
    ...li,
    field_confidence:
      typeof li.field_confidence === "string"
        ? JSON.parse(li.field_confidence as unknown as string)
        : li.field_confidence,
  }));
  return { ...parseDoc(doc), line_items };
}

export async function processDocument(userId: string, docId: string): Promise<void> {
  const { DB, UPLOADS } = getEnv();
  const doc = await DB.prepare(
    `SELECT file_key, mime_type FROM documents WHERE id = ? AND user_id = ?`
  )
    .bind(docId, userId)
    .first<{ file_key: string; mime_type: string | null }>();
  if (!doc) return;

  await DB.prepare(
    `UPDATE documents SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?`
  )
    .bind("processing", Date.now(), docId, userId)
    .run();

  const obj = await UPLOADS.get(doc.file_key);
  if (!obj) {
    await DB.prepare(
      `UPDATE documents SET status = ?, error_message = ?, updated_at = ? WHERE id = ?`
    )
      .bind("failed", "File not found in storage.", Date.now(), docId)
      .run();
    return;
  }

  const bytes = await obj.arrayBuffer();
  const mime = doc.mime_type ?? obj.httpMetadata?.contentType ?? "image/jpeg";

  try {
    const extraction = await extractFromImage(bytes, mime);
    const threshold = getLowConfidenceThreshold();
    const now = Date.now();

    if (!extraction.is_receipt) {
      await DB.prepare(
        `UPDATE documents SET status = ?, error_message = ?, field_confidence = ?, updated_at = ? WHERE id = ?`
      )
        .bind(
          "failed",
          extraction.failure_reason ?? "Bukan resi/invoice.",
          JSON.stringify(extraction.field_confidence),
          now,
          docId
        )
        .run();
      return;
    }

    const status: DocumentStatus = needsReview(extraction, threshold)
      ? "needs_review"
      : "uploaded";

    await DB.prepare(
      `UPDATE documents SET status = ?, vendor = ?, document_date = ?, total = ?, currency = ?, field_confidence = ?, error_message = ?, updated_at = ? WHERE id = ?`
    )
      .bind(
        status,
        extraction.vendor,
        extraction.document_date,
        extraction.total,
        extraction.currency,
        JSON.stringify(extraction.field_confidence),
        extraction.failure_reason,
        now,
        docId
      )
      .run();

    await DB.prepare(`DELETE FROM line_items WHERE document_id = ?`).bind(docId).run();
    for (let i = 0; i < extraction.line_items.length; i++) {
      const li = extraction.line_items[i];
      await DB.prepare(
        `INSERT INTO line_items (id, document_id, line_order, description, quantity, unit_price, amount, field_confidence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          crypto.randomUUID(),
          docId,
          i,
          li.description,
          li.quantity,
          li.unit_price,
          li.amount,
          JSON.stringify({ description: extraction.field_confidence.line_items ?? 0.8 })
        )
        .run();
    }
  } catch (err) {
    const msg = formatExtractionError(err);
    await DB.prepare(
      `UPDATE documents SET status = ?, error_message = ?, updated_at = ? WHERE id = ?`
    )
      .bind("failed", msg, Date.now(), docId)
      .run();
  }
}

export async function saveDocument(
  userId: string,
  docId: string,
  data: {
    vendor: string | null;
    document_date: string | null;
    total: number | null;
    currency: string | null;
    line_items: Array<{
      id?: string;
      description: string | null;
      quantity: number | null;
      unit_price: number | null;
      amount: number | null;
    }>;
  }
): Promise<void> {
  const { DB } = getEnv();
  const now = Date.now();

  console.log("[saveDocument] Starting save:", {
    userId,
    docId,
    vendor: data.vendor,
    document_date: data.document_date,
    total: data.total,
    currency: data.currency,
    line_items_count: data.line_items.length,
  });

  // Update document
  try {
    const updateResult = await DB.prepare(
      `UPDATE documents SET vendor = ?, document_date = ?, total = ?, currency = ?, status = ?, updated_at = ? WHERE id = ? AND user_id = ?`
    )
      .bind(data.vendor, data.document_date, data.total, data.currency, "saved", now, docId, userId)
      .run();

    console.log("[saveDocument] Document update result:", updateResult.success);
  } catch (err) {
    console.error("[saveDocument] Document update error:", err);
    throw err;
  }

  // Delete existing line items
  try {
    await DB.prepare(`DELETE FROM line_items WHERE document_id = ?`).bind(docId).run();
    console.log("[saveDocument] Existing line items deleted");
  } catch (err) {
    console.error("[saveDocument] Delete line items error:", err);
    throw err;
  }

  // Insert new line items
  for (let i = 0; i < data.line_items.length; i++) {
    const li = data.line_items[i];
    try {
      await DB.prepare(
        `INSERT INTO line_items (id, document_id, line_order, description, quantity, unit_price, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          li.id || crypto.randomUUID(),
          docId,
          i,
          li.description,
          li.quantity,
          li.unit_price,
          li.amount
        )
        .run();
    } catch (err) {
      console.error(`[saveDocument] Line item ${i} insert error:`, err);
      // Continue with other items
    }
  }

  console.log("[saveDocument] Save completed successfully");
}

export async function deleteDocument(userId: string, docId: string): Promise<boolean> {
  const { DB, UPLOADS } = getEnv();
  const doc = await DB.prepare(
    `SELECT file_key FROM documents WHERE id = ? AND user_id = ?`
  )
    .bind(docId, userId)
    .first<{ file_key: string }>();
  if (!doc) return false;

  await DB.prepare(`DELETE FROM line_items WHERE document_id = ?`).bind(docId).run();
  await DB.prepare(`DELETE FROM documents WHERE id = ? AND user_id = ?`)
    .bind(docId, userId)
    .run();

  try {
    await UPLOADS.delete(doc.file_key);
  } catch {
    // ignore missing object in R2
  }
  return true;
}

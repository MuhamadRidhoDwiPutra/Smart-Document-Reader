import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "../../../../lib/env";
import { processDocument } from "@/lib/documents";

export const runtime = "nodejs";

const MAX = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "File wajib." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Format: JPG, PNG, WebP (foto struk)." }, { status: 400 });
  }
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX) {
    return NextResponse.json({ error: "Maks 10 MB." }, { status: 400 });
  }
  const { DB, UPLOADS } = getEnv();
  const docId = crypto.randomUUID();
  const fileKey = `${user.id}/${docId}/${file.name}`;
  const now = Date.now();
  await UPLOADS.put(fileKey, bytes, { httpMetadata: { contentType: file.type } });
  await DB.prepare(
    `INSERT INTO documents (id, user_id, file_key, original_filename, mime_type, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'uploaded', ?, ?)`
  )
    .bind(docId, user.id, fileKey, file.name, file.type, now, now)
    .run();
  await processDocument(user.id, docId);
  return NextResponse.json({ id: docId });
}
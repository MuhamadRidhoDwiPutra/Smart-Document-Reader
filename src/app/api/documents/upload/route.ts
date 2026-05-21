import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { processDocument } from "@/lib/documents";

export const runtime = "nodejs";

const MAX = 10 * 1024 * 1024;
// Allow images and converted PNG from PDF
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/png"];

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const originalFilename = form.get("original_filename") as string | null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "File wajib." }, { status: 400 });
  }

  // Validate file type (allow converted PNG from PDF)
  const isAllowedImage = ALLOWED.includes(file.type);
  const isConvertedPdf = file.type === "image/png" && file.name.endsWith("_page1.png");

  if (!isAllowedImage && !isConvertedPdf) {
    return NextResponse.json(
      { error: "Format: JPG, PNG, WebP, atau PDF (foto struk)." },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX) {
    return NextResponse.json({ error: "Maks 10 MB." }, { status: 400 });
  }

  const { DB, UPLOADS } = getEnv();
  const docId = crypto.randomUUID();

  // Use original filename for display, but store actual file
  const displayFilename = originalFilename || file.name;
  const storedMimeType = file.type || "image/png";
  const storedFilename = isConvertedPdf ? `${displayFilename}.png` : file.name;

  const fileKey = `${user.id}/${docId}/${storedFilename}`;
  const now = Date.now();

  await UPLOADS.put(fileKey, bytes, { httpMetadata: { contentType: storedMimeType } });

  await DB.prepare(
    `INSERT INTO documents (id, user_id, file_key, original_filename, mime_type, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'uploaded', ?, ?)`
  )
    .bind(docId, user.id, fileKey, displayFilename, storedMimeType, now, now)
    .run();

  await processDocument(user.id, docId);

  return NextResponse.json({ id: docId });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "../../../../../lib/env";

type P = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: P) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { DB, UPLOADS } = getEnv();
  const id = (await params).id;
  const row = await DB.prepare(
    `SELECT file_key, mime_type, original_filename FROM documents WHERE id = ? AND user_id = ?`
  )
    .bind(id, user.id)
    .first();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const obj = await UPLOADS.get(row.file_key);
  if (!obj) return NextResponse.json({ error: "File missing" }, { status: 404 });
  return new NextResponse(await obj.arrayBuffer(), {
    headers: {
      "Content-Type": row.mime_type ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${row.original_filename ?? "doc"}"`,
    },
  });
}

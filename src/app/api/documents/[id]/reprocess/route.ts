import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDocument, processDocument } from "@/lib/documents";

export const runtime = "nodejs";

type P = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: P) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await params).id;
  const existing = await getDocument(user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await processDocument(user.id, id);
  const document = await getDocument(user.id, id);
  return NextResponse.json({ document });
}

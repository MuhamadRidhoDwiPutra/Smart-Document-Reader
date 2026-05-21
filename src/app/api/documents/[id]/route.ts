import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteDocument, getDocument, saveDocument } from "@/lib/documents";

type P = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: P) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const doc = await getDocument(user.id, (await params).id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ document: doc });
}

export async function PATCH(request: Request, { params }: P) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await params).id;
  const body = await request.json() as {
    vendor?: string | null;
    document_date?: string | null;
    total?: number | null;
    currency?: string | null;
    line_items?: Array<{
      description: string | null;
      quantity: number | null;
      unit_price: number | null;
      amount: number | null;
    }>;
  };
  await saveDocument(user.id, id, {
    vendor: body.vendor ?? null,
    document_date: body.document_date ?? null,
    total: body.total ?? null,
    currency: body.currency ?? null,
    line_items: body.line_items ?? [],
  });
  const doc = await getDocument(user.id, id);
  return NextResponse.json({ document: doc });
}

export async function DELETE(request: Request, { params }: P) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await params).id;
  const ok = await deleteDocument(user.id, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

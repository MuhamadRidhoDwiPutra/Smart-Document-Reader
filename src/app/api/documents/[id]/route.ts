import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteDocument, getDocument, saveDocument } from "@/lib/documents";

type P = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: P) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const doc = await getDocument(user.id, (await params).id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ document: doc });
  } catch (err) {
    console.error("[GET /api/documents/[id]] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: P) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = (await params).id;

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;

    // Validate and normalize the data
    const vendor = data.vendor === undefined ? null : String(data.vendor ?? null);
    const document_date = data.document_date === undefined ? null : String(data.document_date ?? null);

    // Handle total - must be number or null
    let total: number | null = null;
    if (data.total !== undefined && data.total !== null && data.total !== "") {
      const parsed = Number(data.total);
      total = isNaN(parsed) ? null : parsed;
    }

    const currency = data.currency === undefined ? null : String(data.currency ?? null);

    // Handle line_items
    const line_items = Array.isArray(data.line_items) ? data.line_items.map((item: unknown) => {
      const li = item as Record<string, unknown>;
      return {
        description: li.description == null ? null : String(li.description),
        quantity: li.quantity == null ? null : Number(li.quantity),
        unit_price: li.unit_price == null ? null : Number(li.unit_price),
        amount: li.amount == null ? null : Number(li.amount),
      };
    }) : [];

    console.log("[PATCH /api/documents/[id]] Saving document:", {
      id,
      vendor,
      document_date,
      total,
      currency,
      line_items_count: line_items.length,
    });

    // Save to database
    await saveDocument(user.id, id, {
      vendor,
      document_date,
      total,
      currency,
      line_items,
    });

    // Fetch updated document
    const doc = await getDocument(user.id, id);

    console.log("[PATCH /api/documents/[id]] Save successful, document updated:", doc?.id);

    return NextResponse.json({ document: doc });
  } catch (err) {
    console.error("[PATCH /api/documents/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: P) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = (await params).id;
    const ok = await deleteDocument(user.id, id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/documents/[id]] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
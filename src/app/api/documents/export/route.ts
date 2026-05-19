import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listDocuments } from "@/lib/documents";
import { getEnv } from "@/lib/env";

function esc(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const docs = await listDocuments(user.id, {
    vendor: url.searchParams.get("vendor") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
  });
  const { DB } = getEnv();
  const lines = [
    "document_id,vendor,document_date,total,currency,status,line_description,line_quantity,line_unit_price,line_amount",
  ];
  for (const doc of docs) {
    const { results } = await DB.prepare(
      `SELECT description, quantity, unit_price, amount FROM line_items WHERE document_id = ? ORDER BY line_order`
    )
      .bind(doc.id)
      .all<{ description: string | null; quantity: number | null; unit_price: number | null; amount: number | null }>();
    const items = results ?? [];
    const base = [doc.id, doc.vendor, doc.document_date, doc.total, doc.currency, doc.status];
    if (!items.length) {
      lines.push([...base, "", "", "", ""].map(esc).join(","));
    } else {
      for (const li of items) {
        lines.push([...base, li.description, li.quantity, li.unit_price, li.amount].map(esc).join(","));
      }
    }
  }
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="documents-export.csv"',
    },
  });
}

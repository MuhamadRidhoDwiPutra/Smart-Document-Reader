import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listDocuments } from "@/lib/documents";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const docs = await listDocuments(user.id, {
    vendor: url.searchParams.get("vendor") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
  });
  return NextResponse.json({ documents: docs });
}

import { NextResponse } from "next/server";
import { getSessionIdFromCookie } from "@/lib/session";
import { getEnv } from "../../../../../env";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const sessionId = getSessionIdFromCookie(request.headers.get("cookie"));
  if (sessionId) {
    await getEnv().DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
  }

  const cookieStore = await cookies();
  cookieStore.delete("sdr_session");

  return NextResponse.json({ ok: true });
}
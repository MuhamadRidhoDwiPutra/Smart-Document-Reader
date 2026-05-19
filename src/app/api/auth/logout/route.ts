import { NextResponse } from "next/dist/server/web/response";
import { clearSessionCookie } from "@/lib/auth";
import { getSessionIdFromCookie } from "@/lib/session";
import { getEnv } from "@/lib/env";

export async function POST(request: Request) {
  const sessionId = getSessionIdFromCookie(request.headers.get("cookie"));
  if (sessionId) {
    await getEnv().DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookie());
  return res;
}

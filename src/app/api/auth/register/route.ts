import { NextResponse } from "next/server";
import { registerUser, buildSessionCookie } from "@/lib/auth";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const result = await registerUser(body.email ?? "", body.password ?? "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const sessionId = await createSession(result.userId);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildSessionCookie(sessionId));
  return res;
}

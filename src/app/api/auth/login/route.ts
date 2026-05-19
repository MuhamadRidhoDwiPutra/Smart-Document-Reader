import { NextResponse } from "next/server";
import { loginUser, buildSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const result = await loginUser(body.email ?? "", body.password ?? "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildSessionCookie(result.sessionId));
  return res;
}

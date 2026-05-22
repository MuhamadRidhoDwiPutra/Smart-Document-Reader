import { NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";
import { sessionCookieOptions, COOKIE_NAME } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const result = await loginUser(body.email ?? "", body.password ?? "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });

  // Set cookie using Set-Cookie header for Cloudflare Workers compatibility
  const opts = sessionCookieOptions(14 * 24 * 60 * 60);
  const cookieValue = [
    `${COOKIE_NAME}=${result.sessionId}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(opts.secure ? ["Secure"] : []),
  ].join("; ");

  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", cookieValue);
  return res;
}
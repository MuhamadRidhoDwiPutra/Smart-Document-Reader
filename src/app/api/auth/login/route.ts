import { NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const result = await loginUser(body.email ?? "", body.password ?? "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });

  const res = NextResponse.json({ ok: true });

  // Set cookie using the proper Next.js cookies API
  // In Cloudflare Workers, always use secure=true since it's always HTTPS
  const cookieStore = await cookies();
  cookieStore.set("sdr_session", result.sessionId, {
    httpOnly: true,
    secure: true, // Cloudflare Workers always use HTTPS
    sameSite: "lax",
    path: "/",
    maxAge: 14 * 24 * 60 * 60, // 14 days in seconds
  });

  return res;
}
import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const result = await registerUser(body.email ?? "", body.password ?? "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const sessionId = await createSession(result.userId);

  const cookieStore = await cookies();
  cookieStore.set("sdr_session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
  });

  return NextResponse.json({ ok: true });
}
import { NextResponse } from "next/server";
import { getEnv } from "../../../lib/env";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  const secret = request.headers.get("x-seed-secret");
  const env = getEnv();
  if (!env.SEED_SECRET || secret !== env.SEED_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const email = "demo@smartdoc.local";
  const password = "demo12345";
  const password_hash = await hashPassword(password);
  await env.DB.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash`
  )
    .bind("demo-user-001", email, password_hash, Date.now())
    .run();
  return NextResponse.json({ ok: true, email, password });
}

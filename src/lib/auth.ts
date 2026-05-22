import { getEnv } from "../../env";
import { hashPassword, verifyPassword } from "./password";
import {
  COOKIE_NAME,
  createSession,
  getSessionIdFromCookie,
  getSessionUserId,
  sessionCookieOptions,
} from "./session";

export interface UserRow {
  id: string;
  email: string;
}

export async function registerUser(
  email: string,
  password: string
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const { DB } = getEnv();
  const normalized = email.trim().toLowerCase();
  if (!normalized || password.length < 8) {
    return { ok: false, error: "Email valid dan password minimal 8 karakter." };
  }
  const existing = await DB.prepare(`SELECT id FROM users WHERE email = ?`)
    .bind(normalized)
    .first();
  if (existing) return { ok: false, error: "Email sudah terdaftar." };
  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);
  await DB.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`
  )
    .bind(id, normalized, password_hash, Date.now())
    .run();
  return { ok: true, userId: id };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const { DB } = getEnv();
  const normalized = email.trim().toLowerCase();
  const row = await DB.prepare(
    `SELECT id, password_hash FROM users WHERE email = ?`
  )
    .bind(normalized)
    .first<{ id: string; password_hash: string }>();
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return { ok: false, error: "Email atau password salah." };
  }
  const sessionId = await createSession(row.id);
  return { ok: true, sessionId };
}

export async function getCurrentUser(
  request: Request
): Promise<UserRow | null> {
  const sessionId = getSessionIdFromCookie(request.headers.get("cookie"));
  const userId = await getSessionUserId(sessionId);
  if (!userId) return null;
  const { DB } = getEnv();
  return DB.prepare(`SELECT id, email FROM users WHERE id = ?`)
    .bind(userId)
    .first<UserRow>();
}

export function buildSessionCookie(sessionId: string): string {
  const opts = sessionCookieOptions(14 * 24 * 60 * 60);
  const parts = [
    `${COOKIE_NAME}=${sessionId}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

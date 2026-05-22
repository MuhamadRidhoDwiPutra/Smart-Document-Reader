import { getEnv } from "./env";

export const COOKIE_NAME = "sdr_session";
const SESSION_DAYS = 14;

// Check if we're running on localhost (HTTP) vs production (HTTPS)
const IS_LOCALHOST = process.env.NEXTJS_ENV === "development" ||
  process.env.NODE_ENV === "development" ||
  process.env.WATCH === "true";

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: !IS_LOCALHOST, // Secure only in production (HTTPS)
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function createSession(userId: string): Promise<string> {
  const { DB } = getEnv();
  const id = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  await DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`
  )
    .bind(id, userId, expiresAt, now)
    .run();
  return id;
}

export async function getSessionUserId(
  sessionId: string | undefined
): Promise<string | null> {
  if (!sessionId) return null;
  const { DB } = getEnv();
  const row = await DB.prepare(
    `SELECT user_id, expires_at FROM sessions WHERE id = ?`
  )
    .bind(sessionId)
    .first();
  if (!row || row.expires_at < Date.now()) {
    if (row) {
      await DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
    }
    return null;
  }
  return row.user_id;
}

export function getSessionIdFromCookie(
  cookieHeader: string | null
): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  return match?.slice(COOKIE_NAME.length + 1);
}

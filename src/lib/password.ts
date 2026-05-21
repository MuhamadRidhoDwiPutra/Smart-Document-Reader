const ITERATIONS = 100_000;
const SALT_LEN = 16;
const KEY_LEN = 32;

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as Uint8Array<ArrayBuffer>, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    KEY_LEN * 8
  );
  return new Uint8Array(bits as ArrayBuffer);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const derived = await derive(password, salt);
  return `pbkdf2:${ITERATIONS}:${toBase64(salt)}:${toBase64(derived)}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  if (parseInt(parts[1], 10) !== ITERATIONS) return false;
  const salt = fromBase64(parts[2]);
  const expected = fromBase64(parts[3]);
  const derived = await derive(password, salt);
  if (derived.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i];
  return diff === 0;
}

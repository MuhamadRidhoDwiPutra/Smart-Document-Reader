/**
 * Setujui lisensi Meta untuk model vision Workers AI.
 * Butuh: npx wrangler login + subdomain workers.dev (buka menu Workers di dashboard sekali).
 */
import { execSync } from "node:child_process";

const MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function getAccountId() {
  const out = run("npx wrangler whoami");
  const m = out.match(/\b[0-9a-f]{32}\b/i);
  if (!m) {
    console.error("Account ID tidak ditemukan. Jalankan: npx wrangler login");
    process.exit(1);
  }
  return m[0];
}

function getOAuthToken() {
  try {
    return run("npx wrangler oauth token");
  } catch {
    console.error("Gagal ambil token. Jalankan: npx wrangler login");
    process.exit(1);
  }
}

const accountId = getAccountId();
const token = getOAuthToken();
const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;

const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ prompt: "agree" }),
});

const body = await res.json();
if (!res.ok) {
  console.error("Gagal:", JSON.stringify(body, null, 2));
  if (body?.errors?.[0]?.code === 10063) {
    console.error(
      "\n→ Buka https://dash.cloudflare.com → Workers & Pages (sekali saja)\n" +
        "  untuk membuat subdomain workers.dev, lalu jalankan lagi: npm run workers-ai:agree"
    );
  }
  process.exit(1);
}

console.log("Lisensi Meta diterima.", body.result ?? body);

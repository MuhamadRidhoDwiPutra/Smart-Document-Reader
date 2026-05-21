import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

function parseDevVars(): Record<string, string> {
  const out: Record<string, string> = {};
  const path = join(process.cwd(), ".dev.vars");
  if (!existsSync(path)) return out;
  const raw = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const devVars = parseDevVars();

const nextConfig: NextConfig = {
  outputFileTracingRoot: join(process.cwd()),
  env: {
    SESSION_SECRET: devVars.SESSION_SECRET ?? "",
    SEED_SECRET: devVars.SEED_SECRET ?? "",
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();

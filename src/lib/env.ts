import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface AppEnv {
  DB: D1Database;
  UPLOADS: R2Bucket;
  AI: Ai;
  SESSION_SECRET: string;
  SEED_SECRET?: string;
  LOW_CONFIDENCE_THRESHOLD: string;
}

/** Merge .dev.vars from Next dev into Wrangler env. */
function mergeDevSecrets(env: AppEnv): AppEnv {
  if (process.env.SESSION_SECRET && !env.SESSION_SECRET) {
    env.SESSION_SECRET = process.env.SESSION_SECRET;
  }
  if (process.env.SEED_SECRET && !env.SEED_SECRET) {
    env.SEED_SECRET = process.env.SEED_SECRET;
  }
  return env;
}

export function getEnv(): AppEnv {
  const { env } = getCloudflareContext();
  return mergeDevSecrets(env as AppEnv);
}

export function getLowConfidenceThreshold(): number {
  const raw = getEnv().LOW_CONFIDENCE_THRESHOLD ?? "0.7";
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0.7;
}

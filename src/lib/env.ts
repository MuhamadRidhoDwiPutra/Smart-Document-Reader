import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface AppEnv {
  DB: D1Database;
  UPLOADS: R2Bucket;
  GEMINI_API_KEY: string;
  SESSION_SECRET: string;
  SEED_SECRET?: string;
  LOW_CONFIDENCE_THRESHOLD: string;
}

export function getEnv(): AppEnv {
  const { env } = getCloudflareContext();
  return env as AppEnv;
}

export function getLowConfidenceThreshold(): number {
  const raw = getEnv().LOW_CONFIDENCE_THRESHOLD ?? "0.7";
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0.7;
}

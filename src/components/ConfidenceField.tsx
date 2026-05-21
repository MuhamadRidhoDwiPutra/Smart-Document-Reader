"use client";

import type { FieldConfidence } from "@/lib/types";

export function ConfidenceField({
  label,
  fieldKey,
  confidence,
  threshold,
  children,
}: {
  label: string;
  fieldKey: string;
  confidence: FieldConfidence | null;
  threshold: number;
  children: React.ReactNode;
}) {
  const v = confidence?.[fieldKey];
  const low = v !== undefined && v < threshold;
  return (
    <div className="space-y-1">
      <label className="text-sm text-[var(--muted)] flex gap-2 items-center">
        {label}
        {v != null && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${v >= threshold ? "bg-[var(--ok)] bg-opacity-20 text-[var(--ok)]" : "bg-[var(--warn)] bg-opacity-20 text-[var(--warn)]"}`}>
            {Math.round(v * 100)}%
          </span>
        )}
      </label>
      <div className={low ? "low-confidence" : ""}>{children}</div>
    </div>
  );
}

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
        {low && <span className="text-xs text-[var(--warn)]">confidence rendah</span>}
        {v != null && <span className="text-xs opacity-60">({Math.round(v * 100)}%)</span>}
      </label>
      <div className={low ? "low-confidence" : ""}>{children}</div>
    </div>
  );
}

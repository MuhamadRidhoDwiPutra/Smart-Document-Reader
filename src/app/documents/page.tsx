"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Document } from "@/lib/types";

const LABEL: Record<string, string> = {
  uploaded: "Ter-upload",
  processing: "Memproses",
  saved: "Tersimpan",
  failed: "Gagal",
  needs_review: "Perlu review",
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [vendor, setVendor] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (vendor) q.set("vendor", vendor);
    if (dateFrom) q.set("dateFrom", dateFrom);
    if (dateTo) q.set("dateTo", dateTo);
    const res = await fetch(`/api/documents?${q}`);
    const data = await res.json();
    setDocs(data.documents ?? []);
  }, [vendor, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dokumen</h1>
        <Link href="/documents/upload" className="px-4 py-2 rounded bg-[var(--accent)] text-white text-sm">
          Upload
        </Link>
      </div>
      <div className="grid sm:grid-cols-4 gap-3 p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
        <input placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} className="px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] text-sm" />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] text-sm" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] text-sm" />
        <div className="flex gap-2">
          <button type="button" onClick={load} className="flex-1 py-2 border border-[var(--border)] rounded text-sm">Filter</button>
          <button
            type="button"
            onClick={() => {
              const q = new URLSearchParams();
              if (vendor) q.set("vendor", vendor);
              if (dateFrom) q.set("dateFrom", dateFrom);
              if (dateTo) q.set("dateTo", dateTo);
              window.location.href = `/api/documents/export?${q}`;
            }}
            className="flex-1 py-2 border border-[var(--accent)] text-[var(--accent)] rounded text-sm"
          >
            CSV
          </button>
        </div>
      </div>
      {docs.length === 0 ? (
        <p className="text-[var(--muted)]">Belum ada dokumen.</p>
      ) : (
        <table className="w-full text-sm border border-[var(--border)] rounded-lg overflow-hidden">
          <thead className="bg-[var(--card)] text-[var(--muted)]">
            <tr>
              <th className="p-3 text-left">File</th>
              <th className="p-3 text-left">Vendor</th>
              <th className="p-3 text-left">Tanggal</th>
              <th className="p-3 text-left">Total</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-t border-[var(--border)]">
                <td className="p-3">
                  <Link href={`/documents/${d.id}`} className="text-[var(--accent)]">
                    {d.original_filename ?? d.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="p-3">{d.vendor ?? "—"}</td>
                <td className="p-3">{d.document_date ?? "—"}</td>
                <td className="p-3">{d.total != null ? `${d.currency ?? ""} ${d.total}`.trim() : "—"}</td>
                <td className="p-3">{LABEL[d.status] ?? d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

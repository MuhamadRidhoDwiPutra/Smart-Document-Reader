"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Document } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  uploaded: "Ter-upload",
  processing: "Memproses",
  saved: "Tersimpan",
  failed: "Gagal",
  needs_review: "Perlu review",
};

function hasExtractedData(doc: Document): boolean {
  return !!(doc.vendor || doc.document_date || doc.total != null);
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [vendor, setVendor] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (vendor) q.set("vendor", vendor);
    if (dateFrom) q.set("dateFrom", dateFrom);
    if (dateTo) q.set("dateTo", dateTo);
    const res = await fetch(`/api/documents?${q}`);
    const data = await res.json() as { documents?: Document[] };
    setDocs(data.documents ?? []);
  }, [vendor, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string, name: string) {
    const label = name || "dokumen ini";
    if (!confirm(`Hapus ${label}? File dan data ekstraksi akan dihapus permanen.`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      alert("Gagal menghapus dokumen.");
      return;
    }
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dokumen</h1>
        <Link href="/documents/upload" className="px-4 py-2 rounded bg-[var(--accent)] text-white text-sm hover:opacity-90">
          + Upload Resi
        </Link>
      </div>

      {/* Filter */}
      <div className="grid sm:grid-cols-4 gap-3 p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
        <input placeholder="Cari vendor..." value={vendor} onChange={(e) => setVendor(e.target.value)} className="px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] text-sm" />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] text-sm" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] text-sm" />
        <div className="flex gap-2">
          <button type="button" onClick={load} className="flex-1 py-2 border border-[var(--border)] rounded text-sm hover:bg-[var(--border)]">Filter</button>
          <button
            type="button"
            onClick={() => {
              const q = new URLSearchParams();
              if (vendor) q.set("vendor", vendor);
              if (dateFrom) q.set("dateFrom", dateFrom);
              if (dateTo) q.set("dateTo", dateTo);
              window.location.href = `/api/documents/export?${q}`;
            }}
            className="flex-1 py-2 border border-[var(--accent)] text-[var(--accent)] rounded text-sm hover:bg-[var(--accent)] hover:text-white"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Document List */}
      {docs.length === 0 ? (
        <div className="text-center py-12 bg-[var(--card)] border border-[var(--border)] rounded-lg">
          <p className="text-[var(--muted)] mb-2">Belum ada dokumen.</p>
          <Link href="/documents/upload" className="text-[var(--accent)] text-sm hover:underline">Upload resi pertama →</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => {
            const isEmpty = !hasExtractedData(d);
            return (
              <div key={d.id} className={`p-4 bg-[var(--card)] border rounded-lg ${isEmpty ? "border-[var(--warn)] border-opacity-50" : "border-[var(--border)]"}`}>
                <div className="flex items-start justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/documents/${d.id}`} className="text-[var(--accent)] font-medium truncate hover:underline">
                        {d.original_filename ?? "Tanpa nama"}
                      </Link>
                      {isEmpty && (
                        <span className="px-2 py-0.5 text-xs rounded bg-[var(--warn)] text-black font-medium">Kosong</span>
                      )}
                      {!isEmpty && (
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${d.status === "needs_review" ? "bg-[var(--warn)] text-black" : d.status === "failed" ? "bg-[var(--danger)] text-white" : "bg-[var(--ok)] text-white"}`}>
                          {STATUS_LABEL[d.status] ?? d.status}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[var(--muted)] space-y-0.5">
                      {d.vendor ? (
                        <p><span className="text-[var(--text)]">{d.vendor}</span></p>
                      ) : (
                        <p className="italic">Vendor: -</p>
                      )}
                      {d.document_date ? (
                        <p>Tanggal: <span className="text-[var(--text)]">{d.document_date}</span></p>
                      ) : (
                        <p className="italic">Tanggal: -</p>
                      )}
                      {d.total != null ? (
                        <p>Total: <span className="text-[var(--text)] font-medium">{d.currency ?? ""} {d.total.toLocaleString("id-ID")}</span></p>
                      ) : (
                        <p className="italic">Total: -</p>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link href={`/documents/${d.id}`} className="px-3 py-1.5 rounded border border-[var(--accent)] text-[var(--accent)] text-xs text-center hover:bg-[var(--accent)] hover:text-white transition-colors">
                      {isEmpty ? "Isi Data" : "Lihat / Edit"}
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(d.id, d.original_filename ?? "")}
                      disabled={deletingId === d.id}
                      className="px-3 py-1.5 rounded border border-[var(--danger)] text-[var(--danger)] text-xs hover:bg-[var(--danger)] hover:text-white disabled:opacity-50 transition-colors"
                    >
                      {deletingId === d.id ? "…" : "Hapus"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

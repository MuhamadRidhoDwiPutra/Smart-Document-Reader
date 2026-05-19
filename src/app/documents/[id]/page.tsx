"use client";

import { ConfidenceField } from "@/components/ConfidenceField";
import type { Document, FieldConfidence, LineItem } from "@/lib/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const TH = 0.7;

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<(Document & { line_items: LineItem[] }) | null>(null);
  const [vendor, setVendor] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [total, setTotal] = useState("");
  const [currency, setCurrency] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [confidence, setConfidence] = useState<FieldConfidence | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/documents/${id}`);
    if (!res.ok) return;
    const { document } = await res.json();
    setDoc(document);
    setVendor(document.vendor ?? "");
    setDocumentDate(document.document_date ?? "");
    setTotal(document.total != null ? String(document.total) : "");
    setCurrency(document.currency ?? "");
    setLineItems(document.line_items ?? []);
    setConfidence(document.field_confidence);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    const res = await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendor: vendor || null,
        document_date: documentDate || null,
        total: total ? parseFloat(total) : null,
        currency: currency || null,
        line_items: lineItems.map((li) => ({
          id: li.id,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          amount: li.amount,
        })),
      }),
    });
    setMsg(res.ok ? "Tersimpan." : "Gagal.");
    if (res.ok) load();
  }

  if (!doc) return <p className="text-[var(--muted)]">Memuat…</p>;

  return (
    <div className="space-y-6">
      <Link href="/documents" className="text-sm text-[var(--accent)]">← Kembali</Link>
      {doc.status === "failed" && (
        <div className="p-4 border border-[var(--danger)] rounded text-sm">
          {doc.error_message ?? "Ekstraksi gagal."}
        </div>
      )}
      {doc.status === "needs_review" && (
        <div className="p-4 border border-[var(--warn)] rounded text-sm">
          Periksa field bertanda confidence rendah.
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          {doc.mime_type === "application/pdf" ? (
            <iframe src={`/api/documents/${id}/file`} className="w-full h-[480px]" title="PDF" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/documents/${id}/file`} alt="" className="w-full max-h-[480px] object-contain" />
          )}
        </div>
        <div className="space-y-4 p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
          <ConfidenceField label="Vendor" fieldKey="vendor" confidence={confidence} threshold={TH}>
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} className="w-full px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)]" />
          </ConfidenceField>
          <ConfidenceField label="Tanggal" fieldKey="document_date" confidence={confidence} threshold={TH}>
            <input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} className="w-full px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)]" />
          </ConfidenceField>
          <ConfidenceField label="Total" fieldKey="total" confidence={confidence} threshold={TH}>
            <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} className="w-full px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)]" />
          </ConfidenceField>
          <ConfidenceField label="Mata uang" fieldKey="currency" confidence={confidence} threshold={TH}>
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)]" />
          </ConfidenceField>
          {lineItems.map((li, i) => (
            <div key={li.id} className="grid grid-cols-2 gap-2">
              <input placeholder="Deskripsi" value={li.description ?? ""} onChange={(e) => {
                const n = [...lineItems];
                n[i] = { ...n[i], description: e.target.value };
                setLineItems(n);
              }} className="px-2 py-1 rounded bg-[var(--bg)] border border-[var(--border)] text-sm" />
              <input type="number" placeholder="Jumlah" value={li.amount ?? ""} onChange={(e) => {
                const n = [...lineItems];
                n[i] = { ...n[i], amount: e.target.value ? parseFloat(e.target.value) : null };
                setLineItems(n);
              }} className="px-2 py-1 rounded bg-[var(--bg)] border border-[var(--border)] text-sm" />
            </div>
          ))}
          <button type="button" onClick={save} className="w-full py-2 rounded bg-[var(--ok)] text-white">
            Simpan koreksi
          </button>
          {msg && <p className="text-sm text-center">{msg}</p>}
        </div>
      </div>
    </div>
  );
}

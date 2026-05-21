"use client";

import { ConfidenceField } from "@/components/ConfidenceField";
import { formatExtractionError } from "@/lib/errors";
import type { Document, FieldConfidence, LineItem } from "@/lib/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const TH = 0.7;

interface FormData {
  vendor: string;
  documentDate: string;
  total: string;
  currency: string;
  lineItems: Array<{
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }>;
}

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<(Document & { line_items: LineItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormData>({
    vendor: "",
    documentDate: "",
    total: "",
    currency: "",
    lineItems: [],
  });
  const [confidence, setConfidence] = useState<FieldConfidence | null>(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error" | "info">("info");
  const [reprocessing, setReprocessing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Map extracted data to form fields
  const mapToForm = useCallback((document: Document & { line_items: LineItem[] }) => {
    setForm({
      vendor: document.vendor ?? "",
      documentDate: document.document_date ?? "",
      total: document.total != null ? String(document.total) : "",
      currency: document.currency ?? "",
      lineItems: (document.line_items ?? []).map((li) => ({
        id: li.id,
        description: li.description ?? "",
        quantity: li.quantity?.toString() ?? "",
        unitPrice: li.unit_price?.toString() ?? "",
        amount: li.amount?.toString() ?? "",
      })),
    });
    setConfidence(document.field_confidence ?? null);
    setHasChanges(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/documents/${id}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json() as { document: Document & { line_items: LineItem[] } };
    setDoc(data.document);
    mapToForm(data.document);
    setLoading(false);
  }, [id, mapToForm]);

  useEffect(() => {
    load();
  }, [load]);

  // Update field values
  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateLineItem = (index: number, field: keyof FormData["lineItems"][0], value: string) => {
    setForm((prev) => {
      const newItems = [...prev.lineItems];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, lineItems: newItems };
    });
    setHasChanges(true);
  };

  async function save() {
    setSaving(true);
    setMsg("");

    // Build the payload
    const payload = {
      vendor: form.vendor || null,
      document_date: form.documentDate || null,
      total: form.total ? parseFloat(form.total) : null,
      currency: form.currency || null,
      line_items: form.lineItems.map((li) => ({
        description: li.description || null,
        quantity: li.quantity ? parseFloat(li.quantity) : null,
        unit_price: li.unitPrice ? parseFloat(li.unitPrice) : null,
        amount: li.amount ? parseFloat(li.amount) : null,
      })),
    };

    console.log("[ReviewPage] Saving payload:", JSON.stringify(payload, null, 2));

    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("[ReviewPage] Response status:", res.status);

      if (res.ok) {
        const responseData = await res.json() as { document: Document & { line_items: LineItem[] } };
        console.log("[ReviewPage] Save successful, document:", responseData.document?.id);
        setMsg("Data berhasil disimpan!");
        setMsgType("success");
        setHasChanges(false);
        setDoc(responseData.document);
        // Update form with saved data
        mapToForm(responseData.document);
        // Redirect to dashboard after successful save
        router.push("/documents");
      } else {
        const errorData = await res.json() as { error?: string };
        console.error("[ReviewPage] Save failed:", errorData);
        setMsg(errorData.error || "Gagal menyimpan data.");
        setMsgType("error");
      }
    } catch (err) {
      console.error("[ReviewPage] Save error:", err);
      setMsg("Terjadi kesalahan saat menyimpan. Silakan coba lagi.");
      setMsgType("error");
    } finally {
      setSaving(false);
    }
  }

  async function removeDoc() {
    const name = doc?.original_filename ?? "dokumen ini";
    if (!confirm(`Hapus ${name}? File dan data ekstraksi akan dihapus permanen.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      setMsg("Gagal menghapus dokumen.");
      setMsgType("error");
      return;
    }
    router.push("/documents");
  }

  async function reprocess() {
    setReprocessing(true);
    setMsg("");
    const res = await fetch(`/api/documents/${id}/reprocess`, { method: "POST" });
    setReprocessing(false);
    if (!res.ok) {
      setMsg("Ekstraksi ulang gagal.");
      setMsgType("error");
      return;
    }
    await load();
    setMsg("Ekstraksi selesai. Periksa hasil di bawah.");
    setMsgType("info");
  }

  function addLineItem() {
    setForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { id: crypto.randomUUID(), description: "", quantity: "", unitPrice: "", amount: "" },
      ],
    }));
    setHasChanges(true);
  }

  function removeLineItem(index: number) {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-3 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-[var(--muted)]">Memuat data dokumen...</p>
      </div>
    </div>
  );

  if (!doc) return (
    <div className="text-center py-12">
      <p className="text-[var(--danger)]">Dokumen tidak ditemukan.</p>
      <Link href="/documents" className="text-[var(--accent)] mt-2 inline-block">← Kembali</Link>
    </div>
  );

  const isExtracted = !!(doc.vendor || doc.document_date || doc.total != null);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/documents" className="text-sm text-[var(--accent)] hover:underline">← Kembali</Link>
          <span className="text-[var(--muted)]">|</span>
          <span className="text-sm text-[var(--muted)] truncate max-w-[200px]">{doc.original_filename ?? "Dokumen"}</span>
        </div>
        <button
          type="button"
          onClick={removeDoc}
          disabled={deleting}
          className="px-3 py-1.5 rounded border border-[var(--danger)] text-[var(--danger)] text-sm hover:bg-[var(--danger)] hover:text-white disabled:opacity-50 transition-colors"
        >
          {deleting ? "Menghapus…" : "Hapus"}
        </button>
      </div>

      {/* Info Banner - hanya tampil jika ada data hasil ekstraksi */}
      {isExtracted && (
        <div className="p-4 bg-[var(--accent)] bg-opacity-10 border border-[var(--accent)] rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)] bg-opacity-20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-[var(--accent)] mb-1">Data Hasil Ekstraksi Otomatis</h3>
              <p className="text-sm text-[var(--muted)]">
                Data di bawah sudah diisi otomatis oleh AI. Silakan periksa dan ubah jika perlu, lalu klik <strong>"Simpan"</strong> untuk menyimpan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Failed Status */}
      {doc.status === "failed" && (
        <div className="p-4 bg-[var(--danger)] bg-opacity-10 border border-[var(--danger)] rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-medium text-[var(--danger)] mb-1">Ekstraksi Gagal</h3>
              <p className="text-sm text-[var(--muted)]">{formatExtractionError(doc.error_message)}</p>
            </div>
            <button
              type="button"
              onClick={reprocess}
              disabled={reprocessing}
              className="px-4 py-2 rounded bg-[var(--accent)] text-white text-sm disabled:opacity-50 whitespace-nowrap"
            >
              {reprocessing ? "Memproses..." : "Coba Lagi"}
            </button>
          </div>
        </div>
      )}

      {/* Message */}
      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msgType === "success" ? "bg-[var(--ok)] bg-opacity-10 text-[var(--ok)] border border-[var(--ok)]" : msgType === "error" ? "bg-[var(--danger)] bg-opacity-10 text-[var(--danger)] border border-[var(--danger)]" : "bg-[var(--accent)] bg-opacity-10 text-[var(--accent)] border border-[var(--accent)]"}`}>
          {msg}
        </div>
      )}

      {/* Main Content */}
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Image Preview */}
        <div className="lg:col-span-2 border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="p-3 bg-[var(--card)] border-b border-[var(--border)]">
            <h3 className="text-sm font-medium text-[var(--muted)]">Gambar Resi</h3>
          </div>
          {doc.mime_type === "application/pdf" ? (
            <iframe src={`/api/documents/${id}/file`} className="w-full h-[400px]" title="PDF" />
          ) : (
            <img src={`/api/documents/${id}/file`} alt="Receipt preview" className="w-full h-[400px] object-contain bg-[var(--bg)]" />
          )}
        </div>

        {/* Form - Data Dokumen */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-lg">
            <h3 className="text-lg font-medium mb-4">Data Dokumen</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <ConfidenceField label="Vendor / Toko" fieldKey="vendor" confidence={confidence} threshold={TH}>
                <input
                  value={form.vendor}
                  onChange={(e) => updateField("vendor", e.target.value)}
                  placeholder="Contoh: Alfamart"
                  className="w-full px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)]"
                />
              </ConfidenceField>

              <ConfidenceField label="Tanggal" fieldKey="document_date" confidence={confidence} threshold={TH}>
                <input
                  type="date"
                  value={form.documentDate}
                  onChange={(e) => updateField("documentDate", e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)]"
                />
              </ConfidenceField>

              <ConfidenceField label="Total" fieldKey="total" confidence={confidence} threshold={TH}>
                <input
                  type="number"
                  value={form.total}
                  onChange={(e) => updateField("total", e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)]"
                />
              </ConfidenceField>

              <ConfidenceField label="Mata Uang" fieldKey="currency" confidence={confidence} threshold={TH}>
                <select
                  value={form.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)]"
                >
                  <option value="">Pilih...</option>
                  <option value="IDR">IDR - Rupiah</option>
                  <option value="USD">USD - Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - Pound</option>
                </select>
              </ConfidenceField>
            </div>
          </div>

          {/* Line Items */}
          <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Item (Opsional)</h3>
              <button
                type="button"
                onClick={addLineItem}
                className="px-3 py-1 text-sm rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
              >
                + Tambah Item
              </button>
            </div>

            {form.lineItems.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-4">Belum ada item. Klik "+ Tambah Item" untuk menambahkan.</p>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-xs text-[var(--muted)] px-2">
                  <span className="col-span-1">#</span>
                  <span className="col-span-4">Deskripsi</span>
                  <span className="col-span-2">Qty</span>
                  <span className="col-span-2">Harga</span>
                  <span className="col-span-2">Total</span>
                  <span className="col-span-1"></span>
                </div>
                {form.lineItems.map((li, i) => (
                  <div key={li.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-[var(--bg)] rounded">
                    <span className="col-span-1 text-xs text-[var(--muted)]">{i + 1}</span>
                    <input
                      placeholder="Deskripsi item"
                      value={li.description}
                      onChange={(e) => updateLineItem(i, "description", e.target.value)}
                      className="col-span-4 px-2 py-1.5 rounded bg-[var(--card)] border border-[var(--border)] text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={li.quantity}
                      onChange={(e) => updateLineItem(i, "quantity", e.target.value)}
                      className="col-span-2 px-2 py-1.5 rounded bg-[var(--card)] border border-[var(--border)] text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Harga"
                      value={li.unitPrice}
                      onChange={(e) => updateLineItem(i, "unitPrice", e.target.value)}
                      className="col-span-2 px-2 py-1.5 rounded bg-[var(--card)] border border-[var(--border)] text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Total"
                      value={li.amount}
                      onChange={(e) => updateLineItem(i, "amount", e.target.value)}
                      className="col-span-2 px-2 py-1.5 rounded bg-[var(--card)] border border-[var(--border)] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeLineItem(i)}
                      className="col-span-1 px-2 py-1.5 text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white rounded text-center font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reprocess}
              disabled={reprocessing}
              className="flex-1 py-3 rounded border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--border)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {reprocessing ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-[var(--muted)] border-t-transparent rounded-full" />
                  Memproses...
                </>
              ) : (
                "🔄 Ekstrak Ulang"
              )}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !hasChanges}
              className="flex-1 py-3 rounded bg-[var(--ok)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Menyimpan...
                </>
              ) : (
                "💾 Simpan Data"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

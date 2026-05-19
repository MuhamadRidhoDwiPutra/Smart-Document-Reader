"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/documents/upload", { method: "POST", body: form });
    setLoading(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Gagal");
      return;
    }
    const { id } = await res.json();
    router.push(`/documents/${id}`);
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Upload resi</h1>
      <form onSubmit={onSubmit} className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg space-y-4">
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        <button type="submit" disabled={loading} className="w-full py-2 rounded bg-[var(--accent)] text-white disabled:opacity-50">
          {loading ? "Memproses…" : "Upload & ekstrak"}
        </button>
      </form>
    </div>
  );
}

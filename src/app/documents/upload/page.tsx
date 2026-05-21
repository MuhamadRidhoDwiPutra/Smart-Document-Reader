"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STEPS = [
  { key: "upload", label: "Upload file" },
  { key: "processing", label: "Ekstraksi AI..." },
  { key: "done", label: "Selesai" },
];

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    setCurrentStep(1);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Gagal");
        setLoading(false);
        setCurrentStep(0);
        return;
      }

      const data = await res.json() as { id: string };
      setCurrentStep(2);
      setTimeout(() => {
        router.push(`/documents/${data.id}`);
      }, 500);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
      setCurrentStep(0);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      setError("File terlalu besar. Maks 10 MB.");
      return;
    }
    setError("");
    setFile(selectedFile ?? null);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Upload Resi</h1>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i < currentStep || (i === 2 && currentStep === 2)
                ? "bg-[var(--ok)] text-white"
                : i === currentStep
                ? "bg-[var(--accent)] text-white animate-pulse"
                : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]"
            }`}>
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span className={`ml-2 text-sm ${i <= currentStep ? "text-[var(--text)]" : "text-[var(--muted)]"}`}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 mx-2 ${i < currentStep ? "bg-[var(--ok)]" : "bg-[var(--border)]"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Upload Form */}
      <form onSubmit={onSubmit} className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg space-y-4">
        {error && (
          <div className="p-3 bg-[var(--danger)] bg-opacity-10 border border-[var(--danger)] rounded text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="block">
            <span className="text-sm text-[var(--muted)]">Pilih file gambar resi</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={loading}
              required
              className="mt-1 w-full px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-[var(--accent)] file:text-white file:cursor-pointer disabled:opacity-50"
            />
          </label>
          <p className="text-xs text-[var(--muted)]">
            Format: JPG, PNG, WebP (foto struk). Maks 10 MB.
          </p>
        </div>

        {file && (
          <div className="p-3 bg-[var(--bg)] rounded border border-[var(--border)]">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-[var(--muted)]">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        )}

        {currentStep === 1 && (
          <div className="p-4 bg-[var(--accent)] bg-opacity-10 border border-[var(--accent)] rounded-lg text-center">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-[var(--accent)]">
              AI sedang membaca dan mengekstrak data dari gambar...
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
              Ini mungkin memakan waktu beberapa detik
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full py-3 rounded bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Memproses...
            </span>
          ) : (
            "Upload & Ekstrak Otomatis"
          )}
        </button>
      </form>

      {/* Tips */}
      <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
        <h3 className="text-sm font-medium mb-2">Tips untuk hasil terbaik:</h3>
        <ul className="text-xs text-[var(--muted)] space-y-1 list-disc list-inside">
          <li>Gunakan foto dengan pencahayaan yang jelas</li>
          <li>Pastikan teks pada resi terbaca</li>
          <li>Hindari foto yang buram atau miring</li>
          <li>Resolusi tinggi memberikan hasil lebih baik</li>
        </ul>
      </div>
    </div>
  );
}
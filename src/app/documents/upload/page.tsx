"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { convertPdfToImage, isPdfFile, validatePdfFile } from "@/lib/pdf";

const STEPS = [
  { key: "upload", label: "Upload file" },
  { key: "converting", label: "Konversi PDF..." },
  { key: "processing", label: "Ekstraksi AI..." },
  { key: "done", label: "Selesai" },
];

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isConverting, setIsConverting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    setCurrentStep(1);

    // Check if it's a PDF that needs conversion
    if (isPdfFile(file)) {
      console.log("[Upload] PDF detected, checking file...");
      const validation = validatePdfFile(file);
      if (!validation.valid) {
        setError(validation.error || "Invalid PDF file");
        setLoading(false);
        setCurrentStep(0);
        return;
      }
    }

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("original_filename", originalFile?.name || file.name);
      form.append("original_mime_type", originalFile?.type || file.type);

      console.log("[Upload] Uploading file:", file.name, "Type:", file.type);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Gagal");
        setLoading(false);
        setCurrentStep(0);
        return;
      }

      const data = await res.json() as { id: string };
      setCurrentStep(3);
      setTimeout(() => {
        router.push(`/documents/${data.id}`);
      }, 500);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
      setCurrentStep(0);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Reset state
    setError("");
    setFile(null);
    setOriginalFile(null);
    setIsConverting(false);
    setCurrentStep(0);

    // Check if it's a PDF
    if (isPdfFile(selectedFile)) {
      console.log("[Upload] PDF file selected:", selectedFile.name);

      // Validate PDF
      const validation = validatePdfFile(selectedFile);
      if (!validation.valid) {
        setError(validation.error || "Invalid PDF file");
        return;
      }

      // Check file size
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File terlalu besar. Maks 10 MB.");
        return;
      }

      // Start PDF conversion
      setIsConverting(true);
      setCurrentStep(1);

      try {
        console.log("[Upload] Starting PDF conversion...");
        const convertedImage = await convertPdfToImage(selectedFile, 2.0);
        console.log("[Upload] PDF conversion successful:", convertedImage.name);

        // Store original file info and use converted image
        setOriginalFile(selectedFile);
        setFile(convertedImage);
        setIsConverting(false);
        setCurrentStep(0);
      } catch (err) {
        console.error("[Upload] PDF conversion failed:", err);
        setError("Gagal mengkonversi PDF. Pastikan file PDF valid.");
        setIsConverting(false);
        setCurrentStep(0);
        return;
      }
    } else {
      // Regular image file
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File terlalu besar. Maks 10 MB.");
        return;
      }
      setFile(selectedFile);
    }
  }

  const isPdf = originalFile && isPdfFile(originalFile);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Upload Resi</h1>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < currentStep || (i === 3 && currentStep === 3)
                  ? "bg-[var(--ok)] text-white"
                  : i === currentStep
                  ? "bg-[var(--accent)] text-white animate-pulse"
                  : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span
              className={`ml-2 text-sm ${i <= currentStep ? "text-[var(--text)]" : "text-[var(--muted)]"}`}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-2 ${i < currentStep ? "bg-[var(--ok)]" : "bg-[var(--border)]"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Upload Form */}
      <form
        onSubmit={onSubmit}
        className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg space-y-4"
      >
        {error && (
          <div className="p-3 bg-[var(--danger)] bg-opacity-10 border border-[var(--danger)] rounded text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="block">
            <span className="text-sm text-[var(--muted)]">
              Pilih file gambar atau PDF resi
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              disabled={loading || isConverting}
              required
              className="mt-1 w-full px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-[var(--accent)] file:text-white file:cursor-pointer disabled:opacity-50"
            />
          </label>
          <p className="text-xs text-[var(--muted)]">
            Format: JPG, PNG, WebP, PDF (foto struk). Maks 10 MB.
          </p>
        </div>

        {/* PDF Conversion Loading */}
        {isConverting && (
          <div className="p-4 bg-[var(--accent)] bg-opacity-10 border border-[var(--accent)] rounded-lg text-center">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-[var(--accent)]">
              Mengkonversi PDF ke gambar...
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
              Halaman pertama sedang diproses
            </p>
          </div>
        )}

        {/* Selected File Info */}
        {file && !isConverting && (
          <div className="p-3 bg-[var(--bg)] rounded border border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {file.type === "application/pdf" ? "📄" : "🖼️"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                {isPdf && (
                  <p className="text-xs text-[var(--accent)]">
                    (dikirim sebagai gambar PNG)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Processing Loading */}
        {currentStep === 2 && (
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
          disabled={loading || !file || isConverting}
          className="w-full py-3 rounded bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Memproses...
            </span>
          ) : isConverting ? (
            "Mengkonversi PDF..."
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
          <li>PDF akan dikonversi ke gambar secara otomatis</li>
        </ul>
      </div>
    </div>
  );
}
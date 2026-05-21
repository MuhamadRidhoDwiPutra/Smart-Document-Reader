"use client";

import { useState, ChangeEvent, FormEvent } from "react";

interface FileUploadProps {
  onSuccess?: (id: string) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number;
  label?: string;
  helperText?: string;
  endpoint?: string;
}

export default function FileUpload({
  onSuccess,
  onError,
  accept = "image/jpeg,image/png,image/webp",
  maxSize = 10 * 1024 * 1024,
  label = "Upload file",
  helperText = "Supported formats: JPG, PNG, WebP (max 10 MB)",
  endpoint = "/api/documents/upload",
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size
    if (selectedFile.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      const errorMsg = `File size exceeds ${maxSizeMB}MB limit`;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setError("");
    setFile(selectedFile);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setProgress(0);
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: form,
      });

      setProgress(100);

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        const errorMsg = data.error ?? "Upload failed";
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      const data = await res.json() as { id: string };
      setFile(null);
      setError("");
      onSuccess?.(data.id);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg space-y-4">
        <h2 className="text-lg font-semibold">{label}</h2>

        {error && (
          <p className="text-sm text-[var(--danger)] bg-red-50 dark:bg-red-950 p-3 rounded">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={loading}
            required
            className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] disabled:opacity-50"
          />
          <p className="text-xs text-[var(--muted)]">{helperText}</p>
        </div>

        {file && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Selected: {file.name}
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              Size: {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
        )}

        {progress > 0 && progress < 100 && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-[var(--accent)] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full py-2 rounded bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? "Uploading…" : "Upload"}
        </button>
      </div>
    </form>
  );
}

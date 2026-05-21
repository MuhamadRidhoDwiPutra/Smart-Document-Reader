/** Pesan singkat untuk ditampilkan di UI / simpan ke D1. */
export function formatExtractionError(err: unknown): string {
  const raw =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : "Ekstraksi gagal.";

  if (!raw.trim()) return "Ekstraksi gagal.";

  if (/Workers AI binding|binding tidak tersedia/i.test(raw)) {
    return "Workers AI belum dikonfigurasi. Tambahkan binding AI di wrangler.jsonc lalu restart npm run dev.";
  }
  if (/agree|license|acceptable use/i.test(raw)) {
    return "Setujui lisensi Meta untuk model vision (jalankan npm run workers-ai:agree sekali).";
  }
  if (
    raw.includes("429") ||
    /quota|too many requests|rate limit|neurons/i.test(raw)
  ) {
    return "Kuota Workers AI habis untuk hari ini. Coba lagi besok atau kurangi jumlah ekstraksi.";
  }
  if (raw.includes("GEMINI")) {
    return "Konfigurasi AI sudah pindah ke Workers AI. Hapus GEMINI_API_KEY; tidak diperlukan lagi.";
  }

  return raw.length > 160 ? `${raw.slice(0, 160)}…` : raw;
}

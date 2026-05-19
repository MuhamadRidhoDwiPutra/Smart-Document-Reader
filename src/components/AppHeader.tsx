"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function AppHeader({ email }: { email?: string }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 flex justify-between items-center">
      <Link href="/documents" className="font-semibold">
        Smart Document Reader
      </Link>
      <nav className="flex gap-4 text-sm text-[var(--muted)] items-center">
        <Link href="/documents">Dokumen</Link>
        <Link href="/documents/upload">Upload</Link>
        {email && <span>{email}</span>}
        <button type="button" onClick={logout} className="text-[var(--accent)]">
          Keluar
        </button>
      </nav>
    </header>
  );
}

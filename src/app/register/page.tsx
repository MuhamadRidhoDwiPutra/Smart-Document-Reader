"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Gagal");
      return;
    }
    router.push("/documents");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
        <h1 className="text-xl font-semibold">Daftar</h1>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)]" required />
        <input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)]" required />
        <button type="submit" className="w-full py-2 rounded bg-[var(--accent)] text-white">Daftar</button>
        <p className="text-sm text-center text-[var(--muted)]">
          <Link href="/login" className="text-[var(--accent)]">Masuk</Link>
        </p>
      </form>
    </main>
  );
}

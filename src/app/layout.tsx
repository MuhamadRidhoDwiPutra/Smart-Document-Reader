import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Document Reader",
  description: "Receipt extraction with Gemini Vision on Cloudflare",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}

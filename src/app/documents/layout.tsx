import { AppHeader } from "@/components/AppHeader";
import { getCurrentUser } from "@/lib/auth";
import { headers } from "next/headers";

export default async function DocumentsLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const user = await getCurrentUser(
    new Request("http://local", { headers: { cookie: h.get("cookie") ?? "" } })
  );
  return (
    <>
      <AppHeader email={user?.email} />
      <main className="max-w-5xl mx-auto p-4">{children}</main>
    </>
  );
}

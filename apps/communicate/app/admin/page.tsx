import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { BASE_PATH } from "@/lib/basePath";

export const metadata: Metadata = { title: "Admin — සුවණ Suvana" };

/**
 * Platform administration.
 *
 * Server-guarded as well as proxy-guarded: the proxy keeps unauthenticated
 * users out, and this check keeps signed-in non-admins out. Both matter —
 * the proxy only knows "is there a session", because it runs on the edge
 * runtime where the database is not reachable.
 */
export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect(`${BASE_PATH}/login`);
  if (session.user.role !== "admin") redirect(`${BASE_PATH}/dashboard`);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-foreground-muted">Suvana</p>
        <h1 className="mt-1 text-3xl font-semibold">Administration</h1>
        <p className="mt-2 max-w-2xl text-foreground-muted">
          Accounts and privileges across the platform. Administrators can manage sign animations
          and avatar models; everyone else can use every module but cannot change shared content.
        </p>
      </header>

      <AdminUsers />
    </div>
  );
}

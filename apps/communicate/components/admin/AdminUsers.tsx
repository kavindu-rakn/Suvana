"use client";

import { useCallback, useEffect, useState } from "react";
import { apiPath } from "@/lib/basePath";
import { buttonVariants } from "@/components/ui/Button";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
  /** Named in ADMIN_EMAILS — its role cannot be changed from here. */
  pinned: boolean;
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiPath("/api/admin/users"));
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setRole(user: AdminUser, role: "user" | "admin") {
    setBusyId(user.id);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(apiPath("/api/admin/users"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, role }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
      setNote(`${user.name} is now ${role === "admin" ? "an administrator" : "a standard user"}. ${data?.note ?? ""}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change that role.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="text-foreground-muted">Loading accounts…</p>;

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Accounts</h2>
        <span className="text-sm text-foreground-muted">
          {users.length} {users.length === 1 ? "account" : "accounts"}
        </span>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-border bg-background-elevated p-3 text-sm text-red-400">
          {error}
        </p>
      )}
      {note && (
        <p className="mb-4 rounded-lg border border-border bg-background-elevated p-3 text-sm text-accent">
          {note}
        </p>
      )}

      {users.length === 0 ? (
        <p className="text-foreground-muted">No accounts yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-background-elevated text-foreground-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 text-foreground-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.role === "admin"
                          ? "rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent"
                          : "rounded-full bg-foreground/10 px-2.5 py-1 text-xs text-foreground-muted"
                      }
                    >
                      {u.role}
                    </span>
                    {u.pinned && (
                      <span className="ml-2 text-xs text-foreground-muted">via ADMIN_EMAILS</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.pinned ? (
                      <span className="text-xs text-foreground-muted">
                        Managed by configuration
                      </span>
                    ) : (
                      <button
                        className={buttonVariants("ghost", "md")}
                        disabled={busyId === u.id}
                        onClick={() => void setRole(u, u.role === "admin" ? "user" : "admin")}
                      >
                        {busyId === u.id
                          ? "Saving…"
                          : u.role === "admin"
                            ? "Make standard user"
                            : "Make administrator"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-foreground-muted">
        A role change reaches that person the next time they sign in, because the role travels in
        their session token.
      </p>
    </section>
  );
}

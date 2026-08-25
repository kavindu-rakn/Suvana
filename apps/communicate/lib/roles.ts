import type { Role } from "@/models/User";

/**
 * How the first admin comes to exist.
 *
 * Roles are stored on the user document, but that creates a bootstrap
 * problem: a fresh database has no admin, and only an admin can promote
 * anyone. Rather than a seed script someone has to remember to run (or a
 * "first account wins" rule, which hands the platform to whoever registers
 * first), the deployment names its admins by email.
 *
 * `ADMIN_EMAILS` is a comma-separated list. A listed email is treated as an
 * admin from the moment it signs in, whatever the database says, and the
 * database is updated to match so the admin list and the stored role do not
 * silently disagree. Removing an email from the list demotes on next sign-in.
 *
 * Server-only: this reads a non-public env var, so it must never be imported
 * into a client component.
 */
export function isBootstrapAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

/** The role a user should have, given what the database says and the env list. */
export function effectiveRole(storedRole: Role | undefined, email: string | null | undefined): Role {
  if (isBootstrapAdmin(email)) return "admin";
  return storedRole ?? "user";
}

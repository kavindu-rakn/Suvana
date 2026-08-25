import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Guard for endpoints that change shared platform data.
 *
 * The original README flagged this gap explicitly: every `/api/animations*`
 * and `/api/models` write only checked "is someone logged in", so any account
 * that could register could also replace the sign animations and the avatar
 * every learner sees. Registration is open, so that was effectively public
 * write access to the platform's content.
 *
 * Returns a response to send when the caller is not an admin, or null when
 * they are and the handler should continue.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    // 403, not 401: they are authenticated, they are simply not allowed.
    return NextResponse.json(
      { error: "This action is restricted to Suvana administrators." },
      { status: 403 }
    );
  }
  return null;
}

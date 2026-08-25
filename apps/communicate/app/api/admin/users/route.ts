import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/db";
import UserModel, { ROLES } from "@/models/User";
import { isBootstrapAdmin } from "@/lib/roles";

/** Everyone with a Suvana account, newest first. Admin-only. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  await connectDB();
  const users = await UserModel.find()
    // Never ship password hashes to a client, even an admin's.
    .select("name email role createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    users: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role ?? "user",
      createdAt: u.createdAt,
      // A role pinned by ADMIN_EMAILS cannot be changed from the UI — the
      // env list would just reinstate it on next sign-in. Saying so is
      // kinder than letting the change appear to work and silently revert.
      pinned: isBootstrapAdmin(u.email),
    })),
  });
}

const PatchSchema = z.object({
  id: z.string().min(1),
  role: z.enum(ROLES),
});

/** Promote or demote an account. Admin-only. */
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const session = await auth();
  const { id, role } = parsed.data;

  // Removing your own admin rights logs you out of the admin area with no way
  // back in unless another admin exists — a foot-gun worth refusing outright.
  if (session?.user?.id === id && role !== "admin") {
    return NextResponse.json(
      { error: "You cannot remove your own admin role. Ask another admin to do it." },
      { status: 400 }
    );
  }

  await connectDB();
  const user = await UserModel.findById(id);
  if (!user) {
    return NextResponse.json({ error: "No such user" }, { status: 404 });
  }

  if (isBootstrapAdmin(user.email) && role !== "admin") {
    return NextResponse.json(
      {
        error:
          "This account is named in ADMIN_EMAILS, so it would be made admin again on its next sign-in. Remove it from that list instead.",
      },
      { status: 409 }
    );
  }

  user.role = role;
  await user.save();

  // The role rides in the JWT, so it only reaches the affected user on their
  // next sign-in. Told plainly rather than left as a surprise.
  return NextResponse.json({
    ok: true,
    role,
    note: "Takes effect for that user the next time they sign in.",
  });
}

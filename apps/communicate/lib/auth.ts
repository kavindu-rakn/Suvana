import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import UserModel from "@/models/User";
import type { Role } from "@/models/User";
import { effectiveRole } from "@/lib/roles";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === "string" ? credentials.email : undefined;
        const password =
          typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;

        await connectDB();
        const user = await UserModel.findOne({ email: email.toLowerCase() });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // The env admin list wins over the stored role, and the document is
        // corrected to match so the two can never silently disagree. This is
        // also how the very first admin comes to exist — see lib/roles.ts.
        const role = effectiveRole(user.role as Role | undefined, user.email);
        if (role !== user.role) {
          user.role = role;
          await user.save();
        }

        return { id: user._id.toString(), name: user.name, email: user.email, role };
      },
    }),
  ],
});

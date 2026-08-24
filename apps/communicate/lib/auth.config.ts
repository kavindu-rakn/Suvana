import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (no Mongoose/bcrypt here — those need the Node
 * runtime). This is shared by both `lib/auth.ts` (full config, used in API
 * routes / server components) and `middleware.ts` (runs on the edge runtime,
 * only needs to read the JWT and decide whether a route is allowed).
 */
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      if (pathname.startsWith("/dashboard")) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    },
  },
};

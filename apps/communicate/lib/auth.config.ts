import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/models/User";
import { BASE_PATH } from "@/lib/basePath";

/**
 * Edge-safe Auth.js config (no Mongoose/bcrypt here — those need the Node
 * runtime). This is shared by both `lib/auth.ts` (full config, used in API
 * routes / server components) and `middleware.ts` (runs on the edge runtime,
 * only needs to read the JWT and decide whether a route is allowed).
 *
 * One-domain topology note (see lib/basePath.ts): Next strips its basePath
 * BEFORE the route handler runs, so Auth.js server-side must keep its default
 * "/api/auth" — do NOT set `basePath` here (it 400s every auth request with
 * UnknownAction). Only browser-facing URLs carry the prefix: `pages.signIn`
 * below (a redirect the browser follows) and the SessionProvider's basePath
 * in components/Providers.tsx (URLs the client fetches).
 */
export const authConfig: NextAuthConfig = {
  pages: { signIn: `${BASE_PATH}/login` },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // Both are "must be signed in". The admin area's *role* check cannot
      // happen here — this runs on the edge runtime, where the database is
      // not reachable — so app/admin/page.tsx re-checks server-side.
      if (pathname.startsWith("/dashboard")) return isLoggedIn;
      if (pathname.startsWith("/admin")) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      if (user?.role) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      // Defaulting here rather than trusting the token to carry it: a session
      // minted before roles existed would otherwise arrive with role
      // undefined, and `undefined !== "admin"` is the safe way for that to
      // fail, but only if something actually sets the field.
      // Cast for the same reason `token.id` above is cast: the JWT interface
      // carries an index signature, so an augmented field still widens here.
      if (session.user) session.user.role = (token.role as Role | undefined) ?? "user";
      return session;
    },
  },
};

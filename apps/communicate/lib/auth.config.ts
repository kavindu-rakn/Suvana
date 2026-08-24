import type { NextAuthConfig } from "next-auth";
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

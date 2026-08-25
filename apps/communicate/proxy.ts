import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Proxy (formerly "middleware") is Next.js 16's request-boundary file
// convention. Uses the edge-safe auth config: no Mongoose/bcrypt here,
// it just decodes the JWT and runs the `authorized` callback.
const { auth } = NextAuth(authConfig);

export { auth as proxy };

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

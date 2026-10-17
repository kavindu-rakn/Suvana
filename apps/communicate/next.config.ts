import type { NextConfig } from "next";
import { suvanaOrigin } from "./lib/suvanaOrigin";

// Suvana one-domain topology: NEXT_PUBLIC_BASE_PATH=/communicate makes Next
// namespace every page, asset and API route under that prefix, so the shell
// can proxy /communicate/* with a single rewrite. Unset = standalone, the
// original behaviour. See lib/basePath.ts for the client-side half.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH;

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  async redirects() {
    // Root anchors on a direct Communicate visit must also reach the Shell.
    // These two unprefixed aliases do not match /communicate pages or APIs.
    return ["login", "register"].map(page => ({
      source: `/${page}`,
      has: [{ type: "host" as const, value: "suvana-communicate.vercel.app" }],
      destination: new URL(`/${page}`, suvanaOrigin()).href,
      basePath: false as const,
      permanent: true,
    }));
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;

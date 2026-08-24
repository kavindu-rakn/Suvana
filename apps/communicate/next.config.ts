import type { NextConfig } from "next";

// Suvana one-domain topology: NEXT_PUBLIC_BASE_PATH=/communicate makes Next
// namespace every page, asset and API route under that prefix, so the shell
// can proxy /communicate/* with a single rewrite. Unset = standalone, the
// original behaviour. See lib/basePath.ts for the client-side half.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH;

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;

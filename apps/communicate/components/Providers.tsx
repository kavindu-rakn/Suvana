"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { BASE_PATH } from "@/lib/basePath";

export function Providers({ children }: { children: ReactNode }) {
  // next-auth's browser client builds URLs from the origin root; behind the
  // shell's /communicate prefix it must be told where /api/auth actually is.
  return <SessionProvider basePath={`${BASE_PATH}/api/auth`}>{children}</SessionProvider>;
}

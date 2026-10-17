import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/accountPaths";
import { isShellAccountRequest, suvanaOrigin } from "@/lib/suvanaOrigin";

export type AccountSearch = Record<string, string | string[] | undefined>;

export async function accountPage(page: "login" | "register", searchParams: Promise<AccountSearch>): Promise<string> {
  const params = await searchParams;
  const requestHeaders = await headers();
  const origin = suvanaOrigin();
  // Host and x-forwarded-host are normalized by Vercel on external rewrites.
  // Only the Shell account-HTML proxy adds this non-secret routing marker.
  if (!isShellAccountRequest(requestHeaders)) {
    const url = new URL(`/${page}`, origin);
    for (const [key, value] of Object.entries(params)) {
      for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
        url.searchParams.append(key, entry);
      }
    }
    redirect(url.href);
  }
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const session = await auth();
  if (session?.user) {
    // Absolute same-public-origin URL avoids Next adding /communicate again.
    redirect(new URL(callbackUrl, origin).href);
  }
  return callbackUrl;
}

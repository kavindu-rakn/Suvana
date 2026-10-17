/** Root account navigation must bypass Next's /communicate basePath. */
export function safeCallbackUrl(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") ||
      value.startsWith("//") || /[\\\s\u0000-\u001f\u007f]/.test(value)) return "/";
  try {
    const url = new URL(value, "https://callback.invalid");
    if (url.origin !== "https://callback.invalid" ||
        /%2f|%5c|%0[0-9a-f]|%1[0-9a-f]|%7f/i.test(url.pathname)) return "/";
    // A signed-in account page must not redirect back to another account form.
    const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, "");
    if (["/login", "/register", "/communicate/login", "/communicate/register"].includes(pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function accountLink(page: "login" | "register", callbackUrl: unknown = "/"): string {
  return `/${page}?${new URLSearchParams({ callbackUrl: safeCallbackUrl(callbackUrl) })}`;
}

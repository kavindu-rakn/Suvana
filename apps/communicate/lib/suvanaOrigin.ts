/** Public, non-secret account origin. Never derive a redirect from an arbitrary Host. */
export function suvanaOrigin(): string {
  const url = new URL(process.env.SUVANA_ORIGIN || "https://suvana.help");
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SUVANA_ORIGIN must be an HTTP(S) origin, without a path or credentials");
  }
  return url.origin;
}

/** Routing marker set by the Shell HTML proxy, never proof of authentication. */
export function isShellAccountRequest(requestHeaders: Pick<Headers, "get">): boolean {
  return requestHeaders.get("x-suvana-account-origin") === suvanaOrigin();
}

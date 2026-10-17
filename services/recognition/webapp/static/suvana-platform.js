/* Suvana transport/account adapter. Root deployments retain their own URLs. */
(() => {
  "use strict";
  const mounted = /^\/recognize(?:\/|$)/.test(window.location.pathname);
  const apiPath = (path) => `${mounted ? "/recognize" : ""}${path}`;
  const info = fetch(apiPath("/api/info")).then((response) => {
    if (!response.ok) throw new Error("Recognition info unavailable");
    return response.json();
  });
  // Handlers below consume errors; keep early page-load rejection handled too.
  info.catch(() => {});
  const socketUrl = async () => {
    const settings = await info.catch(() => null);
    const url = new URL("/ws/recognize", settings?.publicOrigin || window.location.origin);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.href;
  };
  window.SuvanaRecognize = Object.freeze({ apiPath, info, socketUrl });

  if (!mounted) return; // No account UI/request on a standalone/laptop page.
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelector(".suvana-return").classList.add("suvana-mounted");
    document.getElementById("suvana-home").href = "/";
    const slot = document.getElementById("suvana-account");
    slot.hidden = false;
    const signedOut = () => {
      const link = document.createElement("a");
      link.href = "/login?callbackUrl=%2Frecognize%2F";
      link.textContent = "Log in";
      slot.replaceChildren(link);
    };
    signedOut();
    fetch("/communicate/api/auth/session", { headers: { accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((session) => {
        if (session?.user) {
          slot.textContent = `Signed in as ${session.user.name || session.user.email || "Suvana user"}`;
        }
      })
      .catch(() => {}); // An unavailable account service never blocks recognition.
  });
})();

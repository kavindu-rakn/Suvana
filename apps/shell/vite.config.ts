import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";

/**
 * Serve /api/assistant during `npm run dev`.
 *
 * In production that path is a Vercel Edge function (api/assistant.ts). Vite
 * knows nothing about those, so without this the assistant would silently
 * fall back to its local engine on localhost and the proxy route would only
 * ever be exercised in production — which is the worst place to find out it
 * is broken. Both call the same handler.
 *
 * The key is read from the shell's .env.local and handed in here. It is
 * deliberately NOT named VITE_*: only that prefix is exposed to client
 * code, so an unprefixed name cannot end up in the bundle even by accident.
 */
function assistantDevApi(apiKey: string | undefined): Plugin {
  return {
    name: "suvana-assistant-dev-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/assistant", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "POST only" }));
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
          void (async () => {
            // Imported through the dev server so it is transformed and hot
            // reloaded like any other source file.
            const { handleAssistant } = await server.ssrLoadModule(
              "/src/assistant/handler.ts",
            );
            let body: unknown = {};
            try {
              body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
            } catch {
              res.statusCode = 400;
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify({ error: "invalid JSON body" }));
              return;
            }
            const result = await handleAssistant(
              body,
              apiKey,
              req.socket.remoteAddress ?? "local",
            );
            res.statusCode = result.status;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify(result.body));
          })();
        });
      });
    },
  };
}

// The shell is plain HTML and TypeScript — no framework. Vite is here for two
// reasons only: a dev server whose proxy mirrors the production rewrites, so
// http://localhost:5173/learn and /communicate behave exactly as they will on
// the real domain, and a build that hashes and copies public/.
export default defineConfig(({ mode }) => {
  // Empty prefix so unprefixed names load too. This object stays in the Node
  // process — nothing here is injected into client code.
  const env = loadEnv(mode, fileURLToPath(new URL(".", import.meta.url)), "");

  return {
    plugins: [
      assistantDevApi(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
    ],
    build: {
      rollupOptions: {
        // Two documents, not one: /alerts/ is a real page on this domain, since
        // Alerts is the module with no web surface of its own to link out to.
        // Nested as alerts/index.html so the built path is /alerts/ on any static
        // host, with no clean-URL rewrite needed.
        input: {
          main: fileURLToPath(new URL("./index.html", import.meta.url)),
          alerts: fileURLToPath(
            new URL("./alerts/index.html", import.meta.url),
          ),
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        // Each module is its own deployable; in production these are the
        // rewrites in vercel.json. Learn runs with base '/learn/' and
        // Communicate with basePath '/communicate', so paths line up and
        // neither needs a path rewrite here.
        "/learn": {
          target: "http://localhost:5174",
          changeOrigin: false,
          ws: true,
        },
        "/communicate": {
          target: "http://localhost:3000",
          changeOrigin: false,
          // Next dev's HMR socket.
          ws: true,
          // Next streams its RSC payload as compressed chunks. Proxied without
          // this, the stream arrives truncated: the page's HTML renders but the
          // inline self.__next_f.push(...) chunks never do, so window.__next_f
          // stays empty, nothing hydrates, and every client component sits at
          // its loading state forever. Asking the upstream for identity
          // encoding keeps the stream intact through the proxy.
          headers: { "accept-encoding": "identity" },
        },
      },
    },
  };
});

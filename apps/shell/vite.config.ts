import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// The shell is plain HTML and TypeScript — no framework. Vite is here for two
// reasons only: a dev server whose proxy mirrors the production rewrites, so
// http://localhost:5173/learn and /communicate behave exactly as they will on
// the real domain, and a build that hashes and copies public/.
export default defineConfig({
  build: {
    rollupOptions: {
      // Two documents, not one: /alerts/ is a real page on this domain, since
      // Alerts is the module with no web surface of its own to link out to.
      // Nested as alerts/index.html so the built path is /alerts/ on any static
      // host, with no clean-URL rewrite needed.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        alerts: fileURLToPath(new URL('./alerts/index.html', import.meta.url)),
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
      '/learn': { target: 'http://localhost:5174', changeOrigin: false, ws: true },
      '/communicate': {
        target: 'http://localhost:3000',
        changeOrigin: false,
        // Next dev's HMR socket.
        ws: true,
        // Next streams its RSC payload as compressed chunks. Proxied without
        // this, the stream arrives truncated: the page's HTML renders but the
        // inline self.__next_f.push(...) chunks never do, so window.__next_f
        // stays empty, nothing hydrates, and every client component sits at
        // its loading state forever. Asking the upstream for identity
        // encoding keeps the stream intact through the proxy.
        headers: { 'accept-encoding': 'identity' },
      },
    },
  },
})

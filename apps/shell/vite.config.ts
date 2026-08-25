import { defineConfig } from 'vite'

// The shell is one static HTML page — no framework. Vite is here for two
// reasons only: a dev server whose proxy mirrors the production rewrites, so
// http://localhost:5173/learn and /communicate behave exactly as they will on
// the real domain, and a build that hashes and copies public/.
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Each module is its own deployable; in production these are the
      // rewrites in vercel.json. Learn runs with base '/learn/' and
      // Communicate with basePath '/communicate', so paths line up and
      // neither needs a path rewrite here.
      '/learn': { target: 'http://localhost:5174', changeOrigin: false },
      '/communicate': { target: 'http://localhost:3000', changeOrigin: false },
    },
  },
})

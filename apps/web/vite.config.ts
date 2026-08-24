import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Multi-page build: the static Suvana landing shell is served at `/`,
  // the learn app at `/learn/`. Public assets stay root-absolute so both
  // pages share /references, /wasm, /branding, etc.
  build: {
    rollupOptions: {
      input: {
        landing: fileURLToPath(new URL('./index.html', import.meta.url)),
        learn: fileURLToPath(new URL('./learn/index.html', import.meta.url)),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // Dev mirror of the production topology: vercel.json rewrites
    // /communicate/* to the communicate deployment; here the same paths
    // proxy to its dev server (which runs with basePath /communicate).
    proxy: {
      '/communicate': {
        target: 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The Learn module is its own deployable, served under /learn/ on the Suvana
  // domain (the shell proxies it, exactly as it does /communicate). `base`
  // makes Vite emit /learn/-prefixed asset URLs, and building into dist/learn
  // means this deployment serves those same paths standalone — so no rewrite
  // is needed on either side, and dev matches production.
  //
  // Anything fetched from public/ at runtime must go through
  // import.meta.env.BASE_URL: `base` does not rewrite string literals.
  base: '/learn/',
  build: {
    outDir: 'dist/learn',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    strictPort: true,
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'

// Omit this file in R26. All source files then build as standalone Learn.
const configUrl = new URL('./suvana.config.json', import.meta.url)
const platform = existsSync(configUrl)
  ? JSON.parse(readFileSync(configUrl, 'utf8')) as { base: string; suvana: boolean; port: number }
  : { base: '/', suvana: false, port: 5173 }

if (typeof platform.base !== 'string' || !platform.base.startsWith('/') ||
    !platform.base.endsWith('/') || typeof platform.suvana !== 'boolean' ||
    !Number.isInteger(platform.port) || platform.port < 1 || platform.port > 65535) {
  throw new Error('suvana.config.json requires base (/path/), suvana (boolean), and port (1-65535)')
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The shell and standalone deployments use identical source. Public asset
  // fetches still use BASE_URL: Vite does not rewrite runtime string literals.
  base: platform.base,
  define: {
    'import.meta.env.VITE_SUVANA': JSON.stringify(platform.suvana ? '1' : ''),
  },
  build: {
    outDir: platform.suvana ? 'dist/learn' : 'dist',
    emptyOutDir: true,
  },
  server: {
    port: platform.port,
    strictPort: true,
  },
})

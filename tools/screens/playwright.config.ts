import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const learnDir = path.resolve(__dirname, '../../apps/learn')

const fixtureVideo = 'C:/Users/User/Documents/Suvana-wt/_fixtures/hands-sign.y4m'
const browserArgs = [
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
]
if (fs.existsSync(fixtureVideo)) {
  browserArgs.push(`--use-file-for-fake-video-capture=${fixtureVideo}`)
}

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5194/learn/',
    permissions: ['camera'],
    launchOptions: {
      args: browserArgs,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 5194',
    cwd: learnDir,
    url: 'http://localhost:5194/learn/',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})

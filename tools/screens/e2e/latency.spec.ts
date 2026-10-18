import { test, expect } from '@playwright/test'
import fs from 'node:fs'

// Opt-in: normal smoke runs must not silently start a benchmark or use mocks.
test('Q-09 real-camera BAG EKA capture-end to result-shown', async ({ page, browser }, testInfo) => {
  test.skip(process.env.SUVANA_LATENCY !== '1', 'Run node tools/screens/latency-report.mjs explicitly')
  test.setTimeout(600_000)
  const output = process.env.SUVANA_LATENCY_RAW!
  const evidence: {
    browser: string; headless: boolean; delegate: unknown; camera: unknown;
    runs: { run: number; status: string; reason?: string; captureEnd?: number; resultShown?: number; ms?: number }[];
    error?: string;
  } = {
    browser: `Chromium ${browser.version()}`,
    headless: testInfo.project.use.headless !== false,
    delegate: null, camera: null, runs: [],
  }
  const save = () => fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n')
  let currentRun = 0
  try {
    await page.addInitScript(() => localStorage.setItem('suvana.learn.onboarding-seen', '1'))
    await page.goto('./')

    // Load the SAME production module before Practice initializes it. Observe
    // the successful delegate choice only; do not replace detection or options.
    // This affects startup, which is outside the two marks being measured.
    await page.evaluate(async url => {
      const { HandLandmarker } = await import(url)
      const original = HandLandmarker.createFromOptions
      const attempts: { delegate: string; status: string; reason?: string }[] = []
      ;(window as unknown as { q09Delegate: unknown }).q09Delegate = attempts
      HandLandmarker.createFromOptions = async function (...args: unknown[]) {
        const options = args[1] as { baseOptions: { delegate: string } }
        const entry = { delegate: options.baseOptions.delegate, status: 'initializing', reason: undefined as string | undefined }
        attempts.push(entry)
        try {
          const tracker = await original.apply(this, args)
          entry.status = 'ready'
          HandLandmarker.createFromOptions = original
          return tracker
        } catch (error) {
          entry.status = 'failed'
          entry.reason = String(error)
          throw error
        }
      }
    }, new URL(process.env.SUVANA_LATENCY_VISION!, page.url()).href)

    await page.getByRole('button', { name: 'Start practising', exact: true }).first().click()
    await expect(page.locator('h2.aww-pane-title').first()).toContainText('BAG EKA')
    await page.getByRole('button', { name: 'My turn', exact: true }).click()
    await page.getByRole('button', { name: 'Turn on camera', exact: true }).click()
    await expect(page.locator('.aww-pane-right')).toHaveAttribute('data-camera-status', 'running', { timeout: 30_000 })
    try {
      // More than two loops of kvn's clip. A missing hand gate stops the suite.
      await expect(page.locator('#aww-hands-pill')).toHaveAttribute('data-ready', 'yes', { timeout: 30_000 })
    } catch {
      throw new Error('STOP: hands were not detected/readied in the recorded clip; no latency trials started')
    }
    evidence.delegate = await page.evaluate(() => (window as unknown as { q09Delegate: unknown }).q09Delegate)
    evidence.camera = await page.evaluate(() => {
      const video = Array.from(document.querySelectorAll('video')).find(el => el.srcObject instanceof MediaStream)
      const track = (video?.srcObject as MediaStream | undefined)?.getVideoTracks()[0]
      const settings = track?.getSettings()
      return settings ? { width: settings.width, height: settings.height, frameRate: settings.frameRate, label: track?.label } : null
    })

    for (let run = 1; run <= 20; run++) {
      currentRun = run
      // Separate marks for every take, including the first. No warm-up discard.
      await page.evaluate(() => {
        performance.clearMarks('suvana:capture-end')
        performance.clearMarks('suvana:result-shown')
      })
      if (run === 1) {
        await page.getByRole('button', { name: 'Record attempt (Space)', exact: true }).click()
      } else {
        // The real Retry control starts the next countdown on this same sign.
        await page.locator('button.aww-btn-retry').click()
      }
      await expect(page.locator('.aww-practice-env')).toHaveAttribute('data-phase', 'recording', { timeout: 10_000 })
      // Let the normal capture window end; never score a shortened button take.
      await expect(page.locator('.aww-practice-env')).toHaveAttribute('data-phase', 'result', { timeout: 20_000 })
      if (await page.locator('.aww-result-nohands').count()) {
        throw new Error('STOP: no hands detected in the captured take')
      }
      await expect.poll(() => page.evaluate(() => performance.getEntriesByName('suvana:result-shown').length)).toBe(1)
      const marks = await page.evaluate(() => ({
        capture: performance.getEntriesByName('suvana:capture-end').map(mark => mark.startTime),
        shown: performance.getEntriesByName('suvana:result-shown').map(mark => mark.startTime),
        hidden: document.hidden,
      }))
      if (marks.hidden || marks.capture.length !== 1 || marks.shown.length !== 1 || marks.shown[0] < marks.capture[0]) {
        throw new Error(`Invalid marks/visibility: ${JSON.stringify(marks)}`)
      }
      evidence.runs.push({ run, status: 'ok', captureEnd: marks.capture[0], resultShown: marks.shown[0], ms: marks.shown[0] - marks.capture[0] })
      save()
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    evidence.error = reason
    if (currentRun && !evidence.runs.some(run => run.run === currentRun)) evidence.runs.push({ run: currentRun, status: 'failed', reason })
    throw error
  } finally {
    // Includes initialization failures and every unstarted run after a stop.
    evidence.delegate ??= await page.evaluate(() => (window as unknown as { q09Delegate?: unknown }).q09Delegate ?? null).catch(() => null)
    for (let run = 1; run <= 20; run++) {
      if (!evidence.runs.some(entry => entry.run === run)) evidence.runs.push({ run, status: 'not-run', reason: evidence.error ?? 'Suite stopped before this run' })
    }
    save()
  }
})

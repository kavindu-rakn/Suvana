#!/usr/bin/env node
/** D-A37 browser regression. Run against local Shell + Recognize previews:
 * SUVANA_ASSISTANT_BASE=http://127.0.0.1:5198 node tools/screens/assistant-no-key.mjs
 * Seeds synthetic retired credentials only. Never calls provider endpoints.
 */
import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'

const base = process.env.SUVANA_ASSISTANT_BASE || 'http://127.0.0.1:5198'
const keys = ['suvana.assistant.geminiKey', 'suvana.assistant.geminiModel', 'suvana.assistant.geminiResolved', 'savana.assistant.v1']
const questions = [
  ['sign for mother', 'MOTHER', '/learn/?sign=MOTHER'],
  ['what is the sign for mOtHeR', 'MOTHER', '/learn/?sign=MOTHER'],
  ['sign for eat', 'EAT', '/learn/?sign=EAT'],
  ['what is the sinhala for eat', 'KANAWA'],
  ['help', 'find real sign recordings'],
  ['help me', 'find real sign recordings'],
  ['how do i learn sign language', 'My turn', '/learn/?sign=BAG%20EKA'],
  ['how do I sign SIGN LANGUAGE', 'SIGN LANGUAGE', '/learn/?sign=SIGN%20LANGUAGE'],
  ['assistant privacy', 'No question goes to an AI provider.'],
  ['describe the handshape for A', 'cannot describe', '/learn/?sign=A'],
  ['translate my name is Daham to SSL', 'cannot translate', '/learn/'],
]
let replies = 0
const browser = await chromium.launch()
try {
  for (const [width, height] of [[1280, 800], [390, 844]]) {
    for (const surface of ['shell', 'recognize']) {
      const context = await browser.newContext({ viewport: { width, height } })
      await context.addInitScript(({keys}) => {
        for (const key of keys) localStorage.setItem(key, key==='savana.assistant.v1'
          ? JSON.stringify({provider:'gemini',apiKey:'synthetic-retired-key',model:'retired-model'}) : 'synthetic-retired-value')
        localStorage.setItem('assistant-test-unrelated', 'keep')
      }, {keys})
      const page = await context.newPage()
      const requests = [], errors = []
      page.on('request', request => requests.push(request))
      page.on('pageerror', error => errors.push(error.message))
      // Fail if a removed provider route is ever attempted, including probes.
      await page.route(/generativelanguage\.googleapis\.com|openrouter\.ai|api\.groq\.com|\/api\/assistant(?:\?|$)|\/api\/assistant\/(?:verify|models)/, route => {
        errors.push(`Forbidden provider request: ${route.request().url()}`)
        return route.abort()
      })
      await page.goto(base + (surface==='shell' ? '/' : '/recognize/'))
      if (surface==='shell') await expect(page.locator('.svn-ai-sub')).toHaveText('Recordings, module coverage and practice help')
      else await expect.poll(() => requests.some(r => r.url().endsWith('/api/assistant/meta'))).toBe(true)
      const saved = await page.evaluate(keys => Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])), keys)
      for (const key of surface==='shell'?keys.slice(0,3):keys.slice(3)) assert.equal(saved[key],null)
      assert.equal(await page.evaluate(()=>localStorage.getItem('assistant-test-unrelated')),'keep')
      const launcher = page.getByRole('button',{name:surface==='shell'?'Ask Suvana AI':'Open Suvana AI assistant',exact:true})
      await launcher.focus(); await launcher.press('Enter')
      const panel=page.locator('.svn-ai-panel')
      await expect(panel).toBeVisible()
      await expect(panel.locator('header').first()).toBeVisible()
      await expect(panel.locator('[data-act="settings"], .svn-ai-settings, input[type="password"], select')).toHaveCount(0)
      const input=page.getByRole('textbox',{name:surface==='shell'?'Ask the assistant':'Message',exact:true})
      const bots=page.locator(surface==='shell'?'.svn-ai-msg.is-ai':'.svn-ai-msg.bot')
      await expect(bots).toHaveCount(1)
      for (const [question, text, url] of questions) {
        const count=await bots.count()
        await input.fill(question); await input.press('Enter')
        await expect(bots).toHaveCount(count+1)
        await expect(bots.last()).toContainText(text)
        if (url) await expect(bots.last().locator(`a[href="${url}"]`).first()).toBeVisible()
        replies++
      }
      const chats=requests.filter(r=>r.url().includes('/api/assistant/chat'))
      if (surface==='shell') assert.equal(requests.filter(r=>r.url().includes('/api/assistant')).length,0)
      else {
        assert.equal(chats.length,questions.length)
        for (const chat of chats) assert.deepEqual(Object.keys(chat.postDataJSON()).sort(),['history','message'])
        await expect(panel.locator('[data-role="engine"]')).toHaveText('Verified index · ready')
        await page.getByRole('button',{name:'Clear conversation',exact:true}).click()
        await expect(bots).toHaveCount(1)
      }
      await input.press('Escape'); await expect(panel).not.toBeVisible()
      if (surface==='recognize') {
        await page.locator('#settingsBtn').click()
        await expect(page.locator('#settingsDrawer')).toHaveClass(/open/)
        await expect(page.locator('#settingsDrawer')).toContainText('Overlay')
        await expect(page.locator('#settingsDrawer')).toContainText('Confidence threshold')
      }
      assert.deepEqual(errors,[])
      await context.close()
    }
  }
  // Private browsing / unavailable storage must not prevent either widget booting.
  for (const surface of ['shell','recognize']) {
    const context=await browser.newContext()
    await context.addInitScript(()=>{
      for (const method of ['getItem','setItem','removeItem']) Storage.prototype[method]=()=>{throw new DOMException('Storage disabled','SecurityError')}
    })
    const page=await context.newPage()
    await page.goto(base+(surface==='shell'?'/':'/recognize/'))
    const launcher=page.locator('.svn-ai-launcher')
    await launcher.focus(); await launcher.press('Enter')
    await expect(page.locator('.svn-ai-panel')).toBeVisible()
    await expect(page.locator(surface==='shell'?'.svn-ai-msg.is-ai':'.svn-ai-msg.bot')).toHaveCount(1)
    await context.close()
  }
  console.log(`D-A37 browser checks passed: ${replies} replies, both viewports/widgets, storage cleanup and disabled-storage boot, no provider requests, clear conversation and independent page settings.`)
} finally { await browser.close() }

import { chromium } from 'playwright'

const previewUrl = process.env.PREVIEW_URL || 'http://localhost:4173'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(previewUrl, { waitUntil: 'networkidle' })
await page.screenshot({ path: process.env.SHOT_HOME || '/tmp/urania-home.png' })

// Click the Birth Witness label/circle group
const birthNode = page.locator('text=BIRTH WITNESS')
await birthNode.click({ force: true })
await page.waitForTimeout(600)
await page.screenshot({ path: process.env.SHOT_MODAL || '/tmp/urania-modal.png' })

await browser.close()

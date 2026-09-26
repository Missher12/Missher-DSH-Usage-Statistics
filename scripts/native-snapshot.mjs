/** Exercise the real packaged Desktop in an isolated Harness home. */
import {_electron as electron} from 'playwright'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {resolve, join} from 'node:path'
import assert from 'node:assert/strict'

const executable = process.env.DSH_DESKTOP_EXECUTABLE
if (!executable) throw new Error('DSH_DESKTOP_EXECUTABLE must name a Desktop 0.5.10 executable')
const root = resolve('.verification')
const home = resolve(process.env.DSH_ACCEPTANCE_HOME ?? join(root, 'home'))
if (!home.startsWith(root+'/')) throw new Error('Acceptance home must be inside .verification')
const mode = process.env.DSH_ACCEPTANCE_MODE ?? 'installed'
const output = resolve('output/playwright')
await mkdir(output, {recursive: true})
const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG', 'TZ'].filter(k => process.env[k]).map(k => [k, process.env[k]]))
Object.assign(env, {DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1', MISSHER_TENCENTDB_DIR: join(root, 'unused-memory')})
let app
const errors = []
const rpc = []
try {
  app = await electron.launch({executablePath: executable, args: [`--user-data-dir=${join(root, 'electron')}`], cwd: root, env, timeout: 60_000})
  const page = await app.firstWindow({timeout: 60_000})
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text())})
  page.on('response', async response => {
    if (!response.headers()['content-type']?.includes('application/json')) return
    const text = await response.text().catch(() => '')
    if (text.includes('usageStatistics') || /"ok":false/.test(text)) rpc.push({path:new URL(response.url()).pathname,status:response.status(),body:text.slice(0,1800)})
  })
  await page.waitForLoadState('domcontentloaded')
  const notice = page.getByRole('dialog', {name: /^(?:Internal Testing Notice|内测声明)$/u})
  const settings = page.locator('[data-dsh-desktop-command="open-settings"]')
  await settings.waitFor({timeout: 60_000})
  if (await notice.isVisible()) await notice.getByRole('button', {name: /^(?:Continue|继续)$/u}).click()
  const deferKey = page.getByRole('button', {name: /^(?:稍后配置|Set up later|Configure later)$/u})
  if (await deferKey.isVisible()) await deferKey.click()
  if (await settings.getAttribute('aria-expanded') !== 'true') await settings.click()
  const dialog = page.getByRole('dialog').last()
  const usageButton = dialog.getByRole('button', {name: /^(?:Usage|使用统计)$/u})
  assert.equal(await usageButton.count(), 1, 'one usage settings entry')
  await usageButton.click()
  const panel = dialog.locator('section[aria-label="Usage"], section[aria-label="使用统计"]')
  await panel.locator('[data-activity-day]').first().waitFor({timeout: 25_000})
  assert.equal(await panel.locator('[data-activity-day]').count(), 371)
  const expectedPlugin = mode === 'installed'
  assert.equal(await page.locator('style[data-plugin="@missher/dsh-usage-statistics"]').count(), expectedPlugin ? 1 : 0)
  for (const [name, value] of [[/^(?:Weekly|每周)$/u, 'weekly'], [/^(?:Cumulative|累计)$/u, 'cumulative'], [/^(?:Daily|每日)$/u, 'daily']]) {
    await panel.getByRole('tab', {name}).click()
    assert.equal(await panel.locator(`[data-particle-mode="${value}"]`).count(), 371)
  }
  const text = await panel.innerText()
  assert(!/temporarily unavailable|暂时无法读取/.test(text))
  assert.equal(await panel.locator('[data-display-tokens="30000"]').count(), 1, 'read 30,000 synthetic tokens from durable history')
  await panel.screenshot({path: join(output, `${mode}-usage.png`)})
  await page.screenshot({path: join(output, `${mode}-desktop.png`)})
  const receipt = {mode, desktopVersion: await app.evaluate(({app}) => app.getVersion()), scheme: new URL(page.url()).protocol, oneUsageEntry: true, activityCells: 371, chartModes: ['daily','weekly','cumulative'], pluginStyles: expectedPlugin, realModel: false, errors, text}
  await writeFile(join(output, `${mode}-native.json`), JSON.stringify(receipt, null, 2)+'\n')
  console.log(JSON.stringify(receipt, null, 2))
  if (process.env.DSH_INSPECT_MARKET === '1') {
    await dialog.getByRole('button', {name: /^(?:插件市场|Plugin Market)$/u}).click()
    console.log(JSON.stringify({market:await dialog.innerText(),inputs:await dialog.locator('input').evaluateAll(nodes=>nodes.map(n=>({placeholder:n.placeholder,type:n.type})))},null,2))
  }
} catch (error) {
  const page = app?.windows()[0]
  if (page) {
    const text = await page.locator('body').innerText().catch(() => '')
    await writeFile(join(output, `${mode}-failure.txt`), text+'\n'+errors.join('\n')+'\n'+JSON.stringify(rpc,null,2))
    await page.screenshot({path: join(output, `${mode}-failure.png`)}).catch(() => {})
    console.error(text.slice(0, 2400))
  }
  throw error
} finally {
  await app?.close()
}

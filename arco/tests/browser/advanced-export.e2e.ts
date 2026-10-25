import { test, expect, type Locator } from '@playwright/test'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { resolve, extname, sep } from 'node:path'
import { build } from 'vite'
import { createAdvancedExports } from './advanced-export-fixture.ts'

let temporary = ''
let baseURL = ''
let server: Server | undefined
const formItem = (container: Locator, label: string) => container.locator('.arco-form-item').filter({ has: container.page().locator('.arco-form-item-label').filter({ hasText: new RegExp(`^${label}\\s*:?[\\s]*$`) }) })

test.beforeAll(async() => {
  const root = resolve(import.meta.dirname, '../..')
  temporary = await mkdtemp(resolve(root, '.advanced-export-test-'))
  const exports = createAdvancedExports(await readFile(resolve(root, 'src/data-source.ts'), 'utf8'))
  for (const [name, source] of Object.entries(exports)) await writeFile(resolve(temporary, `${name}.vue`), source)
  await writeFile(resolve(temporary, 'index.html'), '<!doctype html><html><body><div id="app"></div><script type="module" src="./main.ts"></script></body></html>')
  await writeFile(resolve(temporary, 'main.ts'), `
import { createApp, h, ref } from 'vue'
import Active from './Active.vue'
import Disabled from './Disabled.vue'
import Ancestor from './Ancestor.vue'
createApp({ setup() {
 const submitted = ref(''), tableAction = ref(''), action = ref(''), uploadError = ref('')
 return () => h('main', [
  h('section', { class: 'active-case' }, [h(Active, {
   onSubmit: (value: unknown) => submitted.value = JSON.stringify(value),
   onTableAction: (value: unknown) => tableAction.value = JSON.stringify(value),
   onAction: (value: unknown) => action.value = JSON.stringify(value),
   onUploadError: (value: unknown) => uploadError.value = JSON.stringify(value)
  }), h('pre', { 'data-testid': 'submission' }, submitted.value),
  h('pre', { 'data-testid': 'table-action' }, tableAction.value),
  h('pre', { 'data-testid': 'custom-action' }, action.value),
  h('pre', { 'data-testid': 'upload-error' }, uploadError.value)]),
  h('section', { class: 'disabled-case' }, [h(Disabled)]),
  h('section', { class: 'ancestor-case' }, [h(Ancestor)])
 ])
} }).mount('#app')`)
  await build({ root: temporary, configFile: resolve(root, 'vite.config.ts'), logLevel: 'error', build: { outDir: resolve(temporary, 'dist'), emptyOutDir: true } })
  const dist = resolve(temporary, 'dist')
  server = createServer(async(request, response) => {
    try {
      const path = resolve(dist, '.' + new URL(request.url!, 'http://localhost').pathname)
      if (path !== dist && !path.startsWith(dist + sep)) { response.writeHead(403).end(); return }
      const file = path === dist ? resolve(dist, 'index.html') : path
      const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }
      response.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream')
      response.end(await readFile(file))
    } catch { response.writeHead(404).end() }
  })
  await new Promise<void>(done => server!.listen(0, '127.0.0.1', done))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Export test server has no address')
  baseURL = `http://127.0.0.1:${address.port}`
})

test.afterAll(async() => {
  await new Promise<void>((done, reject) => server ? server.close(error => error ? reject(error) : done()) : done())
  if (temporary) await rm(temporary, { recursive: true, force: true })
})

test('production export retains nested controls, validation, remote retries and business events', async({ page }) => {
  const errors: string[] = [], external: string[] = [], posted: string[] = []
  const requests: Array<{ path: string, method: string, body: unknown }> = []
  let optionAttempts = 0, rowAttempts = 0
  const row = { key: 'node-7', name: 'Edge router', role: 'gateway' }
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (request.method() === 'POST') posted.push(new URL(request.url()).pathname) })
  await page.route('**/*', route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin !== baseURL) { external.push(url.href); return route.abort() }
    if (!url.pathname.startsWith('/api/')) return route.continue()
    requests.push({ path: url.pathname, method: request.method(), body: request.postData() ? request.postDataJSON() : null })
    if (url.pathname === '/api/options') {
      optionAttempts++
      return route.fulfill(optionAttempts === 1 ? { status: 503, body: 'Unavailable' } : { json: { payload: { choices: [{ caption: 'Remote option', id: 'remote-7' }] } } })
    }
    if (url.pathname === '/api/rows') {
      rowAttempts++
      return route.fulfill(rowAttempts === 1 ? { status: 500, body: 'Unavailable' } : { json: { payload: { rows: [row] } } })
    }
    return route.abort()
  })
  await page.goto(baseURL)
  await expect(page.locator('.active-case').getByRole('textbox', { name: 'Account', exact: true })).toBeVisible()
  const active = page.locator('.active-case')
  const account = formItem(active, 'Account')
  const choice = formItem(active, 'Remote choice')
  const table = formItem(active, 'Records')
  const checkboxes = formItem(active, 'Choices')
  await expect(account.locator('.arco-input-prefix .arco-icon-user')).toBeVisible()
  await expect(account.locator('.arco-input-suffix .arco-icon-search')).toBeVisible()
  await expect(account).toContainText('account:')
  await expect(account).toContainText('@example.test')
  expect(await account.evaluate(element => { let levels = 0; for (let node = element.parentElement; node; node = node.parentElement) if (node.classList.contains('arco-row')) levels++; return levels })).toBeGreaterThanOrEqual(3)
  await expect(choice.locator('.arco-alert')).toContainText('HTTP 503')
  await expect(table.locator('.arco-alert')).toContainText('HTTP 500')
  await choice.getByRole('button', { name: 'Retry', exact: true }).click()
  await table.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(choice.locator('.arco-alert')).toHaveCount(0)
  await expect(table.locator('.arco-alert')).toHaveCount(0)
  await expect(table.getByRole('cell', { name: 'Edge router', exact: true })).toBeVisible()
  await choice.locator('.arco-select-view').click()
  await page.locator('.arco-select-option').filter({ hasText: /^Remote option$/ }).click()
  await account.locator('input').fill('abc')
  await active.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(account.locator('.arco-form-item-message')).toContainText('Use three uppercase letters')
  await expect(checkboxes.locator('.arco-form-item-message')).toBeVisible()
  await expect(active.getByTestId('submission')).toHaveText('')
  await account.locator('input').fill('ABC')
  const toggle = formItem(active, 'Enabled').getByRole('switch')
  await expect(toggle).toContainText('Disabled value')
  await toggle.click()
  await expect(toggle).toContainText('Enabled value')
  await checkboxes.locator('label.arco-checkbox').filter({ hasText: /^Alpha$/ }).click()
  await checkboxes.locator('label.arco-checkbox').filter({ hasText: /^Beta$/ }).click()
  await expect(checkboxes.getByRole('checkbox', { name: 'Gamma', exact: true })).toBeDisabled()
  await active.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect.poll(async() => JSON.parse(await active.getByTestId('submission').textContent() || 'null')).toMatchObject({ account: 'ABC', enabled: 'on', choices: ['a', 'b'], remoteChoice: 'remote-7', attachment: [] })
  await table.getByRole('button', { name: 'Inspect row', exact: true }).click()
  await expect.poll(async() => JSON.parse(await active.getByTestId('table-action').textContent() || 'null')).toEqual({ field: 'records', action: 'inspect', record: row })
  await active.getByRole('button', { name: 'Notify application', exact: true }).click()
  await expect(active.getByTestId('custom-action')).toHaveText('"notify"')
  await formItem(active, 'Attachment').locator('input[type=file]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Local selection') })
  await expect(formItem(active, 'Attachment').locator('.arco-upload-list')).toContainText('notes.txt')
  await active.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(active.getByTestId('submission')).toContainText('notes.txt')
  await active.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(account.locator('input')).toHaveValue('')
  await expect(toggle).toContainText('Disabled value')
  await expect(checkboxes.getByRole('checkbox', { name: 'Alpha', exact: true })).not.toBeChecked()
  await expect(formItem(active, 'Attachment').locator('.arco-upload-list-item')).toHaveCount(0)
  expect(requests.filter(request => request.path === '/api/options')).toEqual([{ path: '/api/options', method: 'GET', body: null }, { path: '/api/options', method: 'GET', body: null }])
  expect(requests.filter(request => request.path === '/api/rows')).toEqual([{ path: '/api/rows', method: 'POST', body: { category: 'network' } }, { path: '/api/rows', method: 'POST', body: { category: 'network' } }])
  expect(posted).toEqual(['/api/rows', '/api/rows'])
  expect(external).toEqual([])
  expect(errors).toEqual([])
})

test('production export disables controls and table actions through either form or row ancestry', async({ page }) => {
  await page.route('**/api/options', route => route.fulfill({ json: { payload: { choices: [] } } }))
  await page.route('**/api/rows', route => route.fulfill({ json: { payload: { rows: [] } } }))
  await page.goto(baseURL)
  for (const selector of ['.disabled-case', '.ancestor-case']) {
    const section = page.locator(selector)
    await expect(formItem(section, 'Account').locator('input')).toBeDisabled()
    await expect(formItem(section, 'Enabled').getByRole('switch')).toBeDisabled()
    await expect(formItem(section, 'Choices').getByRole('checkbox', { name: 'Alpha', exact: true })).toBeDisabled()
    await expect(section.getByRole('button', { name: 'Notify application', exact: true })).toBeDisabled()
    await expect(formItem(section, 'Records').getByRole('button', { name: 'Inspect row', exact: true })).toBeDisabled()
    await expect(formItem(section, 'Attachment').locator('input[type=file]')).toBeDisabled()
  }
})

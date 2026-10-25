import { test, expect } from '@playwright/test'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { resolve, extname, sep } from 'node:path'
import { build } from 'vite'
import { configureGenerator, generateVue } from '../../src/generate'
import { createField, emptySchema } from '../../src/schema'

let temporary = ''
let baseURL = ''
let server: Server | undefined

test.beforeAll(async() => {
  const root = resolve(import.meta.dirname, '../..')
  temporary = await mkdtemp(resolve(root, '.richtext-export-test-'))
  configureGenerator({ richText: await readFile(resolve(root, 'src/RichText.ts'), 'utf8'), dataSource: '' })
  const copy = { submit: 'Submit', reset: 'Reset', required: (label: string) => `Required ${label}`, locale: 'en-US', dark: false }
  const schema = emptySchema()
  const rich = createField('richtext', [], 'Article', 'Option')
  rich.required = true
  schema.fields.push(rich)
  await writeFile(resolve(temporary, 'Active.vue'), generateVue(schema, copy))
  schema.disabled = true
  await writeFile(resolve(temporary, 'Disabled.vue'), generateVue(schema, copy))
  schema.disabled = false
  const row = createField('row', schema.fields, 'Row', 'Option')
  row.disabled = true
  row.children.push(rich)
  schema.fields = [row]
  await writeFile(resolve(temporary, 'Nested.vue'), generateVue(schema, copy))
  await writeFile(resolve(temporary, 'index.html'), '<!doctype html><html><body><div id="app"></div><script type="module" src="./main.ts"></script></body></html>')
  await writeFile(resolve(temporary, 'main.ts'), `
import { createApp, h, ref } from 'vue'
import Active from './Active.vue'
import Disabled from './Disabled.vue'
import Nested from './Nested.vue'
createApp({ setup() { const result = ref(''); return () => h('div', [
 h('section', { class: 'active-case' }, [h(Active, { onSubmit: value => result.value = JSON.stringify(value) }), h('pre', result.value)]),
 h('section', { class: 'disabled-case' }, [h(Disabled)]),
 h('section', { class: 'nested-case' }, [h(Nested)])
]) } }).mount('#app')`)
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

test('production-built exported SFC preserves rich text, reset, validation and inherited disabled state offline', async({ page }) => {
  const remote: string[] = [], errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== baseURL) { remote.push(url.href); return route.abort() }
    return route.continue()
  })
  await page.goto(baseURL)
  const active = page.locator('.active-case')
  const area = active.frameLocator('.rich-text iframe').locator('body')
  await expect(area).toBeEditable()
  await active.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(active.locator('.arco-form-item-message')).toContainText('Required Article')
  await area.fill('Exported offline HTML')
  await expect(active.locator('.arco-form-item-message')).toHaveCount(0)
  await area.press('ControlOrMeta+a')
  await active.getByRole('button', { name: 'Bold', exact: true }).click()
  await expect(area.locator('strong')).toHaveText('Exported offline HTML')
  await active.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(active.locator('pre')).toContainText('<strong>Exported offline HTML</strong>')
  await active.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(area).toHaveText('')
  for (const selector of ['.disabled-case', '.nested-case']) {
    const readonly = page.locator(selector).frameLocator('.rich-text iframe').locator('body')
    await expect(readonly).toHaveClass(/mce-content-body/)
    expect(await readonly.evaluate(element => element.isContentEditable)).toBe(false)
  }
  expect(remote).toEqual([])
  expect(errors).toEqual([])
})

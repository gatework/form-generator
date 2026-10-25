import { test, expect } from '@playwright/test'
import { createField, emptySchema } from '../../src/schema'

test('nested remote options and table data load only in preview, preserve values and recover after retry', async ({ page }) => {
  const schema = emptySchema()
  const row = createField('row', [], 'Remote section', 'Option')
  const select = createField('select', [row], 'Remote choice', 'Option')
  select.defaultValue = 'keep'
  select.options = [{ label: 'Keep selection', value: 'keep' }]
  select.dataSource = { enabled: true, url: '/__fixture/options', method: 'GET', path: 'result.items', labelKey: 'title', valueKey: 'id', childrenKey: 'children', body: '' }
  row.children.push(select)
  const table = createField('table', [row], 'Remote records', 'Name')
  table.columns = [{ title: 'Record name', dataIndex: 'name' }, { title: 'Count', dataIndex: 'count' }]
  table.dataSource = { enabled: true, url: '/__fixture/records', method: 'POST', path: 'data.rows', labelKey: 'label', valueKey: 'value', childrenKey: 'children', body: '{"page":1}' }
  schema.fields.push(row, table)
  await page.addInitScript(value => localStorage.setItem('gatework:form-generator:arco:v1', JSON.stringify(value)), schema)
  let optionRequests = 0
  let tableRequests = 0
  let releaseFirst: () => void = () => {}
  const firstResponse = new Promise<void>(resolve => { releaseFirst = resolve })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/__fixture/options', async route => {
    optionRequests++
    if (optionRequests === 1) {
      await firstResponse
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Try again"}' })
    } else {
      await route.fulfill({ json: { result: { items: [{ title: 'Remote One', id: 42 }, { title: 'Remote Two', id: 43 }] } } })
    }
  })
  await page.route('**/__fixture/records', async route => {
    tableRequests++
    expect(route.request().method()).toBe('POST')
    expect(route.request().postDataJSON()).toEqual({ page: 1 })
    await route.fulfill({ json: { data: { rows: [{ name: 'Fetched record', count: 1984 }] } } })
  })

  await page.goto('/')
  await expect(page.locator('.builder-field')).toHaveCount(3)
  expect(optionRequests).toBe(0)
  expect(tableRequests).toBe(0)
  await page.getByRole('button', { name: '运行', exact: true }).click()
  const modal = page.locator('.arco-modal')
  await expect(modal.locator(`#${select.name}`).getByRole('status')).toContainText('正在加载数据')
  releaseFirst()
  await expect(modal.getByRole('alert').filter({ hasText: '503' })).toBeVisible()
  await expect(modal.locator('.arco-table')).toContainText('Fetched record')
  await expect(modal.locator('.arco-table')).toContainText('1984')
  await modal.getByRole('button', { name: '重试', exact: true }).click()
  await expect(modal.getByRole('alert').filter({ hasText: '503' })).toHaveCount(0)
  await expect.poll(() => optionRequests).toBe(2)

  await modal.getByRole('button', { name: '提交', exact: true }).click()
  await expect(modal.locator('pre')).toContainText(`"${select.name}": "keep"`)
  await modal.locator('.arco-select-view').click()
  await page.locator('.arco-select-option').filter({ hasText: 'Remote One' }).click()
  await modal.getByRole('button', { name: '提交', exact: true }).click()
  await expect(modal.locator('pre')).toContainText(`"${select.name}": 42`)
  await modal.getByRole('button', { name: '重置', exact: true }).click()
  await modal.getByRole('button', { name: '提交', exact: true }).click()
  await expect(modal.locator('pre')).toContainText(`"${select.name}": "keep"`)
  expect(tableRequests).toBe(1)
  expect(errors).toEqual([])
})

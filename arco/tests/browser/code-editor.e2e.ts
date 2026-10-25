import { test, expect } from '@playwright/test'

test('editable JSON applies validated changes and code edits download without changing the form', async({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.locator('.palette').getByRole('button', { name: '单行文本', exact: true }).click()
  await page.getByRole('button', { name: '查看 JSON', exact: true }).click()
  const jsonEditor = page.getByRole('textbox', { name: '查看 JSON', exact: true })
  await expect(jsonEditor).toBeVisible()
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('gatework:form-generator:arco:v1')!))
  draft.fields[0].label = 'Edited through JSON'
  await jsonEditor.fill(JSON.stringify(draft, null, 2))
  await page.getByRole('button', { name: '应用 JSON', exact: true }).click()
  await page.locator('.arco-modal').last().getByRole('button', { name: '应用', exact: true }).click()
  await expect(page.locator('.arco-modal')).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: '标题', exact: true })).toHaveValue('Edited through JSON')
  await page.getByRole('button', { name: '查看代码', exact: true }).click()
  const codeEditor = page.getByRole('textbox', { name: '查看代码', exact: true })
  await expect(codeEditor).toContainText('<template>')
  const code = '<template><p>Download-only edit</p></template>'
  await codeEditor.fill(code)
  const downloadEvent = page.waitForEvent('download')
  await page.locator('.arco-modal').getByRole('button', { name: '导出 Vue 文件', exact: true }).click()
  const download = await downloadEvent
  const stream = await download.createReadStream()
  let content = ''
  for await (const chunk of stream!) content += chunk.toString()
  expect(content).toContain('Download-only edit')
  await page.locator('.arco-modal-close-btn').click()
  await expect(page.getByRole('textbox', { name: '标题', exact: true })).toHaveValue('Edited through JSON')
  expect(errors).toEqual([])
})

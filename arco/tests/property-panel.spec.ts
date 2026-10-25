import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import Arco, { FormItem, InputNumber, Select } from '@arco-design/web-vue'
import PropertyPanel from '../src/PropertyPanel.vue'
import { createField, emptySchema, parseSchema, type FieldType } from '../src/schema'
import { locale } from '../src/locale'

let wrapper: VueWrapper
beforeEach(() => {
  locale.value = 'zh-CN'
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }))
})
afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals(); document.body.innerHTML = '' })
function panel(type: FieldType) {
  const schema = reactive(emptySchema())
  const field = createField(type, [], 'Field', 'Option')
  schema.fields.push(field)
  wrapper = mount(PropertyPanel, { props: { schema, field: schema.fields[0] }, global: { plugins: [Arco] } })
  return { schema, field: schema.fields[0]! }
}
const item = (label: string) => wrapper.findAllComponents(FormItem).find(component => component.props('label') === label)!
const input = (label: string) => item(label).find('input')
it('shows the effective alpha default and reflects both toggle directions', async () => {
  const { field } = panel('color')
  const toggle = item('透明度').find('[role="switch"]')
  expect(toggle.attributes('aria-checked')).toBe('true')
  await toggle.trigger('click')
  expect(field.properties.showAlpha).toBe(false)
  expect(toggle.attributes('aria-checked')).toBe('false')
  await toggle.trigger('click')
  expect(field.properties.showAlpha).toBe(true)
  expect(toggle.attributes('aria-checked')).toBe('true')
})
it('retains the rating auxiliary text switch after enabling it', async () => {
  const { field } = panel('rate')
  const toggle = item('辅助文字').find('[role="switch"]')
  await toggle.trigger('click')
  expect(field.properties.showText).toBe(true)
  expect(toggle.attributes('aria-checked')).toBe('true')
  await toggle.trigger('click')
  expect(field.properties.showText).toBe(false)
})
it('reflects upload defaults and retains explicitly configured automatic upload', async () => {
  const { field } = panel('upload')
  expect(item('显示文件列表').find('[role="switch"]').attributes('aria-checked')).toBe('true')
  expect(input('数量限制').element.value).toBe('0')
  expect(input('文件上限 MB').element.value).toBe('0')
  await item('自动上传').find('[role="switch"]').trigger('click')
  expect(field.properties.autoUpload).toBe(true)
  expect(item('自动上传').find('[role="switch"]').attributes('aria-checked')).toBe('true')
})
it('reflects the Arco table hover default', () => {
  panel('table')
  expect(item('悬停效果').find('[role="switch"]').attributes('aria-checked')).toBe('true')
})
it('leaves unset selection bounds blank and deletes a cleared bound', async () => {
  const { schema, field } = panel('checkbox')
  expect(item('最少选项').findComponent(InputNumber).props('modelValue')).toBeUndefined()
  expect(item('最多选项').findComponent(InputNumber).props('modelValue')).toBeUndefined()
  await input('最多选项').setValue('2')
  await input('最多选项').trigger('blur')
  expect(field.properties.max).toBe(2)
  await input('最多选项').setValue('')
  await input('最多选项').trigger('blur')
  expect(Object.hasOwn(field.properties, 'max')).toBe(false)
  expect(() => parseSchema(JSON.stringify(schema))).not.toThrow()
})
it('keeps unspecified precision blank and restores valid required numeric fields after clearing', async () => {
  const { schema, field } = panel('number')
  expect(item('精度').findComponent(InputNumber).props('modelValue')).toBeUndefined()
  await input('步长').setValue('')
  await input('步长').trigger('blur')
  expect(field.step).toBe(1)
  expect(() => parseSchema(JSON.stringify(schema))).not.toThrow()
})
it('keeps textarea row limits valid when cleared or crossed', async () => {
  const { schema, field } = panel('textarea')
  await input('最少行数').setValue('8')
  await input('最少行数').trigger('blur')
  expect(field.properties.autoSize).toEqual({ minRows: 8, maxRows: 8 })
  await input('最多行数').setValue('')
  await input('最多行数').trigger('blur')
  expect(field.properties.autoSize).toEqual({ minRows: 6, maxRows: 6 })
  expect(() => parseSchema(JSON.stringify(schema))).not.toThrow()
})
it('shows date display formats from the selected mode and omits unsupported time valueFormat', async () => {
  const { field } = panel('date')
  field.properties.mode = 'quarter'
  await wrapper.vm.$nextTick()
  expect(input('显示格式').element.value).toBe('YYYY-[Q]Q')
  wrapper.unmount()
  panel('time')
  expect(wrapper.findAllComponents(FormItem).some(component => component.props('label') === '值格式')).toBe(false)
})
it('adds, edits and removes table column actions without changing ordinary column data', async () => {
  const { schema, field } = panel('table')
  await wrapper.findAll('button').find(button => button.text().includes('添加操作按钮'))!.trigger('click')
  await wrapper.find('input[aria-label="操作名称"]').setValue('edit')
  await wrapper.find('input[aria-label="操作标题"]').setValue('Edit record')
  expect(field.columns[0]!.actions).toEqual([{ name: 'edit', label: 'Edit record', type: 'text' }])
  expect(field.columns[0]!.dataIndex).toBe('name')
  wrapper.find('.column-action-editor').findComponent(Select).vm.$emit('update:modelValue', 'primary')
  await wrapper.vm.$nextTick()
  expect(field.columns[0]!.actions![0]!.type).toBe('primary')
  expect(() => parseSchema(JSON.stringify(schema))).not.toThrow()
  await wrapper.find('button[aria-label="删除操作"]').trigger('click')
  expect(field.columns[0]!.actions).toBeUndefined()
  expect(field.columns[0]!.dataIndex).toBe('name')
})

it('reflects and edits InputNumber readOnly values using the authored readonly setting', async () => {
  const { field } = panel('number')
  field.properties.readOnly = true
  await wrapper.vm.$nextTick()
  const toggle = item('只读').find('[role="switch"]')
  expect(toggle.attributes('aria-checked')).toBe('true')
  await toggle.trigger('click')
  expect(field.properties.readonly).toBe(false)
  expect(Object.hasOwn(field.properties, 'readOnly')).toBe(false)
  expect(toggle.attributes('aria-checked')).toBe('false')
})

it('shows the default text style for imported table actions with no explicit type', async () => {
  const { field } = panel('table')
  field.columns[0]!.actions = [{ name: 'inspect', label: 'Inspect' }]
  await wrapper.vm.$nextTick()
  expect(wrapper.find('.column-action-editor').findComponent(Select).props('modelValue')).toBe('text')
})

it.each(['dateRange', 'timeRange'] as const)('clears a %s default without invalidating the draft', async(type) => {
  const { schema, field } = panel(type)
  field.defaultValue = type === 'dateRange' ? ['2026-10-01', '2026-10-02'] : ['09:00:00', '17:00:00']
  await wrapper.vm.$nextTick()
  await wrapper.find('.arco-picker-clear-icon').trigger('click')
  expect(field.defaultValue).toEqual([])
  expect(() => parseSchema(JSON.stringify(schema))).not.toThrow()
})

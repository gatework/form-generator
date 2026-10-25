import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ArcoVue from '@arco-design/web-vue'
import { JSDOM } from 'jsdom'
import App from '../src/App.vue'
import Preview from '../src/Preview.vue'
import FieldControl from '../src/FieldControl'
import { createField, emptySchema } from '../src/schema'
let wrapper: ReturnType<typeof mount>
beforeEach(() => {
  vi.stubGlobal('localStorage', new JSDOM('', { url: 'https://designer.test' }).window.localStorage)
  localStorage.clear()
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; vi.unstubAllGlobals() })
const button = (name: string) => wrapper.findAll('button').find(item => item.text() === name)!
it('adds, edits, duplicates and removes native Arco fields and saves the draft', async() => {
  wrapper = mount(App, { global: { plugins: [ArcoVue] } })
  await button('单行文本').trigger('click')
  expect(wrapper.findAll('.builder-field')).toHaveLength(1)
  expect(wrapper.find('.builder-field .arco-input-wrapper').exists()).toBe(true)
  await wrapper.find('input[aria-label="标题"]').setValue('Account')
  expect(wrapper.find('.field-heading').text()).toContain('Account')
  await button('复制').trigger('click')
  expect(wrapper.findAll('.builder-field')).toHaveLength(2)
  const saved = JSON.parse(localStorage.getItem('gatework:form-generator:arco:v1')!)
  expect(saved.fields.map((field: { name: string }) => field.name)).toEqual(['field1', 'field2'])
  await button('删除').trigger('click')
  expect(wrapper.findAll('.builder-field')).toHaveLength(1)
})
it('validates a required field before showing data and resets its value', async() => {
  const schema = emptySchema()
  schema.fields.push({ ...createField('input', [], 'Name', 'Option'), required: true })
  wrapper = mount(Preview, { props: { schema }, global: { plugins: [ArcoVue] } })
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  expect(wrapper.find('.arco-form-item-message').text()).toContain('Name')
  expect(wrapper.find('pre').exists()).toBe(false)
  await wrapper.find('input').setValue('Ada')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  expect(wrapper.find('pre').text()).toContain('Ada')
  await wrapper.find('input').setValue('')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  expect(wrapper.find('pre').exists()).toBe(false)
  await button('重置').trigger('click')
  expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  expect(wrapper.find('pre').exists()).toBe(false)
})

it('validates checkbox selection bounds before submitting', async() => {
  const schema = emptySchema()
  const field = createField('checkbox', [], 'Choices', 'Option')
  field.properties = { min: 2, max: 2 }
  schema.fields.push(field)
  wrapper = mount(Preview, { props: { schema }, global: { plugins: [ArcoVue] } })
  await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  expect(wrapper.find('.arco-form-item-message').exists()).toBe(true)
  expect(wrapper.find('pre').exists()).toBe(false)
  await wrapper.findAll('input[type="checkbox"]')[1].setValue(true)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  expect(wrapper.find('pre').text()).toContain('"2"')
})

it('table action columns emit the chosen action with the actual row', async() => {
  const field = createField('table', [], 'Users', 'Option')
  field.columns = [{ title: 'Name', dataIndex: 'name' }, { title: 'Actions', dataIndex: 'actions', actions: [{ name: 'edit', label: 'Edit' }] }]
  field.rows = [{ id: 7, name: 'Ada' }]
  wrapper = mount(FieldControl, { props: { field }, global: { plugins: [ArcoVue] } })
  expect(wrapper.text()).toContain('Ada')
  await button('Edit').trigger('click')
  expect(wrapper.emitted('action')).toEqual([[{ field: 'field1', action: 'edit', record: { id: 7, name: 'Ada' } }]])
  await wrapper.setProps({ field: { ...field, disabled: true } })
  expect(button('Edit').attributes('disabled')).toBeDefined()
})

it('applies Arco numeric read-only and upload button visibility settings', async() => {
  const field = createField('number', [], 'Quantity', 'Option')
  field.properties.readonly = true
  wrapper = mount(FieldControl, { props: { field }, global: { plugins: [ArcoVue] } })
  expect(wrapper.find('input').attributes('readonly')).toBeDefined()
  wrapper.unmount()
  const upload = createField('upload', [], 'File', 'Option')
  upload.properties.hideButton = true
  wrapper = mount(FieldControl, { props: { field: upload }, global: { plugins: [ArcoVue] } })
  expect(wrapper.find('input[type="file"]').exists()).toBe(false)
  await wrapper.setProps({ field: { ...upload, properties: { hideButton: false } } })
  expect(wrapper.find('input[type="file"]').exists()).toBe(true)
})

it('accepts required switches with independently typed on and off values', async() => {
  const schema = emptySchema()
  const field = createField('switch', [], 'Enabled', 'Option')
  field.required = true
  field.properties = { checkedValue: 'yes', uncheckedValue: false }
  schema.fields.push(field)
  wrapper = mount(Preview, { props: { schema }, global: { plugins: [ArcoVue] } })
  await wrapper.find('[role="switch"]').trigger('click')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  expect(wrapper.find('pre').text()).toContain('"yes"')
  await wrapper.find('[role="switch"]').trigger('click')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  expect(wrapper.find('pre').text()).toContain('false')
})

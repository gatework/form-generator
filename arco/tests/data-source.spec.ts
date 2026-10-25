import { afterEach, expect, it, vi } from 'vitest'
import { defaultDataSource, validateDataSource, loadDataSource } from '../src/data-source'

const source = (overrides = {}) => ({ ...defaultDataSource(), enabled: true, url: '/api/options', ...overrides })
afterEach(() => vi.unstubAllGlobals())
it('normalizes an omitted source without requesting data', () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  expect(validateDataSource(undefined)).toEqual({ enabled: false, url: '', method: 'GET', path: '', labelKey: 'label', valueKey: 'value', childrenKey: 'children', body: '' })
  expect(fetch).not.toHaveBeenCalled()
})
it.each(['javascript:alert(1)', 'data:application/json,[]', '//elsewhere.test/options', 'https://user:password@example.test/options', '\\evil.test/path', 'https:\\evil.test/path'])('rejects unsafe endpoint %s before requesting', async url => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  await expect(loadDataSource(source({ url }), 'options')).rejects.toThrow(/URL|endpoint/i)
  expect(fetch).not.toHaveBeenCalled()
})
it('maps nested remote keys and a bracket-index response path', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ data: [{ records: [{ title: 'Parent', id: 7, nodes: [{ title: 'Leaf', id: '8' }] }] }] })))
  expect(await loadDataSource(source({ path: 'data[0].records', labelKey: 'title', valueKey: 'id', childrenKey: 'nodes' }), 'options')).toEqual([{ label: 'Parent', value: 7, children: [{ label: 'Leaf', value: '8' }] }])
})
it('sends JSON POST with the abort signal and returns table records', async () => {
  const abort = new AbortController()
  const fetch = vi.fn(async () => Response.json({ rows: [{ id: 1, title: 'A' }] }))
  vi.stubGlobal('fetch', fetch)
  expect(await loadDataSource(source({ method: 'POST', body: '{"page":2}', path: 'rows' }), 'table', abort.signal)).toEqual([{ id: 1, title: 'A' }])
  expect(fetch).toHaveBeenCalledWith('/api/options', expect.objectContaining({ method: 'POST', body: '{"page":2}', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', signal: abort.signal }))
})
it.each([
  [{ data: {} }, 'data', /array/i],
  [{ data: [null] }, 'data', /option/i],
  [{ data: [{ label: 'X', value: {} }] }, 'data', /value/i],
  [{ data: [{ label: 'X', value: 1, children: {} }] }, 'data', /array/i],
  [{ data: [] }, 'missing', /path/i],
  [{}, 'constructor', /path/i],
  [{}, 'data[alert(1)]', /path/i]
])('rejects malformed option payloads and unsafe paths', async (payload, path, error) => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(payload)))
  await expect(loadDataSource(source({ path }), 'options')).rejects.toThrow(error)
})
it('rejects nonrecord table rows', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json([['not', 'a', 'row']])))
  await expect(loadDataSource(source(), 'table')).rejects.toThrow(/row/i)
})
it('reports HTTP errors without attempting to map the body', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('Unavailable', { status: 503 })))
  await expect(loadDataSource(source(), 'options')).rejects.toThrow(/503/)
})
it('reports invalid JSON responses and malformed POST bodies', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>error</html>')))
  await expect(loadDataSource(source(), 'options')).rejects.toThrow(/JSON/i)
  await expect(loadDataSource(source({ method: 'POST', body: '{broken' }), 'options')).rejects.toThrow(/body/i)
})
it('does not return stale payloads when cancellation happens during response parsing', async () => {
  const controller = new AbortController()
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => { controller.abort(); return [{ label: 'Stale', value: 1 }] } })))
  await expect(loadDataSource(source(), 'options', controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
})

import { mount, flushPromises } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import DynamicControl from '../src/DynamicControl.vue'
import FieldControl from '../src/FieldControl'
import { createField, type Field } from '../src/schema'
import { locale } from '../src/locale'

function remoteField() {
  return { ...createField('select', [], 'Remote', 'Option'), dataSource: source(), rows: [] } as Field & { dataSource: ReturnType<typeof source> }
}
it('loads only enabled sources, keeps the model and ignores stale responses after a reactive source edit', async () => {
  const pending: { resolve: (value: Response) => void; signal: AbortSignal }[] = []
  vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise<Response>(resolve => pending.push({ resolve, signal: init.signal }))))
  const field = reactive(remoteField())
  const wrapper = mount(DynamicControl, { props: { field, modelValue: 'saved' } })
  try {
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    field.dataSource.url = '/api/latest'
    await nextTick()
    expect(pending[0]!.signal.aborted).toBe(true)
    pending[1]!.resolve(Response.json([{ label: 'Latest', value: 'new' }]))
    await flushPromises()
    pending[0]!.resolve(Response.json([{ label: 'Stale', value: 'old' }]))
    await flushPromises()
    expect(wrapper.findComponent(FieldControl).props('field').options).toEqual([{ label: 'Latest', value: 'new' }])
    expect(wrapper.findComponent(FieldControl).props('modelValue')).toBe('saved')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    field.dataSource.enabled = false
    await nextTick()
    expect(wrapper.findComponent(FieldControl).props('field').options).toEqual(field.options)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  } finally { wrapper.unmount() }
})
it('shows a failed load with retry, recovers options and aborts on unmount', async () => {
  locale.value = 'en-US'
  let calls = 0
  let signal: AbortSignal | undefined
  vi.stubGlobal('fetch', vi.fn(async (_url, init) => { signal = init.signal; return ++calls === 1 ? new Response('', { status: 502 }) : Response.json([{ label: 'Recovered', value: 1 }]) }))
  const wrapper = mount(DynamicControl, { props: { field: remoteField(), modelValue: '' } })
  try {
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain('502')
    await wrapper.find('button.data-source-retry').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.findComponent(FieldControl).props('field').options).toEqual([{ label: 'Recovered', value: 1 }])
  } finally { wrapper.unmount(); locale.value = 'zh-CN' }
  expect(signal?.aborted).toBe(true)
})
it('never fetches for a static field or after unmount', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const field = reactive(remoteField())
  field.dataSource.enabled = false
  const wrapper = mount(DynamicControl, { props: { field, modelValue: '' } })
  expect(fetch).not.toHaveBeenCalled()
  wrapper.unmount()
  field.dataSource.enabled = true
  await nextTick()
  expect(fetch).not.toHaveBeenCalled()
})

it('ignores an obsolete request rejection and retains successful options after a later failure', async () => {
  const pending: { resolve: (value: Response) => void; reject: (error: Error) => void }[] = []
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve, reject) => pending.push({ resolve, reject }))))
  const field = reactive(remoteField())
  const wrapper = mount(DynamicControl, { props: { field, modelValue: 1 } })
  try {
    field.dataSource.url = '/api/new'
    await nextTick()
    pending[1]!.resolve(Response.json([{ label: 'Keep me', value: 1 }]))
    await flushPromises()
    pending[0]!.reject(new Error('Obsolete connection failed'))
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    field.dataSource.url = '/api/broken'
    await nextTick()
    pending[2]!.reject(new Error('Connection failed'))
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain('Connection failed')
    expect(wrapper.findComponent(FieldControl).props('field').options).toEqual([{ label: 'Keep me', value: 1 }])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  } finally { wrapper.unmount() }
})
it('aborts an in-flight request when the preview control unmounts', async () => {
  let requestSignal: AbortSignal | undefined
  let resolve: (value: Response) => void = () => {}
  vi.stubGlobal('fetch', vi.fn((_url, init) => { requestSignal = init.signal; return new Promise<Response>(done => { resolve = done }) }))
  const wrapper = mount(DynamicControl, { props: { field: remoteField(), modelValue: '' } })
  wrapper.unmount()
  expect(requestSignal?.aborted).toBe(true)
  resolve(Response.json([{ label: 'Too late', value: 1 }]))
  await flushPromises()
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
})

it('renders authoring controls without requesting their configured remote source', () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const wrapper = mount(FieldControl, { props: { field: remoteField(), modelValue: '' } })
  try {
    expect(wrapper.find('.arco-select-view').exists()).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  } finally { wrapper.unmount() }
})

it('renders remote table rows using the configured response path', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ result: [{ name: 'Remote row' }] })))
  const field = createField('table', [], 'Records', 'Name')
  field.dataSource = source({ path: 'result' })
  const wrapper = mount(DynamicControl, { props: { field } })
  try {
    await flushPromises()
    expect(wrapper.find('.arco-table').text()).toContain('Remote row')
    expect(wrapper.findComponent(FieldControl).props('field').rows).toEqual([{ name: 'Remote row' }])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  } finally { wrapper.unmount() }
})

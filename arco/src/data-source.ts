/** Shared by preview and exported forms. Importing this module never sends requests. */
export interface DataSource {
  enabled: boolean
  url: string
  method: 'GET' | 'POST'
  path: string
  labelKey: string
  valueKey: string
  childrenKey: string
  body: string
}
export interface DataOption { label: string; value: string | number; children?: DataOption[] }
export const defaultDataSource = (): DataSource => ({ enabled: false, url: '', method: 'GET', path: '', labelKey: 'label', valueKey: 'value', childrenKey: 'children', body: '' })
const dataRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const unsafeDataKey = (key: string) => ['__proto__', 'prototype', 'constructor'].includes(key)

function dataPathParts(path: string): string[] {
  if (!path) return []
  if (!/^[\w$-]+(?:\[\d+\]|\.[\w$-]+)*$/.test(path)) throw new Error('Invalid data path; use dot-separated keys or numeric brackets')
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.')
  if (parts.some(unsafeDataKey)) throw new Error('Invalid data path')
  return parts
}

/** Only explicit HTTP(S) URLs or relative same-origin paths are accepted. */
export function validateDataSource(value: unknown): DataSource {
  if (value === undefined) return defaultDataSource()
  if (!dataRecord(value)) throw new Error('Invalid data source')
  const source = { ...defaultDataSource(), ...value }
  if (typeof source.enabled !== 'boolean' || !['GET', 'POST'].includes(source.method) || !(['url', 'path', 'labelKey', 'valueKey', 'childrenKey', 'body'] as const).every(key => typeof source[key] === 'string')) throw new Error('Invalid data source properties')
  const result: DataSource = { enabled: source.enabled, url: source.url.trim(), method: source.method, path: source.path.trim(), labelKey: source.labelKey, valueKey: source.valueKey, childrenKey: source.childrenKey, body: source.body }
  dataPathParts(result.path)
  for (const key of [result.labelKey, result.valueKey, result.childrenKey]) {
    if (!key || unsafeDataKey(key)) throw new Error('Invalid data source mapping key')
  }
  if (result.enabled || result.url) {
    if (!result.url || /[\\\u0000-\u0020]/.test(result.url) || result.url.startsWith('//')) throw new Error('Invalid endpoint URL')
    if (/^[a-z][a-z\d+.-]*:/i.test(result.url)) {
      let url: URL
      try { url = new URL(result.url) } catch { throw new Error('Invalid endpoint URL') }
      if (!/^https?:\/\//i.test(result.url) || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Endpoint URL must use HTTP(S) without embedded credentials')
    }
  }
  if (result.method === 'POST' && result.body.trim()) {
    try { JSON.parse(result.body) } catch { throw new Error('POST body must be valid JSON') }
  }
  return result
}

function dataAtPath(payload: unknown, path: string): unknown {
  let value = payload
  for (const key of dataPathParts(path)) {
    if (value === null || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, key)) throw new Error(`Data path "${path}" was not found in the response`)
    value = (value as Record<string, unknown>)[key]
  }
  return value
}

function mapDataOptions(value: unknown, source: DataSource, depth = 0): DataOption[] {
  if (!Array.isArray(value)) throw new Error('Options must be an array')
  if (depth >= 10 || value.length > 500) throw new Error('Options exceed the supported size or nesting depth')
  return value.map((item, index) => {
    if (!dataRecord(item)) throw new Error(`Option ${index + 1} must be an object`)
    const label = item[source.labelKey]
    const optionValue = item[source.valueKey]
    if (typeof label !== 'string') throw new Error(`Option ${index + 1} label must be a string`)
    if (typeof optionValue !== 'string' && !(typeof optionValue === 'number' && Number.isFinite(optionValue))) throw new Error(`Option ${index + 1} value must be a string or finite number`)
    const option: DataOption = { label, value: optionValue }
    if (Object.prototype.hasOwnProperty.call(item, source.childrenKey)) option.children = mapDataOptions(item[source.childrenKey], source, depth + 1)
    return option
  })
}

export function loadDataSource(source: DataSource, kind: 'options', signal?: AbortSignal): Promise<DataOption[]>
export function loadDataSource(source: DataSource, kind: 'table', signal?: AbortSignal): Promise<Record<string, unknown>[]>
export function loadDataSource(source: DataSource, kind: 'options' | 'table', signal?: AbortSignal): Promise<DataOption[] | Record<string, unknown>[]>
export async function loadDataSource(source: DataSource, kind: 'options' | 'table', signal?: AbortSignal): Promise<DataOption[] | Record<string, unknown>[]> {
  const config = validateDataSource(source)
  if (!config.enabled) return []
  signal?.throwIfAborted()
  const response = await fetch(config.url, {
    method: config.method, signal, credentials: 'omit',
    ...(config.method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: config.body.trim() || '{}' } : {})
  })
  signal?.throwIfAborted()
  if (!response.ok) throw new Error(`Request failed (HTTP ${response.status})`)
  let payload: unknown
  try { payload = await response.json() } catch (error) {
    signal?.throwIfAborted()
    throw new Error('Response is not valid JSON', { cause: error })
  }
  signal?.throwIfAborted()
  const result = dataAtPath(payload, config.path)
  if (kind === 'options') return mapDataOptions(result, config)
  if (!Array.isArray(result)) throw new Error('Table data must be an array')
  if (!result.every(dataRecord)) throw new Error('Each table row must be an object')
  return result
}

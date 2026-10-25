import type { FieldRule } from '@arco-design/web-vue'
import { defaultDataSource, validateDataSource, type DataSource } from './data-source.ts'
export { generateVue } from './generate.ts'

export const fieldTypes = ['input', 'textarea', 'password', 'number', 'richtext', 'select', 'cascader', 'radio', 'checkbox', 'switch', 'slider', 'time', 'timeRange', 'date', 'dateRange', 'rate', 'color', 'upload', 'row', 'button', 'table'] as const
export type FieldType = typeof fieldTypes[number]
export type Option = { label: string, value: string | number, children?: Option[] }
export interface Field {
  id: string
  type: FieldType
  name: string
  label: string
  placeholder: string
  required: boolean
  disabled: boolean
  span: number
  defaultValue: unknown
  options: Option[]
  multiple: boolean
  min: number
  max: number
  step: number
  children: Field[]
  showLabel: boolean
  labelWidth: number
  properties: Record<string, unknown>
  validation: Array<{ pattern: string, message: string }>
  dataSource: DataSource
  columns: Array<{ title: string, dataIndex: string, width?: number, actions?: Array<{ name: string, label: string, type?: 'primary' | 'secondary' | 'outline' | 'dashed' | 'text' }> }>
  rows: Record<string, unknown>[]
}
export interface Schema {
  version: 1
  layout: 'horizontal' | 'vertical' | 'inline'
  size: 'mini' | 'small' | 'medium' | 'large'
  labelAlign: 'left' | 'right'
  labelWidth: number
  gutter: number
  disabled: boolean
  formButtons: boolean
  fields: Field[]
}
export const emptySchema = (): Schema => ({ version: 1, layout: 'horizontal', size: 'medium', labelAlign: 'right', labelWidth: 100, gutter: 16, disabled: false, formButtons: true, fields: [] })
export const hasOptions = (type: FieldType) => ['select', 'cascader', 'radio', 'checkbox'].includes(type)
export const isNumeric = (type: FieldType) => ['number', 'slider', 'rate'].includes(type)
export const isArray = (field: Pick<Field, 'type' | 'multiple'> & { properties?: Record<string, unknown> }) => ['checkbox', 'timeRange', 'dateRange', 'upload'].includes(field.type) || (['select', 'cascader'].includes(field.type) && field.multiple) || (field.type === 'slider' && !!field.properties?.range) || (field.type === 'cascader' && !!field.properties?.pathMode)
export const clone = <T>(value: T): T => value === undefined ? value : JSON.parse(JSON.stringify(value))
export const flattenFields = (fields: Field[]): Field[] => fields.flatMap(field => [field, ...flattenFields(field.children ?? [])])
export const isModelField = (field: Field) => !['row', 'button', 'table'].includes(field.type)
export function locateField(fields: Field[], id: string): { list: Field[], index: number, field: Field } | undefined {
  for (let index = 0; index < fields.length; index++) {
    if (fields[index].id === id) return { list: fields, index, field: fields[index] }
    const found = locateField(fields[index].children ?? [], id)
    if (found) return found
  }
}
export function moveField(fields: Field[], id: string, parentId: string | undefined, index: number): boolean {
  const source = locateField(fields, id)
  const parent = parentId ? locateField(fields, parentId)?.field : undefined
  if (!source || (parentId && (!parent || parent.type !== 'row')) || (parent && flattenFields([source.field]).some(field => field.id === parent.id))) return false
  const target = parent ? parent.children : fields
  if (source.list === target && source.index < index) index--
  source.list.splice(source.index, 1)
  target.splice(Math.max(0, Math.min(index, target.length)), 0, source.field)
  return true
}
export function createField(type: FieldType, fields: Field[], label: string, optionLabel: string): Field {
  let index = 1
  const occupied = new Set(flattenFields(fields).map(field => field.name))
  while (occupied.has(`field${index}`)) index++
  return {
    id: crypto.randomUUID(), type, name: `field${index}`, label, placeholder: '',
    required: false, disabled: false, span: 24, showLabel: true, labelWidth: 0,
    defaultValue: isArray({ type, multiple: false }) ? [] : type === 'switch' ? false : isNumeric(type) ? 0 : '',
    options: hasOptions(type) ? [{ label: `${optionLabel} 1`, value: '1' }, { label: `${optionLabel} 2`, value: '2' }] : [],
    multiple: false, min: 0, max: type === 'rate' ? 5 : 100, step: 1, children: [], validation: [],
    properties: type === 'row' ? { gutter: 16, justify: 'start', align: 'start' } : type === 'button' ? { type: 'primary', buttonAction: 'button' } : type === 'richtext' ? { height: 300 } : {},
    dataSource: defaultDataSource(), columns: [{ title: optionLabel, dataIndex: 'name' }], rows: []
  }
}
export function duplicateField(field: Field, rootFields: Field[]): Field {
  const copy = clone(field)
  const occupied = [...flattenFields(rootFields)]
  for (const child of flattenFields([copy])) {
    const fresh = createField(child.type, occupied, child.label, '')
    child.id = fresh.id; child.name = fresh.name
    occupied.push(child)
  }
  return copy
}
export const componentNames: Record<FieldType, string> = {
  input: 'Input', textarea: 'Textarea', password: 'InputPassword', number: 'InputNumber', richtext: 'RichText',
  select: 'Select', cascader: 'Cascader', radio: 'RadioGroup', checkbox: 'CheckboxGroup', switch: 'Switch', slider: 'Slider',
  time: 'TimePicker', timeRange: 'TimePicker', date: 'DatePicker', dateRange: 'RangePicker', rate: 'Rate', color: 'ColorPicker', upload: 'Upload',
  row: 'Row', button: 'Button', table: 'Table'
}

/** Shared by canvas, preview and exported runtime; authoring never sends uploaded files. */
export function fieldProps(field: Field, runtime = false): Record<string, unknown> {
  const props: Record<string, unknown> = { disabled: field.disabled }
  if (['input', 'password', 'number'].includes(field.type)) props.inputAttrs = { 'aria-label': field.label }
  if (field.type === 'textarea') props.textareaAttrs = { 'aria-label': field.label }
  if (['input', 'textarea', 'password', 'number', 'select', 'cascader', 'time', 'date'].includes(field.type)) props.placeholder = field.placeholder
  if (['input', 'password', 'select', 'cascader', 'time', 'date', 'dateRange', 'timeRange'].includes(field.type)) props.allowClear = true
  if (hasOptions(field.type)) props.options = field.options
  if (['select', 'cascader'].includes(field.type)) { props.multiple = field.multiple; props.allowSearch = true }
  if (field.type === 'textarea') props.autoSize = { minRows: 3, maxRows: 6 }
  if (field.type === 'number' || field.type === 'slider') Object.assign(props, { min: field.min, max: field.max, step: field.step })
  if (field.type === 'rate') props.count = field.max
  if (field.type === 'timeRange') props.type = 'time-range'
  if (field.type === 'date' || field.type === 'dateRange') props.valueFormat = 'YYYY-MM-DD'
  if (field.type === 'upload') { props.multiple = field.multiple; props.autoUpload = false }
  if (field.type === 'table') Object.assign(props, { columns: field.columns.map(({ actions, ...column }, index) => ({ ...column, ...(actions?.length ? { slotName: `action${index}` } : {}) })), data: field.rows, pagination: false, bordered: true })
  Object.assign(props, field.properties)
  props.style = { width: String(field.properties.width || (['button', 'switch', 'rate', 'color', 'radio', 'checkbox'].includes(field.type) ? 'auto' : '100%')) }
  delete props.width
  delete props.buttonAction; delete props.maxSizeMB; delete props.prefixIcon; delete props.suffixIcon; delete props.icon
  if (['dateRange', 'timeRange'].includes(field.type)) {
    if (field.properties.startPlaceholder || field.properties.endPlaceholder) props.placeholder = [field.properties.startPlaceholder ?? '', field.properties.endPlaceholder ?? '']
    delete props.startPlaceholder; delete props.endPlaceholder
  }
  if (field.type === 'upload' && props.hideButton !== undefined) { props.showUploadButton = !props.hideButton; delete props.hideButton }
  if (field.type === 'time' || field.type === 'timeRange') delete props.valueFormat
  if (field.type === 'upload' && runtime && !props.action) props.autoUpload = false
  if (field.type === 'upload' && !runtime) { props.autoUpload = false; delete props.action }
  if (field.type === 'button') props.htmlType = field.properties.buttonAction === 'submit' ? 'submit' : 'button'
  if (field.type === 'color') { if (props.colorFormat) props.format = props.colorFormat; if (props.showAlpha !== undefined) props.disabledAlpha = !props.showAlpha; delete props.showAlpha; delete props.colorFormat }
  if (field.type === 'rate') delete props.showText
  if (field.type === 'number') { if (props.readonly !== undefined) props.readOnly = props.readonly; delete props.readonly }
  if (field.type === 'richtext') { props.height ??= 300; props.readOnly = props.readOnly ?? props.readonly; delete props.readonly }
  return props
}
export function fieldRules(field: Field, message: string): FieldRule[] {
  if (!isModelField(field)) return []
  const rules: FieldRule[] = field.required ? [{ required: true, type: isArray(field) ? 'array' : field.type === 'switch' ? (typeof field.defaultValue as 'boolean' | 'string' | 'number') : isNumeric(field.type) ? 'number' : undefined, message }] : []
  if (field.type === 'checkbox' && (field.properties.min !== undefined || field.properties.max !== undefined)) rules.push({ type: 'array', minLength: field.properties.min as number | undefined, maxLength: field.properties.max as number | undefined })
  for (const validation of field.validation ?? []) rules.push({ match: new RegExp(validation.pattern), message: validation.message })
  return rules
}
export const defaultModel = (schema: Schema): Record<string, unknown> => Object.fromEntries(flattenFields(schema.fields).filter(isModelField).map(field => [field.name, isNumeric(field.type) && field.defaultValue == null ? undefined : clone(field.defaultValue)]))

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const validOptions = (options: unknown, depth = 0): options is Option[] => depth < 10 && Array.isArray(options) && options.length <= 500 && options.every(option => record(option) && typeof option.label === 'string' && (typeof option.value === 'string' || (typeof option.value === 'number' && Number.isFinite(option.value))) && (option.children === undefined || validOptions(option.children, depth + 1)))
export function parseOptions(text: string): Option[] {
  const options: unknown = JSON.parse(text)
  if (!validOptions(options)) throw new Error('Invalid options')
  return options
}
const boolProps = ['allowClear', 'readonly', 'readOnly', 'showWordLimit', 'allowSearch', 'checkStrictly', 'pathMode', 'range', 'showTicks', 'showInput', 'showTime', 'allowHalf', 'showText', 'showAlpha', 'autoUpload', 'bordered', 'stripe', 'hoverable', 'virtualList', 'loading', 'long', 'hideButton', 'showFileList', 'showConfirmBtn']
const numberProps = ['maxLength', 'minLength', 'precision', 'limit', 'maxSizeMB', 'height', 'gutter', 'min', 'max']
const stringProps = ['prepend', 'append', 'prefixIcon', 'suffixIcon', 'icon', 'mode', 'format', 'valueFormat', 'checkedText', 'uncheckedText', 'accept', 'action', 'name', 'listType', 'type', 'status', 'shape', 'buttonAction', 'direction', 'justify', 'align', 'expandTrigger', 'colorFormat', 'width', 'startPlaceholder', 'endPlaceholder', 'showCheckedStrategy']
export function validateProperties(value: unknown): Record<string, unknown> {
  if (!record(value)) throw new Error('Invalid properties')
  for (const [key, item] of Object.entries(value)) {
    if (boolProps.includes(key) && typeof item === 'boolean') continue
    if (numberProps.includes(key) && typeof item === 'number' && Number.isFinite(item) && item >= 0) continue
    if (stringProps.includes(key) && typeof item === 'string' && item.length < 4000) continue
    if (['checkedValue', 'uncheckedValue'].includes(key) && ['boolean', 'string', 'number'].includes(typeof item)) continue
    if (key === 'autoSize' && record(item) && Number.isInteger(item.minRows) && Number.isInteger(item.maxRows) && Number(item.minRows) >= 1 && Number(item.maxRows) >= Number(item.minRows)) continue
    throw new Error(`Invalid property: ${key}`)
  }
  if (typeof value.action === 'string' && value.action && !/^https?:\/\//.test(value.action) && !/^\/(?!\/)/.test(value.action)) throw new Error('Invalid upload URL')
  return clone(value)
}

/** Reject code, invalid tree identities and incomplete configuration before replacing drafts. */
export function parseSchema(text: string): Schema {
  const value: unknown = JSON.parse(text)
  if (!record(value) || value.version !== 1 || !['horizontal', 'vertical', 'inline'].includes(String(value.layout)) || !['mini', 'small', 'medium', 'large'].includes(String(value.size)) || !Array.isArray(value.fields)) throw new Error('Invalid schema')
  const names = new Set<string>(); const ids = new Set<string>()
  function parseField(item: unknown, depth: number): Field {
    if (depth > 8 || ids.size >= 200) throw new Error('Form exceeds nesting or field limit')
    if (!record(item) || !fieldTypes.includes(item.type as FieldType) || typeof item.id !== 'string' || !item.id || ids.has(item.id) || typeof item.name !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(item.name) || ['__proto__', 'constructor', 'prototype'].includes(item.name) || names.has(item.name)) throw new Error('Invalid field')
    if (typeof item.label !== 'string' || typeof item.placeholder !== 'string' || typeof item.required !== 'boolean' || typeof item.disabled !== 'boolean' || typeof item.multiple !== 'boolean' || !Number.isInteger(item.span) || Number(item.span) < 1 || Number(item.span) > 24 || !validOptions(item.options)) throw new Error('Invalid field properties')
    if (![item.min, item.max, item.step].every(number => typeof number === 'number' && Number.isFinite(number)) || Number(item.min) > Number(item.max) || Number(item.step) <= 0 || (item.type === 'rate' && (!Number.isInteger(item.max) || Number(item.max) < 1 || Number(item.max) > 10))) throw new Error('Invalid limits')
    const validation = item.validation ?? []
    if (!Array.isArray(validation) || validation.length > 30) throw new Error('Invalid validation rules')
    for (const rule of validation) {
      if (!record(rule) || typeof rule.pattern !== 'string' || rule.pattern.length > 1000 || typeof rule.message !== 'string') throw new Error('Invalid validation rule')
      new RegExp(rule.pattern)
    }
    const labelWidth = Number(item.labelWidth ?? 0)
    if (!Number.isFinite(labelWidth) || labelWidth < 0 || labelWidth > 1000 || (item.showLabel !== undefined && typeof item.showLabel !== 'boolean')) throw new Error('Invalid label configuration')
    const columns = item.columns ?? []
    const rows = item.rows ?? []
    if (!Array.isArray(columns) || columns.length > 100 || !columns.every(column => record(column) && typeof column.title === 'string' && typeof column.dataIndex === 'string' && (column.width === undefined || (typeof column.width === 'number' && column.width > 0)))) throw new Error('Invalid table columns')
    for (const column of columns) if (column.actions !== undefined && (!Array.isArray(column.actions) || column.actions.length > 20 || !column.actions.every((action: unknown) => record(action) && typeof action.name === 'string' && !!action.name && typeof action.label === 'string' && (action.type === undefined || ['primary', 'secondary', 'outline', 'dashed', 'text'].includes(String(action.type)))))) throw new Error('Invalid table actions')
    if (!Array.isArray(rows) || rows.length > 10000 || !rows.every(record)) throw new Error('Invalid table rows')
    names.add(item.name); ids.add(item.id)
    const children = item.children ?? []
    if (!Array.isArray(children) || (item.type !== 'row' && children.length)) throw new Error('Only row containers can have children')
    const field: Field = {
      id: item.id, type: item.type as FieldType, name: item.name, label: item.label, placeholder: item.placeholder,
      required: item.required, disabled: item.disabled, multiple: item.multiple, span: Number(item.span),
      min: Number(item.min), max: Number(item.max), step: Number(item.step), options: clone(item.options),
      defaultValue: item.defaultValue ?? (isNumeric(item.type as FieldType) ? null : ''), showLabel: item.showLabel !== false, labelWidth,
      properties: validateProperties(item.properties ?? {}), validation: clone(validation), dataSource: validateDataSource(item.dataSource ?? defaultDataSource()),
      columns: clone(columns), rows: clone(rows), children: children.map(child => parseField(child, depth + 1))
    }
    if (field.type === 'checkbox' && typeof field.properties.min === 'number' && typeof field.properties.max === 'number' && field.properties.min > field.properties.max) throw new Error('Invalid selection limits')
    if (field.dataSource.enabled && !hasOptions(field.type) && field.type !== 'table') throw new Error('This control does not support a data source')
    const initial = field.defaultValue
    if (isModelField(field)) {
      if (isArray(field) ? !Array.isArray(initial) || !initial.every(entry => typeof entry === 'string' || typeof entry === 'number' || (field.type === 'cascader' && field.multiple && field.properties.pathMode && Array.isArray(entry) && entry.every(value => typeof value === 'string' || typeof value === 'number'))) : field.type === 'switch' ? !['boolean', 'string', 'number'].includes(typeof initial) : isNumeric(field.type) ? initial !== null && (typeof initial !== 'number' || !Number.isFinite(initial)) : !['string', 'number'].includes(typeof initial)) throw new Error('Invalid default value')
      if (field.type === 'upload' && (initial as unknown[]).length) throw new Error('Upload defaults must be empty')
    }
    return field
  }
  const form = { ...emptySchema(), ...value, fields: value.fields.map(field => parseField(field, 0)) } as Schema
  if (!['left', 'right'].includes(form.labelAlign) || typeof form.disabled !== 'boolean' || typeof form.formButtons !== 'boolean' || !Number.isFinite(form.labelWidth) || form.labelWidth < 0 || form.labelWidth > 1000 || !Number.isFinite(form.gutter) || form.gutter < 0 || form.gutter > 100) throw new Error('Invalid form configuration')
  return form
}

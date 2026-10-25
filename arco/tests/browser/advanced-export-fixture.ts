import { configureGenerator, generateVue } from '../../src/generate.ts'
import { createField, emptySchema, type FieldType } from '../../src/schema.ts'

/** Shared by the production browser fixture and its independent SFC type check. */
export function createAdvancedExports(dataSource: string): Record<string, string> {
  configureGenerator({ richText: '', dataSource })
  const field = (type: FieldType, name: string, label: string) => ({ ...createField(type, [], label, 'Option'), name })
  const schema = emptySchema()
  const outer = field('row', 'outer', 'Outer row')
  const inner = field('row', 'inner', 'Inner row')
  const account = field('input', 'account', 'Account')
  account.required = true
  account.properties = { prefixIcon: 'IconUser', suffixIcon: 'IconSearch', prepend: 'account:', append: '@example.test' }
  account.validation = [{ pattern: '^[A-Z]{3}$', message: 'Use three uppercase letters' }]
  const enabled = field('switch', 'enabled', 'Enabled')
  enabled.required = true
  enabled.defaultValue = false
  enabled.properties = { checkedValue: 'on', uncheckedValue: false, checkedText: 'Enabled value', uncheckedText: 'Disabled value' }
  const choices = field('checkbox', 'choices', 'Choices')
  choices.properties = { min: 1, max: 2 }
  choices.options = [{ label: 'Alpha', value: 'a' }, { label: 'Beta', value: 'b' }, { label: 'Gamma', value: 'c' }]
  inner.children.push(account, enabled, choices)
  outer.children.push(inner)
  const remote = field('select', 'remoteChoice', 'Remote choice')
  remote.required = true
  remote.options = []
  remote.dataSource = { ...remote.dataSource, enabled: true, url: '/api/options', method: 'GET', path: 'payload.choices', labelKey: 'caption', valueKey: 'id' }
  const table = field('table', 'records', 'Records')
  table.columns = [{ title: 'Name', dataIndex: 'name' }, { title: 'Actions', dataIndex: 'actions', actions: [{ name: 'inspect', label: 'Inspect row', type: 'outline' }] }]
  table.dataSource = { ...table.dataSource, enabled: true, url: '/api/rows', method: 'POST', path: 'payload.rows', body: '{"category":"network"}' }
  const action = field('button', 'notify', 'Notify application')
  action.properties = { buttonAction: 'button', type: 'secondary' }
  const upload = field('upload', 'attachment', 'Attachment')
  upload.properties = { maxSizeMB: 1 }
  schema.fields = [outer, remote, table, action, upload]
  const copy = { submit: 'Submit', reset: 'Reset', required: (label: string) => `Required ${label}`, locale: 'en-US', dark: false }
  const active = generateVue(schema, copy)

  // Keep disabled cases local so only the active form performs network requests.
  remote.dataSource.enabled = false
  remote.options = [{ label: 'Local option', value: 'local' }]
  table.dataSource.enabled = false
  table.rows = [{ key: 'disabled-record', name: 'Local disabled record' }]
  schema.disabled = true
  const disabled = generateVue(schema, copy)
  schema.disabled = false
  const ancestor = field('row', 'disabledAncestor', 'Disabled ancestor')
  ancestor.disabled = true
  ancestor.children = [outer, remote, table, action, upload]
  schema.fields = [ancestor]
  const nested = generateVue(schema, copy)
  return { Active: active, Disabled: disabled, Ancestor: nested }
}

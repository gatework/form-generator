import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { createField, emptySchema, fieldTypes, generateVue } from '../src/schema.ts'
const root = resolve(import.meta.dirname, '..')
const { configureGenerator } = await import('../src/generate.ts')
configureGenerator({ richText: readFileSync(resolve(root, 'src/RichText.ts'), 'utf8'), dataSource: readFileSync(resolve(root, 'src/data-source.ts'), 'utf8') })
const temp = mkdtempSync(resolve(root, '.generated-check-'))
try {
  const schema = emptySchema()
  for (const type of fieldTypes) schema.fields.push(createField(type, schema.fields, '</script>"Label', 'Option'))
  schema.fields.find(field => field.type === 'row').children.push(createField('input', schema.fields, 'Nested', 'Option'))
  schema.fields.find(field => field.type === 'select').dataSource = { enabled:true, url:'/options', method:'GET', path:'data', labelKey:'label', valueKey:'value', childrenKey:'children', body:'' }
  const properties = {
    input: { prefixIcon: 'IconUser', suffixIcon: 'IconSearch', prepend: 'https://', append: '.org', width: '80%', maxLength: 50 },
    number: { precision: 2, mode: 'button' },
    checkbox: { min: 1, max: 2 },
    switch: { checkedText: 'Yes', uncheckedText: 'No', checkedValue: 'on', uncheckedValue: 'off' },
    date: { mode: 'month', format: 'YYYY-MM', valueFormat: 'YYYY-MM' },
    rate: { allowHalf: true, showText: true },
    color: { colorFormat: 'rgb', showAlpha: true },
    upload: { action: '/upload', autoUpload: true, accept: '.png', listType: 'picture-card', maxSizeMB: 2 },
    button: { icon: 'IconSearch', type: 'outline', status: 'success', shape: 'round' }
  }
  for (const field of schema.fields) if (properties[field.type]) field.properties = properties[field.type]
  schema.fields.find(field => field.type === 'switch').defaultValue = 'off'
  schema.fields.find(field => field.type === 'table').columns.push({ title: 'Actions', dataIndex: 'actions', actions: [{ name: 'edit', label: 'Edit', type: 'text' }] })
  schema.fields[0].validation = [{ pattern: '^a+$', message: 'Letters' }]
  writeFileSync(resolve(temp, 'GeneratedForm.vue'), generateVue(schema, { submit: 'Submit', reset: 'Reset', required: label => `Required ${label}` }))
  writeFileSync(resolve(temp, 'tsconfig.json'), JSON.stringify({ extends: '../tsconfig.json', include: ['./GeneratedForm.vue'] }))
  execFileSync(process.execPath, [resolve(root, 'node_modules/vue-tsc/bin/vue-tsc.js'), '--noEmit', '-p', resolve(temp, 'tsconfig.json')], { cwd: root, stdio: 'inherit' })
  console.log('Generated Vue SFC: all field types pass vue-tsc')
} finally {
  rmSync(temp, { recursive: true, force: true })
}

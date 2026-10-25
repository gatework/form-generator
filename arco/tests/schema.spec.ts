import { describe, expect, it } from 'vitest'
import { configureGenerator } from '../src/generate'
import richTextSource from '../src/RichText.ts?raw'
import dataSourceSource from '../src/data-source.ts?raw'
configureGenerator({ richText: richTextSource, dataSource: dataSourceSource })
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { createField, defaultModel, emptySchema, fieldProps, fieldRules, fieldTypes, generateVue, parseSchema } from '../src/schema'

describe('Arco form schema', () => {
  it('round trips all supported fields with distinct names and independent defaults', () => {
    const schema = emptySchema()
    for (const type of fieldTypes) schema.fields.push(createField(type, schema.fields, type, 'Option'))
    const imported = parseSchema(JSON.stringify(schema))
    expect(imported).toEqual(schema)
    expect(new Set(imported.fields.map(field => field.name)).size).toBe(fieldTypes.length)
    const model = defaultModel(imported)
    const checkbox = imported.fields.find(field => field.type === 'checkbox')!
    ;(model[checkbox.name] as string[]).push('1')
    expect(checkbox.defaultValue).toEqual([])
  })
  it('maps Arco ranges, upload, numeric and array validation instead of Element APIs', () => {
    const field = createField('timeRange', [], 'Time', 'Option')
    expect(fieldProps(field)).toMatchObject({ type: 'time-range' })
    field.required = true
    expect(fieldRules(field, 'Required')).toEqual([{ required: true, type: 'array', message: 'Required' }])
    expect(fieldProps(createField('upload', [], 'Upload', 'Option'))).toMatchObject({ autoUpload: false })
    expect(fieldProps(createField('rate', [], 'Rate', 'Option'))).toMatchObject({ count: 5 })
  })
  it.each(['__proto__', 'constructor', 'a.b', 'x" @click="alert(1)', ''])('rejects unsafe or ambiguous field names: %s', name => {
    const schema = emptySchema()
    schema.fields.push({ ...createField('input', [], 'Name', 'Option'), name })
    expect(() => parseSchema(JSON.stringify(schema))).toThrow()
  })
  it('rejects duplicates, wrong default types and unknown legacy formats', () => {
    const schema = emptySchema()
    const field = createField('checkbox', [], 'Choices', 'Option')
    schema.fields.push(field, { ...field, id: 'different' })
    expect(() => parseSchema(JSON.stringify(schema))).toThrow()
    schema.fields = [{ ...field, defaultValue: '' }]
    expect(() => parseSchema(JSON.stringify(schema))).toThrow()
    expect(() => parseSchema('{"fields":[]}')).toThrow()
  })
  it('exports a compilable Vue 3 SFC without interpolating user content into code', () => {
    const schema = emptySchema()
    for (const type of fieldTypes) schema.fields.push(createField(type, schema.fields, '</script><img src=x onerror=alert(1)>', 'Option'))
    const source = generateVue(schema, { submit: 'Submit', reset: 'Reset', required: label => `Required ${label}` })
    const { descriptor, errors } = parse(source)
    expect(errors).toEqual([])
    expect(descriptor.scriptSetup?.content).toContain('\\u003c/script>')
    expect(source).not.toMatch(/<\/?el-|from ['"]element-(?:ui|plus)['"]/)
    const script = compileScript(descriptor, { id: 'generated' })
    const template = compileTemplate({ source: descriptor.template!.content, filename: 'GeneratedForm.vue', id: 'generated', compilerOptions: { bindingMetadata: script.bindings } })
    expect(template.errors).toEqual([])
    expect(template.code).toContain('file-list')
  })
})

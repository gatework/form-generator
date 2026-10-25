import { describe, expect, it } from 'vitest'
import { createField, defaultModel, duplicateField, emptySchema, fieldRules, flattenFields, moveField, parseSchema } from '../src/schema'

describe('nested form structure', () => {
  const nested = () => {
    const schema = emptySchema()
    const row = createField('row', schema.fields, 'Details', 'Option')
    schema.fields.push(row)
    const inner = createField('row', schema.fields, 'Inner', 'Option')
    row.children.push(inner)
    inner.children.push(createField('input', schema.fields, 'Name', 'Option'))
    return schema
  }
  it('preserves nesting and uses only input fields in submitted data', () => {
    const schema = nested()
    schema.fields.push(createField('button', schema.fields, 'Submit', 'Option'))
    expect(parseSchema(JSON.stringify(schema))).toEqual(schema)
    expect(defaultModel(schema)).toEqual({ field3: '' })
  })
  it('duplicates a whole subtree with independent defaults and unique names', () => {
    const schema = nested()
    const copy = duplicateField(schema.fields[0], schema.fields)
    schema.fields.push(copy)
    expect(flattenFields(schema.fields).map(field => field.name)).toEqual(['field1', 'field2', 'field3', 'field4', 'field5', 'field6'])
    expect(new Set(flattenFields(schema.fields).map(field => field.id)).size).toBe(6)
    copy.children[0].children[0].defaultValue = 'Copy'
    expect(defaultModel(schema)).toEqual({ field3: '', field6: 'Copy' })
  })
  it('moves between containers without creating cycles or losing siblings', () => {
    const schema = nested()
    const row = schema.fields[0], inner = row.children[0], input = inner.children[0]
    expect(moveField(schema.fields, row.id, inner.id, 0)).toBe(false)
    expect(moveField(schema.fields, input.id, undefined, 1)).toBe(true)
    expect(inner.children).toEqual([])
    expect(schema.fields[1].id).toBe(input.id)
    expect(moveField(schema.fields, input.id, row.id, 0)).toBe(true)
    expect(row.children.map(field => field.id)).toEqual([input.id, inner.id])
  })
  it('rejects duplicate field identities anywhere in the tree', () => {
    const schema = nested()
    const copy = duplicateField(schema.fields[0], schema.fields)
    copy.children[0].children[0].name = 'field3'
    schema.fields.push(copy)
    expect(() => parseSchema(JSON.stringify(schema))).toThrow('Invalid field')
  })
  it('turns authored patterns into real Arco match rules without executing expressions', () => {
    const field = createField('input', [], 'Code', 'Option')
    field.validation = [{ pattern: '^A[0-9]{3}$', message: 'Use A and three digits' }]
    const rule = fieldRules(field, 'Required')[0]
    expect(rule.match?.test('A123')).toBe(true)
    expect(rule.match?.test('B123')).toBe(false)
    const schema = emptySchema(); schema.fields.push(field)
    field.validation[0].pattern = '['
    expect(() => parseSchema(JSON.stringify(schema))).toThrow()
  })
})

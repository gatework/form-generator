import { componentNames, defaultModel, fieldProps, fieldRules, flattenFields, hasOptions, isModelField, parseSchema, type Field, type Schema } from './schema.ts'

let generatorSources = { richText: '', dataSource: '' }
export function configureGenerator(sources: typeof generatorSources) { generatorSources = sources }
/** Generate literals, never concatenate an authored label, pattern or URL as executable code. */
function literal(value: unknown, constStrings = false): string {
  if (value === undefined) return 'undefined'
  if (value instanceof RegExp) return `new RegExp(${literal(value.source)}, ${literal(value.flags)})`
  if (Array.isArray(value)) return `[${value.map(item => literal(item, constStrings)).join(', ')}]`
  if (value && typeof value === 'object') return `{ ${Object.entries(value).map(([key, item]) => `${literal(key)}: ${literal(item, constStrings)}`).join(', ')} }`
  const text = JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
  return typeof value === 'string' && constStrings ? `${text} as const` : text
}
export function generateVue(schema: Schema, copy: { submit: string, reset: string, required: (label: string) => string, locale?: string, dark?: boolean }): string {
  const safe = parseSchema(JSON.stringify(schema))
  const all = flattenFields(safe.fields)
  const richtext = all.some(field => field.type === 'richtext')
  const dynamic = all.filter(field => field.dataSource.enabled && (hasOptions(field.type) || field.type === 'table'))
  if (richtext && !generatorSources.richText) throw new Error('Rich text generator source is not configured')
  if (dynamic.length && !generatorSources.dataSource) throw new Error('Data source generator source is not configured')
  const imports = [...new Set(['Form', 'FormItem', 'Row', 'Col', 'Space', 'Button', 'Alert', ...all.filter(field => !['richtext', 'row'].includes(field.type)).map(field => componentNames[field.type])])]
  const disabledByName: Record<string, boolean> = {}
  function inheritDisabled(list: Field[], disabled: boolean) { for (const field of list) { disabledByName[field.name] = disabled || field.disabled; inheritDisabled(field.children, disabledByName[field.name]) } }
  inheritDisabled(safe.fields, safe.disabled)
  const iconNames = [...new Set(all.flatMap(field => ['icon', 'prefixIcon', 'suffixIcon'].map(key => field.properties[key]).filter((name): name is string => typeof name === 'string' && /^Icon[A-Za-z0-9]+$/.test(name))))]
  const fields = Object.fromEntries(all.map(field => [field.name, field]))
  const rules = Object.fromEntries(all.filter(isModelField).map(field => [field.name, fieldRules(field, copy.required(field.label))]))
  const fieldControls = all.filter(field => field.type !== 'row')
  function render(list: Field[], indentation: number): string {
    const pad = ' '.repeat(indentation)
    return list.map(field => {
      const f = `fields.${field.name}`
      const c = `controls.${field.name}`
      let content: string
      if (field.type === 'row') {
        content = `<a-row :gutter="(${f}.properties.gutter ?? ${safe.gutter}) as number" :justify="${f}.properties.justify as any" :align="${f}.properties.align as any">\n${render(field.children, indentation + 4)}\n${pad}  </a-row>`
      } else {
        let control: string
        if (field.type === 'button') {
          const handler = field.properties.buttonAction === 'reset' ? 'reset()' : field.properties.buttonAction === 'submit' ? '' : `emit('action', ${f}.name)`
          control = `<a-button v-bind="${c}"${handler ? ` @click="${handler}"` : ''}>{{ ${f}.label }}</a-button>`
        } else if (field.type === 'table') {
          control = `<a-table v-bind="${c}"${field.dataSource.enabled ? ` :data="remote.${field.name}?.rows ?? ${f}.rows"` : ''} />`
          const actions = field.columns.map((column, index) => column.actions?.length ? `<template #action${index}="{ record }"><a-space><a-button v-for="action in ${f}.columns[${index}].actions" :key="action.name" :type="action.type ?? 'text'" :disabled="${disabledByName[field.name]}" @click="emit('table-action', { field: ${f}.name, action: action.name, record })">{{ action.label }}</a-button></a-space></template>` : '').join('')
          if (actions) control = control.slice(0, -3) + `>${actions}</a-table>`
        } else if (field.type === 'richtext') {
          control = `<RichText v-model="model.${field.name}" v-bind="${c}" locale="${copy.locale === 'en-US' ? 'en-US' : 'zh-CN'}" :dark="${!!copy.dark}" />`
        } else {
          control = `<A${componentNames[field.type]} ${field.type === 'upload' ? 'v-model:file-list' : 'v-model'}="model.${field.name}" v-bind="${c}"${field.type === 'upload' ? ` :on-before-upload="file => beforeUpload(file, ${f})"` : ''}${field.dataSource.enabled ? ` :options="remote.${field.name}?.options ?? ${f}.options"` : ''} />`
        }
        const slots = [['prefix', 'prefixIcon'], ['suffix', 'suffixIcon'], ['icon', 'icon']].filter(([, key]) => iconNames.includes(String(field.properties[key]))).map(([slot, key]) => `<template #${slot}><${field.properties[key]} /></template>`).join('')
        if (slots) {
          if (field.type === 'button') control = control.replace('</a-button>', slots + '</a-button>')
          else if (control.endsWith(' />')) control = control.slice(0, -3) + `>${slots}</A${componentNames[field.type]}>`
        }
        if (field.type === 'switch') {
          const checkedSlots = ['checked', 'unchecked'].filter(name => field.properties[`${name}Text`]).map(name => `<template #${name}>{{ ${f}.properties.${name}Text }}</template>`).join('')
          if (checkedSlots) control = control.replace(' />', `>${checkedSlots}</ASwitch>`)
        }
        if (field.type === 'rate' && field.properties.showText) control += ` <span>{{ model.${field.name} }}</span>`
        if (field.dataSource.enabled) control += `\n${pad}    <span v-if="remote.${field.name}?.loading" role="status">Loading…</span>`
        if (field.dataSource.enabled) control += `\n${pad}    <a-alert v-if="remote.${field.name}?.error" type="error">{{ remote.${field.name}.error }} <a-button @click="loadRemote(${f}.name)">Retry</a-button></a-alert>`
        content = `<a-form-item ${isModelField(field) ? `field="${field.name}" :rules="rules.${field.name}" ` : ''}:label="${f}.label" :hide-label="!${f}.showLabel" :label-col-flex="(${f}.labelWidth || ${safe.labelWidth}) + 'px'">\n${pad}    ${control}\n${pad}  </a-form-item>`
      }
      return `${pad}<a-col :span="${f}.span">\n${pad}  ${content}\n${pad}</a-col>`
    }).join('\n')
  }
  const dynamicCode = dynamic.length ? `
${generatorSources.dataSource.replace(/^export /gm, '')}
const remote = reactive<Record<string, { options?: DataOption[], rows?: Record<string, unknown>[], error?: string, loading?: boolean }>>({})
const remoteControllers = new Map<string, AbortController>()
async function loadRemote(name: string) {
  remoteControllers.get(name)?.abort()
  const controller = new AbortController()
  remoteControllers.set(name, controller)
  const field = fields[name as keyof typeof fields]
  remote[name] = { ...remote[name], loading: true, error: undefined }
  try {
    const data = await loadDataSource(field.dataSource, field.type === 'table' ? 'table' : 'options', controller.signal)
    if (controller.signal.aborted) return
    remote[name] = field.type === 'table' ? { rows: data as Record<string, unknown>[] } : { options: data as DataOption[] }
  } catch (error) {
    if (!controller.signal.aborted) remote[name] = { ...remote[name], error: error instanceof Error ? error.message : String(error), loading: false }
  }
}
onMounted(() => { for (const name of ${literal(dynamic.map(field => field.name))}) void loadRemote(name) })
onBeforeUnmount(() => remoteControllers.forEach(controller => controller.abort()))
` : ''
  const uploadCode = all.some(field => field.type === 'upload') ? `
function beforeUpload(file: File, field: { properties: Record<string, unknown> }) {
  const max = Number(field.properties.maxSizeMB || 0)
  if (max && file.size > max * 1024 * 1024) { emit('upload-error', 'File exceeds the configured size limit'); return false }
  return true
}
` : ''
  return `<template>
  <a-form ref="formRef" :model="model" layout="${safe.layout}" size="${safe.size}" label-align="${safe.labelAlign}" :disabled="${safe.disabled}" @submit-success="submit">
    <a-row :gutter="${safe.gutter}">
${render(safe.fields, 6)}
    </a-row>
${safe.formButtons ? `    <a-space><a-button type="primary" html-type="submit">{{ copy.submit }}</a-button><a-button @click="reset">{{ copy.reset }}</a-button></a-space>` : ''}
  </a-form>
</template>

<script setup lang="ts">
import { reactive, ref${dynamic.length ? ', onMounted, onBeforeUnmount' : ''} } from 'vue'
import { ${imports.map(name => `${name} as A${name}`).join(', ')} } from '@arco-design/web-vue'
${iconNames.length ? `import { ${iconNames.join(', ')} } from '@arco-design/web-vue/es/icon'` : ''}
import type { FormInstance, FieldRule } from '@arco-design/web-vue'
import '@arco-design/web-vue/dist/arco.css'
${richtext ? '// Requires tinymce@6.8.6. TinyMCE and its assets are bundled locally.\n' + generatorSources.richText.replace(/export default RichText\s*;?\s*$/, '') : ''}
const emit = defineEmits<{ submit: [value: Record<string, unknown>], action: [name: string], 'table-action': [value: { field: string, action: string, record: Record<string, unknown> }], 'upload-error': [message: string] }>()
const formRef = ref<FormInstance>()
const fields = ${literal(fields, true)}
const controls = {
${fieldControls.map(field => `  ${field.name}: ${literal(fieldProps({ ...field, disabled: disabledByName[field.name] }, true), true)}`).join(',\n')}
}
const rules: Record<string, FieldRule[]> = ${literal(rules)}
const copy = ${literal({ submit: copy.submit, reset: copy.reset })}
const defaults = ${literal(defaultModel(safe))}
const model = reactive<Record<string, any>>(structuredClone(defaults))
function reset() { Object.assign(model, structuredClone(defaults)); formRef.value?.clearValidate() }
function submit() { emit('submit', { ...model }) }
${dynamicCode}${uploadCode}
</script>
`
}

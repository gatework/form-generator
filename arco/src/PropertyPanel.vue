<template>
  <a-tabs v-model:active-key="activeTab" class="inspector-tabs" justify>
    <a-tab-pane key="field" :title="t('properties')">
      <a-empty v-if="!field" class="inspector-empty" :description="t('selectField')" />
      <a-form v-else :key="field.id" :model="field" layout="horizontal" :label-col-props="{ span: 8 }" :wrapper-col-props="{ span: 16 }" size="small" class="property-form">
        <a-form-item :label="t('componentType')"><a-select :model-value="field.type" :options="typeOptions" @update:model-value="$emit('changeType', $event as FieldType)" /></a-form-item>
        <a-form-item :label="t('name')"><a-input v-model="field.name" :input-attrs="{ 'aria-label': t('name') }" /></a-form-item>
        <a-form-item :label="t('label')"><a-input v-model="field.label" :input-attrs="{ 'aria-label': t('label') }" /></a-form-item>
        <a-form-item :label="t('span')"><a-slider v-model="field.span" :min="1" :max="24" :marks="{ 12: '12', 24: '24' }" /></a-form-item>
        <a-form-item v-if="field.type === 'row'" :label="t('disabled')"><a-switch v-model="field.disabled" /></a-form-item>
        <template v-if="field.type !== 'row'">
          <a-form-item :label="t('showLabel')"><a-switch v-model="field.showLabel" /></a-form-item>
          <a-form-item v-if="field.showLabel" :label="t('labelWidth')"><a-input-number :model-value="field.labelWidth" @update:model-value="setFieldNumber('labelWidth', $event)" :min="0" :max="500" :placeholder="t('inherit')" /></a-form-item>
          <a-form-item v-if="!['button', 'table', 'switch', 'rate', 'slider', 'upload'].includes(field.type)" :label="t('placeholder')"><a-input v-model="field.placeholder" /></a-form-item>
          <a-form-item v-if="!['button', 'table'].includes(field.type)" :label="t('required')"><a-switch v-model="field.required" :aria-label="t('required')" /></a-form-item>
          <a-form-item :label="t('disabled')"><a-switch v-model="field.disabled" /></a-form-item>
          <a-form-item v-if="['select', 'cascader', 'upload'].includes(field.type)" :label="t('multiple')"><a-switch :model-value="field.multiple" @update:model-value="$emit('multiple', Boolean($event))" /></a-form-item>
          <template v-if="isNumeric(field.type)">
            <a-form-item v-if="field.type !== 'rate'" :label="t('min')"><a-input-number :model-value="field.min" @update:model-value="setFieldNumber('min', $event)" /></a-form-item>
            <a-form-item :label="t('max')"><a-input-number :model-value="field.max" @update:model-value="setFieldNumber('max', $event)" :min="field.type === 'rate' ? 1 : undefined" :max="field.type === 'rate' ? 10 : undefined" /></a-form-item>
            <a-form-item v-if="field.type !== 'rate'" :label="t('step')"><a-input-number :model-value="field.step" @update:model-value="setFieldNumber('step', $event)" :min="0.01" /></a-form-item>
          </template>
        </template>
        <a-form-item v-for="setting in settings" :key="setting.key" :label="t(setting.label)">
          <a-switch v-if="setting.kind === 'boolean'" :model-value="Boolean(settingValue(setting))" @update:model-value="setProperty(setting.key, $event)" />
          <a-input-number v-else-if="setting.kind === 'number'" :model-value="numberSettingValue(setting)" :min="0" @update:model-value="setProperty(setting.key, $event)" />
          <a-select v-else-if="['prefixIcon', 'suffixIcon', 'icon'].includes(setting.key)" :model-value="String(field.properties[setting.key] ?? '')" allow-search allow-clear :placeholder="t('selectIcon')" @update:model-value="setProperty(setting.key, $event ?? '')"><a-option v-for="name in iconNames" :key="name" :value="name"><component :is="iconComponents[name]" /> {{ name.replace(/^Icon/, '') }}</a-option></a-select>
          <a-select v-else-if="setting.options" :model-value="String(settingValue(setting) ?? '')" :options="setting.options.map(value => ({ value, label: optionLabel(value) }))" @update:model-value="setProperty(setting.key, $event)" />
          <a-input v-else :model-value="String(settingValue(setting) ?? '')" @update:model-value="setProperty(setting.key, $event)" />
        </a-form-item>
        <template v-if="field.type === 'switch'">
          <a-form-item :label="t('checkedValue')"><PrimitiveEditor :model-value="switchValue('checkedValue')" @update:model-value="setSwitchValue('checkedValue', $event)" /></a-form-item>
          <a-form-item :label="t('uncheckedValue')"><PrimitiveEditor :model-value="switchValue('uncheckedValue')" @update:model-value="setSwitchValue('uncheckedValue', $event)" /></a-form-item>
        </template>
        <template v-if="field.type === 'textarea'">
          <a-form-item :label="t('minRows')"><a-input-number :model-value="autoRows('minRows')" :min="1" @update:model-value="setAutoRows('minRows', $event)" /></a-form-item>
          <a-form-item :label="t('maxRows')"><a-input-number :model-value="autoRows('maxRows')" :min="1" @update:model-value="setAutoRows('maxRows', $event)" /></a-form-item>
        </template>
        <template v-if="hasOptions(field.type)">
          <h3 class="property-section">{{ t('options') }}</h3>
          <OptionsEditor v-model="field.options" :tree="field.type === 'cascader'" />
          <details class="advanced-section"><summary>{{ t('optionsJson') }}</summary><a-textarea v-model="optionsText" :auto-size="{ minRows: 5, maxRows: 12 }" :aria-label="t('optionsJson')" /><a-button size="small" @click="applyOptions">{{ t('applyOptions') }}</a-button></details>
          <DataSourceEditor :field="field" />
        </template>
        <template v-if="field.type === 'table'">
          <DataSourceEditor :field="field" />
          <h3 class="property-section">{{ t('columns') }}</h3>
          <div v-for="(column, index) in field.columns" :key="index" class="column-config">
            <div class="column-editor"><a-input v-model="column.title" :placeholder="t('label')" /><a-input v-model="column.dataIndex" :placeholder="t('name')" /><a-input-number :model-value="column.width" :min="40" :placeholder="t('width')" @update:model-value="setColumnWidth(column, $event)" /><a-button status="danger" size="mini" :aria-label="t('remove')" @click="field.columns.splice(index, 1)"><IconClose /></a-button></div>
            <div v-for="(action, actionIndex) in column.actions" :key="actionIndex" class="column-action-editor">
              <a-input v-model="action.name" :placeholder="t('columnActionName')" :input-attrs="{ 'aria-label': t('columnActionName') }" />
              <a-input v-model="action.label" :placeholder="t('columnActionLabel')" :input-attrs="{ 'aria-label': t('columnActionLabel') }" />
              <a-select :model-value="action.type ?? 'text'" @update:model-value="action.type = $event as typeof action.type" :aria-label="t('type')" :options="actionTypes.map(value => ({ value, label: optionLabel(value) }))" />
              <a-button status="danger" size="mini" :aria-label="t('removeColumnAction')" @click="removeColumnAction(column, actionIndex)"><IconClose /></a-button>
            </div>
            <a-button size="mini" type="text" @click="addColumnAction(column)"><IconPlus /> {{ t('addColumnAction') }}</a-button>
          </div>
          <a-button long type="text" @click="field.columns.push({ title: t('column'), dataIndex: `column${field.columns.length + 1}` })"><IconPlus /> {{ t('addColumn') }}</a-button>
          <h3 class="property-section">{{ t('tableData') }}</h3>
          <a-textarea v-model="rowsText" :auto-size="{ minRows: 4, maxRows: 12 }" /><a-button size="small" @click="applyRows">{{ t('apply') }}</a-button>
        </template>
        <template v-if="!['upload', 'row', 'button', 'table'].includes(field.type)">
          <h3 class="property-section">{{ t('defaultValue') }}</h3>
          <FieldControl :model-value="field.defaultValue" @update:model-value="setDefaultValue" :field="{ ...field, disabled: false }" />
          <h3 class="property-section">{{ t('validation') }}</h3>
          <div v-for="(rule, index) in field.validation" :key="index" class="validation-editor"><a-input v-model="rule.pattern" :placeholder="t('pattern')" :aria-label="t('pattern')" /><a-input v-model="rule.message" :placeholder="t('validationMessage')" :aria-label="t('validationMessage')" /><a-button size="mini" status="danger" :aria-label="t('remove')" @click="field.validation.splice(index, 1)"><IconClose /></a-button></div>
          <a-button long type="text" @click="field.validation.push({ pattern: '', message: '' })"><IconPlus /> {{ t('addRule') }}</a-button>
        </template>
        <a-alert v-if="field.type === 'upload'" class="upload-tip">{{ t('uploadTip') }}</a-alert>
      </a-form>
    </a-tab-pane>
    <a-tab-pane key="form" :title="t('form')">
      <a-form :model="schema" layout="horizontal" :label-col-props="{ span: 8 }" :wrapper-col-props="{ span: 16 }" size="small" class="property-form">
        <a-form-item :label="t('layout')"><a-select v-model="schema.layout" :options="layouts" /></a-form-item>
        <a-form-item :label="t('labelAlign')"><a-radio-group v-model="schema.labelAlign" type="button" :options="[{ value: 'left', label: t('left') }, { value: 'right', label: t('right') }]" /></a-form-item>
        <a-form-item :label="t('labelWidth')"><a-input-number :model-value="schema.labelWidth" @update:model-value="schema.labelWidth = $event ?? 100" :min="0" :max="500" /></a-form-item>
        <a-form-item :label="t('size')"><a-select v-model="schema.size" :options="sizes" /></a-form-item>
        <a-form-item :label="t('gutter')"><a-input-number :model-value="schema.gutter" @update:model-value="schema.gutter = $event ?? 16" :min="0" :max="100" /></a-form-item>
        <a-form-item :label="t('disabled')"><a-switch v-model="schema.disabled" /></a-form-item>
        <a-form-item :label="t('formButtons')"><a-switch v-model="schema.formButtons" /></a-form-item>
      </a-form>
    </a-tab-pane>
  </a-tabs>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconPlus, IconClose } from '@arco-design/web-vue/es/icon'
import * as iconComponents from '@arco-design/web-vue/es/icon'
import FieldControl from './FieldControl'
import OptionsEditor from './OptionsEditor.vue'
import DataSourceEditor from './DataSourceEditor.vue'
import PrimitiveEditor from './PrimitiveEditor.vue'
import { t, type TranslationKey } from './locale'
import { fieldTypes, fieldProps, hasOptions, isArray, isNumeric, parseOptions, type Field, type FieldType, type Schema } from './schema'
const props = defineProps<{ field?: Field, schema: Schema }>()
defineEmits<{ changeType: [type: FieldType], multiple: [value: boolean] }>()
const iconNames = Object.keys(iconComponents).filter(name => name.startsWith('Icon')) as (keyof typeof iconComponents)[]
const activeTab = ref('field')
const optionsText = ref('')
const rowsText = ref('')
watch(() => props.field?.id, () => { if (props.field) activeTab.value = 'field' })
watch(() => props.field?.options, value => { optionsText.value = JSON.stringify(value ?? [], null, 2) }, { immediate: true, deep: true })
watch(() => props.field?.rows, value => { rowsText.value = JSON.stringify(value ?? [], null, 2) }, { immediate: true, deep: true })
const typeOptions = computed(() => fieldTypes.map(value => ({ value, label: t(value) })))
const layouts = computed(() => ['horizontal', 'vertical', 'inline'].map(value => ({ value, label: t(value as Schema['layout']) })))
const sizes = computed(() => ['mini', 'small', 'medium', 'large'].map(value => ({ value, label: t(value as Schema['size']) })))
type Setting = { key: string, label: TranslationKey, kind?: 'boolean' | 'number', options?: string[], fallback?: string | number | boolean }
const settings = computed<Setting[]>(() => {
  const type = props.field?.type
  const result: Setting[] = []
  const bool = (key: TranslationKey, fallback = false) => result.push({ key, label: key, kind: 'boolean', fallback })
  const num = (key: TranslationKey, fallback?: number) => result.push({ key, label: key, kind: 'number', fallback })
  const str = (key: TranslationKey, options?: string[], fallback?: string) => result.push({ key, label: key, options, fallback })
  if (['input', 'textarea', 'password', 'number', 'select', 'cascader', 'date', 'dateRange', 'time', 'timeRange'].includes(type ?? '')) bool('allowClear')
  if (['input', 'textarea', 'password', 'number'].includes(type ?? '')) bool('readonly')
  if (['input', 'textarea', 'password'].includes(type ?? '')) { num('maxLength', 0); bool('showWordLimit') }
  if (type === 'input') { str('prepend'); str('append'); str('prefixIcon'); str('suffixIcon') }
  if (type === 'number') num('precision')
  if (type === 'select' || type === 'cascader') bool('allowSearch')
  if (type === 'cascader') { bool('checkStrictly'); bool('pathMode'); str('expandTrigger', ['click', 'hover'], 'click') }
  if (type === 'slider') { bool('range'); bool('showTicks'); bool('showInput') }
  if (type === 'radio') str('type', ['radio', 'button'], 'radio')
  if (type === 'checkbox') result.push({ key: 'min', label: 'selectionMin', kind: 'number' }, { key: 'max', label: 'selectionMax', kind: 'number' })
  if (type === 'radio' || type === 'checkbox') str('direction', ['horizontal', 'vertical'], 'horizontal')
  if (type === 'dateRange' || type === 'timeRange') { str('startPlaceholder'); str('endPlaceholder') }
  if (type === 'date' || type === 'dateRange') { str('mode', ['date', 'week', 'month', 'quarter', 'year'], 'date'); str('format'); str('valueFormat', undefined, 'YYYY-MM-DD'); bool('showTime') }
  if (type === 'time' || type === 'timeRange') str('format', undefined, 'HH:mm:ss')
  if (type === 'rate') { bool('allowHalf'); bool('showText') }
  if (type === 'color') { bool('showAlpha', true); str('format', ['hex', 'rgb'], 'hex') }
  if (type === 'switch') { str('checkedText'); str('uncheckedText') }
  if (type === 'upload') { str('action'); str('accept'); num('limit', 0); num('maxSizeMB', 0); str('name', undefined, 'file'); str('listType', ['text', 'picture', 'picture-card'], 'text'); bool('autoUpload'); bool('showFileList', true); bool('hideButton') }
  if (type === 'richtext') { num('height', 300); bool('readOnly') }
  if (type === 'button') { str('icon'); bool('loading'); bool('long'); str('type', ['primary', 'secondary', 'outline', 'dashed', 'text'], 'primary'); str('status', ['normal', 'warning', 'success', 'danger'], 'normal'); str('shape', ['square', 'round', 'circle'], 'square'); str('buttonAction', ['button', 'submit', 'reset'], 'button') }
  if (type === 'table') { bool('bordered'); bool('stripe'); bool('hoverable', true) }
  if (type === 'row') { num('gutter', props.schema.gutter); str('justify', ['start', 'center', 'end', 'space-around', 'space-between'], 'start'); str('align', ['start', 'center', 'end', 'stretch'], 'start') }
  if (type && type !== 'row') str('width')
  return result
})
const optionLabels: Record<string, TranslationKey> = { primary: 'primaryStyle', secondary: 'secondaryStyle', outline: 'outlineStyle', dashed: 'dashedStyle', text: 'textStyle', normal: 'normalStatus', warning: 'warningStatus', success: 'successStatus', danger: 'dangerStatus', square: 'squareShape', round: 'roundShape', circle: 'circleShape', start: 'startAlign', end: 'endAlign', center: 'centerAlign', 'space-between': 'spaceBetween', 'space-around': 'spaceAround', stretch: 'stretchAlign', click: 'clickTrigger', hover: 'hoverTrigger', date: 'date', week: 'weekMode', month: 'monthMode', quarter: 'quarterMode', year: 'yearMode', picture: 'pictureList', 'picture-card': 'pictureCardList', button: 'normalButton', submit: 'submit', reset: 'reset', radio: 'radio', horizontal: 'horizontal', vertical: 'vertical' }
function optionLabel(value: string) { return optionLabels[value] ? t(optionLabels[value]) : value }
// Authored values take precedence over renderer transforms and Arco defaults.
function settingValue(setting: Setting): unknown {
  const field = props.field
  if (!field) return setting.fallback
  if (field.properties[setting.key] !== undefined) return field.properties[setting.key]
  const mappedKey = field.type === 'number' && setting.key === 'readonly' ? 'readOnly' : setting.key
  const effective = fieldProps(field, true)[mappedKey]
  if (effective !== undefined) return effective
  if (setting.key === 'format' && ['date', 'dateRange'].includes(field.type)) {
    const formats: Record<string, string> = { month: 'YYYY-MM', year: 'YYYY', week: 'gggg-wo', quarter: 'YYYY-[Q]Q' }
    return formats[String(field.properties.mode)] ?? (field.properties.showTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD')
  }
  return setting.fallback
}
function numberSettingValue(setting: Setting): number | undefined {
  const value = settingValue(setting)
  return typeof value === 'number' ? value : undefined
}
function setDefaultValue(value: unknown) { if (props.field) props.field.defaultValue = value == null && isArray(props.field) ? [] : value }
function setProperty(key: string, value: unknown) {
  if (!props.field) return
  if (props.field.type === 'number' && key === 'readonly') delete props.field.properties.readOnly
  if (value === undefined || value === null) delete props.field.properties[key]
  else props.field.properties[key] = value
  if (key === 'range') props.field.defaultValue = value ? [props.field.min, props.field.max] : props.field.min
  if (key === 'pathMode') props.field.defaultValue = value || props.field.multiple ? [] : ''
}
function setFieldNumber(key: 'min' | 'max' | 'step' | 'labelWidth', value: number | undefined) {
  if (!props.field) return
  const defaults = { min: 0, max: props.field.type === 'rate' ? 5 : 100, step: 1, labelWidth: 0 }
  props.field[key] = value ?? defaults[key]
  if (key === 'min' && props.field.min > props.field.max) props.field.max = props.field.min
  if (key === 'max' && props.field.max < props.field.min) props.field.min = props.field.max
}
const actionTypes = ['primary', 'secondary', 'outline', 'dashed', 'text'] as const
function setColumnWidth(column: Field['columns'][number], value: number | undefined) { if (value === undefined) delete column.width; else column.width = value }
function addColumnAction(column: Field['columns'][number]) {
  const actions = column.actions ??= []
  let index = 1
  while (actions.some(action => action.name === `action${index}`)) index++
  actions.push({ name: `action${index}`, label: t('columnAction'), type: 'text' })
}
function removeColumnAction(column: Field['columns'][number], index: number) {
  column.actions?.splice(index, 1)
  if (!column.actions?.length) delete column.actions
}
function switchValue(key: 'checkedValue' | 'uncheckedValue') { return (props.field?.properties[key] ?? (key === 'checkedValue')) as string | number | boolean }
function setSwitchValue(key: 'checkedValue' | 'uncheckedValue', value: string | number | boolean) { if (!props.field) return; if (props.field.defaultValue === switchValue(key)) props.field.defaultValue = value; props.field.properties[key] = value }
function autoRows(key: string) { return Number((props.field?.properties.autoSize as Record<string, number> | undefined)?.[key] ?? (key === 'minRows' ? 3 : 6)) }
function setAutoRows(key: string, value: number | undefined) {
  if (!props.field) return
  const rows = { minRows: autoRows('minRows'), maxRows: autoRows('maxRows'), [key]: value ?? (key === 'minRows' ? 3 : 6) }
  if (rows.minRows > rows.maxRows) {
    if (key === 'minRows') rows.maxRows = rows.minRows
    else rows.minRows = rows.maxRows
  }
  props.field.properties.autoSize = rows
}
function applyOptions() { try { if (props.field) props.field.options = parseOptions(optionsText.value) } catch { Message.error(t('invalidOptions')) } }
function applyRows() { try { const rows = JSON.parse(rowsText.value); if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error(); if (props.field) props.field.rows = rows } catch { Message.error(t('invalidRows')) } }
</script>

<style scoped>
.column-config { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--color-border-1); }
.column-action-editor { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 6px; margin: 8px 0 4px 12px; }
.column-action-editor > :last-child { justify-self: end; }
</style>

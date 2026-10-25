<template>
  <a-config-provider :locale="arcoLocale">
    <main class="designer">
      <a-alert v-if="storageError" type="warning">{{ t(storageError) }}</a-alert>
      <nav ref="compactNavigation" class="compact-navigation" :aria-label="t('workspaceViews')">
        <a-button v-for="panel in workspacePanels" :key="panel.key" :type="compactPanel === panel.key ? 'primary' : 'text'" :aria-pressed="compactPanel === panel.key" @click="compactPanel = panel.key"><template #icon><component :is="panel.icon" /></template>{{ t(panel.label) }}</a-button>
      </nav>
      <div class="workspace" :data-panel="compactPanel">
        <aside class="palette" :aria-label="t('components')">
          <div class="palette-heading"><IconApps /><strong>{{ t('designer') }}</strong><span>Arco</span></div>
          <div class="palette-scroll">
            <section v-for="group in groups" :key="group.label" class="palette-group">
              <h2><IconApps />{{ t(group.label) }}</h2>
              <div class="palette-items"><a-button v-for="type in group.types" :key="type" draggable="true" @dragstart="dragType($event, type)" @click="add(type)"><template #icon><component :is="icons[type]" /></template>{{ t(type) }}</a-button></div>
            </section>
          </div>
          <div class="palette-footer"><IconSave />{{ t('draft') }}</div>
        </aside>
        <section class="center-board">
          <header class="toolbar">
            <a-space :size="0" wrap>
              <a-button class="preview-action" type="primary" :disabled="!schema.fields.length" :title="t('preview')" @click="openPreview"><template #icon><IconPlayArrow /></template><span class="toolbar-label">{{ t('preview') }}</span></a-button>
              <a-button type="text" :title="t('json')" @click="showJson"><template #icon><IconCode /></template><span class="toolbar-label">{{ t('json') }}</span></a-button>
              <a-button type="text" :disabled="!schema.fields.length" :title="t('viewCode')" @click="showCode"><template #icon><IconCodeBlock /></template><span class="toolbar-label">{{ t('viewCode') }}</span></a-button>
              <a-button type="text" :disabled="!schema.fields.length" :title="t('export')" @click="exportVue"><template #icon><IconDownload /></template><span class="toolbar-label">{{ t('export') }}</span></a-button>
              <a-button type="text" :disabled="!schema.fields.length" :title="t('copyCode')" @click="copyCode"><template #icon><IconCopy /></template><span class="toolbar-label">{{ t('copyCode') }}</span></a-button>
              <a-button type="text" :title="t('import')" @click="importVisible = true"><template #icon><IconImport /></template><span class="toolbar-label">{{ t('import') }}</span></a-button>
            </a-space>
            <a-button class="clear-action" type="text" status="danger" :disabled="!schema.fields.length" :title="t('clear')" @click="clear"><template #icon><IconDelete /></template><span class="toolbar-label">{{ t('clear') }}</span></a-button>
          </header>
          <a-alert v-if="draftError" type="warning" class="draft-warning" :title="t('unsavedDraft')">{{ draftError }}</a-alert>
          <section class="canvas" :aria-label="t('canvas')" @dragover.prevent @drop.prevent="dropCanvas($event)">
            <a-form :model="{}" :layout="schema.layout" :size="schema.size" class="canvas-form">
              <DrawingCanvas :fields="schema.fields" :schema="schema" :selected-id="selectedId" :gutter="schema.gutter" @select="selectField" @drop-field="drop" @duplicate="duplicate" @remove="remove" @move="move" />
              <div v-if="!schema.fields.length" class="canvas-empty"><IconDragDotVertical /><h2>{{ t('emptyTitle') }}</h2><p class="desktop-empty-tip">{{ t('empty') }}</p><p class="compact-empty-tip">{{ t('compactEmpty') }}</p></div>
              <div v-if="schema.fields.length && schema.formButtons" class="canvas-buttons" :style="{ paddingLeft: schema.layout === 'vertical' ? '12px' : `${schema.labelWidth + 12}px` }" inert><a-space><a-button type="primary">{{ t('submit') }}</a-button><a-button>{{ t('reset') }}</a-button></a-space></div>
            </a-form>
          </section>
          <footer class="canvas-status"><span>{{ flattenFields(schema.fields).length }} {{ t('count') }}</span><span :class="{ 'unsaved-status': draftError || storageError }">{{ draftError || storageError ? t('notSaved') : t('saved') }}</span></footer>
        </section>
        <aside class="properties" :aria-label="t('properties')"><PropertyPanel :field="selected" :schema="schema" @change-type="changeType" @multiple="setMultiple" /></aside>
      </div>
      <a-modal v-model:visible="previewVisible" :title="t('preview')" :footer="false" fullscreen modal-class="preview-dialog" unmount-on-close>
        <div class="preview-toolbar"><a-button-group><a-button v-for="size in previewSizes" :key="size" :type="previewWidth === size ? 'primary' : 'secondary'" :aria-pressed="previewWidth === size" @click="previewWidth = size">{{ t(size) }}</a-button></a-button-group><span>{{ t('previewTip') }}</span></div>
        <div class="preview-stage"><div class="preview-viewport" :style="{ width: previewWidth === 'mobile' ? '375px' : previewWidth === 'tablet' ? '768px' : '100%' }"><Preview v-if="previewSchema" :schema="previewSchema" /></div></div>
      </a-modal>
      <a-modal v-model:visible="jsonVisible" :title="t('json')" :footer="false" width="min(1000px, 96vw)" unmount-on-close>
        <CodeEditor v-model="jsonText" language="json" :label="t('json')" /><a-space class="dialog-action"><a-button type="primary" @click="applyViewedJson">{{ t('applyJson') }}</a-button><a-button @click="download('form.json', jsonText, 'application/json')"><IconDownload /> {{ t('downloadJson') }}</a-button><a-button @click="copyText(jsonText)"><IconCopy /> {{ t('copy') }}</a-button></a-space>
      </a-modal>
      <a-modal v-model:visible="codeVisible" :title="t('viewCode')" :footer="false" width="min(1100px, 96vw)" unmount-on-close>
        <div class="code-caption">GeneratedForm.vue <span>{{ t('codeTip') }}</span></div><p class="code-edit-note">{{ t('codeEditNote') }}</p><CodeEditor v-model="codeText" language="vue" :label="t('viewCode')" /><a-space class="dialog-action"><a-button type="primary" @click="copyText(codeText)"><IconCopy /> {{ t('copyCode') }}</a-button><a-button @click="download('GeneratedForm.vue', codeText)"><IconDownload /> {{ t('export') }}</a-button></a-space>
      </a-modal>
      <a-modal v-model:visible="importVisible" :title="t('import')" :footer="false" width="min(900px, 96vw)" unmount-on-close><a-textarea v-model="importText" class="code-editor" :auto-size="{ minRows: 12, maxRows: 24 }" :aria-label="t('import')" /><a-button class="dialog-action" type="primary" @click="importJson">{{ t('apply') }}</a-button></a-modal>
    </main>
  </a-config-provider>
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, ref, watch, type Component } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { IconApps, IconSave, IconPlayArrow, IconCode, IconCodeBlock, IconDownload, IconCopy, IconImport, IconDelete, IconDragDotVertical, IconEdit, IconAlignLeft, IconLock, IconPlus, IconDown, IconBranch, IconCheckCircle, IconCheckSquare, IconPoweroff, IconSettings, IconClockCircle, IconCalendar, IconStar, IconPalette, IconUpload, IconLayout, IconBold, IconList, IconRecord } from '@arco-design/web-vue/es/icon'
import DrawingCanvas, { type CanvasDrop } from './DrawingCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import Preview from './Preview.vue'
const CodeEditor = defineAsyncComponent(() => import('./CodeEditor.vue'))
import { arcoLocale, locale, t, type TranslationKey } from './locale'
import { createField, emptySchema, fieldTypes, generateVue, parseSchema, flattenFields, locateField, duplicateField, moveField, type Field, type FieldType, type Schema } from './schema'
const compactNavigation = ref<HTMLElement>()
const compactPanel = ref('canvas')
const workspacePanels: { key: string, label: TranslationKey, icon: Component }[] = [
  { key: 'components', label: 'components', icon: IconApps },
  { key: 'canvas', label: 'canvasView', icon: IconLayout },
  { key: 'properties', label: 'propertiesView', icon: IconSettings }
]
function showCompactPanel(panel: string) {
  compactPanel.value = panel
  if (window.matchMedia('(max-width: 900px)').matches) {
    void nextTick(() => compactNavigation.value?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus())
  }
}
function selectField(id: string) { selectedId.value = id; showCompactPanel('properties') }
const storageKey = 'gatework:form-generator:arco:v1'
const schema = ref(emptySchema())
const storageError = ref<'storageError' | 'restoreError'>()
const draftError = ref('')
try { const saved = localStorage.getItem(storageKey); if (saved) schema.value = parseSchema(saved) } catch { storageError.value = 'restoreError' }
const selectedId = ref<string | undefined>(schema.value.fields[0]?.id)
const selected = computed(() => selectedId.value ? locateField(schema.value.fields, selectedId.value)?.field : undefined)
watch(schema, value => { try { const valid = parseSchema(JSON.stringify(value)); draftError.value = ''; try { localStorage.setItem(storageKey, JSON.stringify(valid)); storageError.value = undefined; draftError.value = '' } catch { storageError.value = 'storageError' } } catch (error) { draftError.value = error instanceof Error ? error.message : t('invalid') } }, { deep: true })
const groups: { label: TranslationKey, types: FieldType[] }[] = [
  { label: 'inputGroup', types: ['input', 'textarea', 'password', 'number', 'richtext'] },
  { label: 'selectGroup', types: ['select', 'cascader', 'radio', 'checkbox', 'switch', 'slider', 'time', 'timeRange', 'date', 'dateRange', 'rate', 'color', 'upload'] },
  { label: 'layoutGroup', types: ['row', 'button', 'table'] }
]
const icons: Record<FieldType, Component> = { input: IconEdit, textarea: IconAlignLeft, password: IconLock, number: IconPlus, select: IconDown, cascader: IconBranch, radio: IconCheckCircle, checkbox: IconCheckSquare, switch: IconPoweroff, slider: IconSettings, time: IconClockCircle, timeRange: IconClockCircle, date: IconCalendar, dateRange: IconCalendar, rate: IconStar, color: IconPalette, upload: IconUpload, row: IconLayout, richtext: IconBold, table: IconList, button: IconRecord }
function add(type: FieldType, parentId?: string, index?: number) { const field = createField(type, schema.value.fields, t(type), t('option')); const list = parentId ? locateField(schema.value.fields, parentId)?.field.children : schema.value.fields; if (!list) return; list.splice(index ?? list.length, 0, field); selectedId.value = field.id; showCompactPanel('canvas') }
function duplicate(field: Field) { const location = locateField(schema.value.fields, field.id); if (!location) return; const copy = duplicateField(field, schema.value.fields); location.list.splice(location.index + 1, 0, copy); selectedId.value = copy.id }
function remove(id: string) { const location = locateField(schema.value.fields, id); if (!location) return; location.list.splice(location.index, 1); if (!selectedId.value || !locateField(schema.value.fields, selectedId.value)) selectedId.value = location.list[location.index]?.id ?? location.list[location.index - 1]?.id ?? schema.value.fields[0]?.id }
function move(id: string, delta: number) { const location = locateField(schema.value.fields, id); if (!location) return; const to = location.index + delta; if (to < 0 || to >= location.list.length) return; location.list.splice(location.index, 1); location.list.splice(to, 0, location.field) }
function dragType(event: DragEvent, type: FieldType) { event.dataTransfer?.setData('application/x-form-component', type); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy' }
function drop(event: CanvasDrop) { if (event.type && fieldTypes.includes(event.type)) add(event.type, event.parentId, event.index); else if (event.id) moveField(schema.value.fields, event.id, event.parentId, event.index) }
function dropCanvas(event: DragEvent) { drop({ id: event.dataTransfer?.getData('application/x-form-field'), type: event.dataTransfer?.getData('application/x-form-component') as FieldType, index: schema.value.fields.length }) }
function setMultiple(value: boolean) { if (!selected.value) return; selected.value.multiple = value; selected.value.defaultValue = value || selected.value.type === 'upload' || (selected.value.type === 'cascader' && selected.value.properties.pathMode) ? [] : '' }
function changeType(type: FieldType) { const field = selected.value; if (!field || field.type === type) return; const apply = () => { const replacement = createField(type, schema.value.fields, t(type), t('option')); Object.assign(field, replacement, { id: field.id, name: field.name, label: field.label === t(field.type) ? t(type) : field.label, span: field.span, showLabel: field.showLabel, labelWidth: field.labelWidth }) }; if (field.children.length) confirm(t('changeTypeConfirm'), apply); else apply() }
function validated(): Schema | undefined { try { return parseSchema(JSON.stringify(schema.value)) } catch { Message.error(t('invalid')); return undefined } }
const previewSizes = ['desktop', 'tablet', 'mobile'] as const
const previewVisible = ref(false), previewSchema = ref<Schema>(), previewWidth = ref('desktop')
function openPreview() { const valid = validated(); if (!valid) return; previewSchema.value = valid; previewVisible.value = true }
const jsonVisible = ref(false), jsonText = ref(''), codeVisible = ref(false), codeText = ref('')
function showJson() { const valid = validated(); if (!valid) return; jsonText.value = JSON.stringify(valid, null, 2); jsonVisible.value = true }
function applyViewedJson() { try { const imported = parseSchema(jsonText.value); confirm(t('importConfirm'), () => { schema.value = imported; selectedId.value = imported.fields[0]?.id; jsonVisible.value = false }) } catch (error) { Message.error(`${t('invalidImport')} ${error instanceof Error ? error.message : ''}`) } }
function showCode() { const content = code(); if (content) { codeText.value = content; codeVisible.value = true } }
const importVisible = ref(false), importText = ref('')
function confirm(content: string, onOk: () => void) { Modal.confirm({ content, okText: t('apply'), cancelText: t('cancel'), onOk }) }
function importJson() { try { const imported = parseSchema(importText.value); confirm(t('importConfirm'), () => { schema.value = imported; selectedId.value = imported.fields[0]?.id; importVisible.value = false }) } catch { Message.error(t('invalidImport')) } }
function clear() { confirm(t('clearConfirm'), () => { schema.value = emptySchema(); selectedId.value = undefined }) }
function code() { const valid = validated(); return valid ? generateVue(valid, { submit: t('submit'), reset: t('reset'), locale: locale.value, dark: document.body.getAttribute('arco-theme') === 'dark', required: (label: string) => t('requiredMessage') + label }) : undefined }
function download(name: string, content: string, type = 'text/plain') { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
function exportVue() { const content = code(); if (content) download('GeneratedForm.vue', content) }
async function copyCode() { const content = code(); if (content) await copyText(content) }
async function copyText(content: string) { try { await navigator.clipboard.writeText(content); Message.success(t('copied')) } catch { Message.error(t('copyFailed')) } }
</script>

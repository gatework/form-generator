<template><div ref="host" class="source-editor" /></template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { basicSetup } from 'codemirror'
import { Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { json } from '@codemirror/lang-json'
import { vue } from '@codemirror/lang-vue'
import { oneDark } from '@codemirror/theme-one-dark'
const props = defineProps<{ modelValue: string, language: 'json' | 'vue', label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const host = ref<HTMLElement>()
const appearance = new Compartment()
let editor: EditorView | undefined
let observer: MutationObserver | undefined
function theme() { return document.body.getAttribute('arco-theme') === 'dark' ? oneDark : [] }
onMounted(() => {
  editor = new EditorView({ parent: host.value, doc: props.modelValue, extensions: [
    basicSetup, props.language === 'json' ? json() : vue(), appearance.of(theme()),
    EditorView.contentAttributes.of({ 'aria-label': props.label, 'aria-multiline': 'true', role: 'textbox', spellcheck: 'false' }),
    EditorView.updateListener.of(update => { if (update.docChanged) emit('update:modelValue', update.state.doc.toString()) }),
    EditorView.theme({ '&': { height: '100%', fontSize: '13px', backgroundColor: 'var(--color-bg-2)' }, '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', lineHeight: '1.7' }, '.cm-gutters': { backgroundColor: 'var(--color-fill-1)', color: 'var(--color-text-3)', borderRight: '1px solid var(--color-border-2)' }, '.cm-content': { padding: '12px 0', caretColor: 'rgb(var(--primary-6))' }, '.cm-activeLine': { backgroundColor: 'var(--color-fill-1)' }, '&.cm-focused': { outline: 'none' }, '.cm-selectionBackground': { backgroundColor: 'rgb(var(--primary-2)) !important' } })
  ] })
  observer = new MutationObserver(() => editor?.dispatch({ effects: appearance.reconfigure(theme()) }))
  observer.observe(document.body, { attributes: true, attributeFilter: ['arco-theme'] })
})
watch(() => props.modelValue, value => { if (editor && value !== editor.state.doc.toString()) editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } }) })
onBeforeUnmount(() => { observer?.disconnect(); editor?.destroy() })
</script>

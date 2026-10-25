<template>
  <div class="dynamic-control" :aria-busy="loading">
    <FieldControl :field="resolvedField" :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" @action="emit('action', $event)" />
    <div v-if="loading" class="data-source-status" role="status">{{ messages.loading }}</div>
    <div v-else-if="error" class="data-source-error" role="alert">
      <span>{{ messages.failed }} {{ error }}</span>
      <button class="data-source-retry" type="button" @click="reload">{{ messages.retry }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import FieldControl from './FieldControl'
import type { Field } from './schema'
import { locale } from './locale'
import { loadDataSource, type DataOption } from './data-source'

const props = defineProps<{ field: Field; modelValue?: unknown }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown]; action: [value: unknown] }>()
const loading = ref(false)
const error = ref('')
const options = ref<DataOption[]>()
const rows = ref<Record<string, unknown>[]>()
const messages = computed(() => locale.value === 'en-US'
  ? { loading: 'Loading data…', failed: 'Data could not be loaded.', retry: 'Retry' }
  : { loading: '正在加载数据…', failed: '数据加载失败。', retry: '重试' })
const resolvedField = computed(() => ({
  ...props.field,
  options: options.value ?? props.field.options,
  rows: rows.value ?? props.field.rows
}))
let controller: AbortController | undefined
let generation = 0

async function reload() {
  const current = ++generation
  controller?.abort()
  controller = undefined
  error.value = ''
  loading.value = false
  if (!props.field.dataSource?.enabled) {
    options.value = undefined
    rows.value = undefined
    return
  }
  controller = new AbortController()
  const signal = controller.signal
  loading.value = true
  const kind = props.field.type === 'table' ? 'table' : 'options'
  try {
    const data = await loadDataSource(props.field.dataSource, kind, signal)
    if (current !== generation || signal.aborted) return
    if (kind === 'table') rows.value = data as Record<string, unknown>[]
    else options.value = data as DataOption[]
  } catch (cause) {
    if (current !== generation || signal.aborted) return
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    if (current === generation) loading.value = false
  }
}

watch(() => [props.field.id, props.field.type, props.field.dataSource], reload, { deep: true, immediate: true })
onBeforeUnmount(() => { generation++; controller?.abort() })
</script>

<style scoped>
.dynamic-control { width: 100%; }
.data-source-status, .data-source-error { margin-top: 6px; font-size: 12px; line-height: 1.5; }
.data-source-status { color: var(--color-text-3); }
.data-source-error { color: rgb(var(--danger-6)); }
.data-source-retry { margin-left: 8px; padding: 0; border: 0; background: none; color: rgb(var(--primary-6)); cursor: pointer; font: inherit; text-decoration: underline; }
</style>

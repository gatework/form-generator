<template>
  <div class="primitive-editor">
    <a-select :model-value="typeof modelValue" size="small" :options="[{ value: 'boolean', label: t('booleanValue') }, { value: 'number', label: t('numberValue') }, { value: 'string', label: t('textValue') }]" :aria-label="t('valueType')" @update:model-value="changeType(String($event))" />
    <a-switch v-if="typeof modelValue === 'boolean'" :model-value="modelValue" @update:model-value="$emit('update:modelValue', Boolean($event))" />
    <a-input-number v-else-if="typeof modelValue === 'number'" :model-value="modelValue" size="small" @update:model-value="$emit('update:modelValue', $event ?? 0)" />
    <a-input v-else :model-value="String(modelValue)" size="small" @update:model-value="$emit('update:modelValue', $event)" />
  </div>
</template>
<script setup lang="ts">
import { t } from './locale'
defineProps<{ modelValue: string | number | boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | number | boolean] }>()
function changeType(type: string) { emit('update:modelValue', type === 'boolean' ? false : type === 'number' ? 0 : '') }
</script>

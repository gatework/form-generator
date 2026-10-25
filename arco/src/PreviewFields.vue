<template>
  <a-col v-for="field in fields" :key="field.id" :span="field.span">
    <a-row v-if="field.type === 'row'" :gutter="Number(field.properties.gutter ?? schema.gutter)" :justify="field.properties.justify as any" :align="field.properties.align as any">
      <PreviewFields :fields="field.children" :model="model" :schema="schema" :disabled="disabled || field.disabled" @action="emit('action', $event)" />
    </a-row>
    <a-form-item v-else :field="isModelField(field) ? field.name : undefined" :label="field.label" :hide-label="!field.showLabel" :label-col-flex="`${field.labelWidth || schema.labelWidth}px`" :rules="fieldRules(field, t('requiredMessage') + field.label)">
      <DynamicControl :field="{ ...field, disabled: disabled || field.disabled }" :model-value="model[field.name]" @update:model-value="model[field.name] = $event" @action="emit('action', $event)" />
    </a-form-item>
  </a-col>
</template>
<script setup lang="ts">
import DynamicControl from './DynamicControl.vue'
import { fieldRules, isModelField, type Field, type Schema } from './schema'
import { t } from './locale'
defineProps<{ fields: Field[], model: Record<string, unknown>, schema: Schema, disabled: boolean }>()
const emit = defineEmits<{ action: [value: unknown] }>()
</script>

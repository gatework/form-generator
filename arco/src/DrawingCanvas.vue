<template>
  <div class="drawing-grid" :class="[{ 'nested-grid': parentId }, `size-${schema.size}`]" :style="{ columnGap: `${gutter}px`, justifyContent: justify, alignItems: align }" @dragover.prevent.stop @drop.prevent.stop="drop($event, fields.length)">
    <article v-for="(field, index) in fields" :key="field.id" class="builder-field" :class="{ active: field.id === selectedId, 'row-field': field.type === 'row', 'vertical-field': schema.layout === 'vertical' }" :style="{ width: `calc((100% + ${gutter}px) * ${field.span} / 24 - ${gutter}px)` }" @click.stop="$emit('select', field.id)" @dragover.prevent.stop @drop.prevent.stop="drop($event, index)">
      <div class="field-tools">
        <button class="field-handle" draggable="true" :aria-label="t('dragField')" @dragstart.stop="drag($event, field.id)"><IconDragDotVertical /></button>
        <span class="field-identifier">{{ field.name }}</span>
        <button :aria-label="t('up')" :title="t('up')" :disabled="index === 0" @click.stop="$emit('move', field.id, -1)"><IconArrowUp /></button>
        <button :aria-label="t('down')" :title="t('down')" :disabled="index === fields.length - 1" @click.stop="$emit('move', field.id, 1)"><IconArrowDown /></button>
        <button :aria-label="t('copy')" :title="t('copy')" @click.stop="$emit('duplicate', field)"><IconCopy /><span class="sr-only">{{ t('copy') }}</span></button>
        <button :aria-label="t('remove')" :title="t('remove')" @click.stop="$emit('remove', field.id)"><IconDelete /><span class="sr-only">{{ t('remove') }}</span></button>
      </div>
      <template v-if="field.type === 'row'">
        <button class="field-select row-label" draggable="true" :aria-pressed="field.id === selectedId" @dragstart.stop="drag($event, field.id)" @click.stop="$emit('select', field.id)"><IconLayout /> {{ field.label }}</button>
        <DrawingCanvas :fields="field.children" :schema="schema" :selected-id="selectedId" :parent-id="field.id" :disabled="disabled || field.disabled || schema.disabled" :gutter="Number(field.properties.gutter ?? schema.gutter)" :justify="String(field.properties.justify ?? 'start')" :align="String(field.properties.align ?? 'start')" @select="$emit('select', $event)" @drop-field="$emit('dropField', $event)" @duplicate="$emit('duplicate', $event)" @remove="$emit('remove', $event)" @move="(id, delta) => $emit('move', id, delta)" />
        <div v-if="!field.children.length" class="row-empty" @dragover.prevent.stop @drop.prevent.stop="drop($event, 0, field.id)">{{ t('rowEmpty') }}</div>
      </template>
      <div v-else class="field-form-item field-heading" :class="{ 'no-label': !field.showLabel }">
        <button class="field-select" draggable="true" :aria-pressed="field.id === selectedId" :style="{ width: schema.layout === 'vertical' ? 'auto' : `${field.showLabel ? field.labelWidth || schema.labelWidth : 0}px`, textAlign: schema.labelAlign }" @dragstart.stop="drag($event, field.id)" @click.stop="$emit('select', field.id)"><span v-if="field.required && field.showLabel" class="required-mark">*</span><span v-if="field.showLabel">{{ field.label }}</span><span v-else class="sr-only">{{ field.label }}</span></button>
        <div class="field-sample" inert><FieldControl design-mode :field="{ ...field, disabled: disabled || field.disabled || schema.disabled }" :model-value="field.defaultValue" /></div>
      </div>
    </article>
  </div>
</template>
<script setup lang="ts">
import { IconDragDotVertical, IconArrowUp, IconArrowDown, IconCopy, IconDelete, IconLayout } from '@arco-design/web-vue/es/icon'
import FieldControl from './FieldControl'
import { t } from './locale'
import type { Field, FieldType, Schema } from './schema'
const props = defineProps<{ fields: Field[], schema: Schema, selectedId?: string, parentId?: string, gutter: number, justify?: string, align?: string, disabled?: boolean }>()
export interface CanvasDrop { id?: string, type?: FieldType, parentId?: string, index: number }
const emit = defineEmits<{ select: [id: string], dropField: [event: CanvasDrop], duplicate: [field: Field], remove: [id: string], move: [id: string, delta: number] }>()
function drag(event: DragEvent, id: string) { event.dataTransfer?.setData('application/x-form-field', id); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move' }
function drop(event: DragEvent, index: number, parentId = props.parentId) { emit('dropField', { id: event.dataTransfer?.getData('application/x-form-field'), type: event.dataTransfer?.getData('application/x-form-component') as FieldType, parentId, index }) }
</script>

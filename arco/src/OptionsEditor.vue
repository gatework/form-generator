<template>
  <div class="options-editor">
    <div v-for="(option, index) in modelValue" :key="index" class="option-branch">
      <div class="option-line">
        <a-input v-model="option.label" :placeholder="t('optionLabel')" :aria-label="t('optionLabel')" size="small" />
        <a-input :model-value="String(option.value)" :placeholder="t('optionValue')" :aria-label="t('optionValue')" size="small" @update:model-value="option.value = typeof option.value === 'number' ? Number($event) : $event" />
        <a-button size="mini" :aria-label="t('up')" :disabled="index === 0" @click="move(index, -1)"><IconArrowUp /></a-button>
        <a-button v-if="tree" size="mini" :aria-label="t('addChild')" :title="t('addChild')" @click="addChild(option)"><IconBranch /></a-button>
        <a-button size="mini" status="danger" :aria-label="t('remove')" @click="remove(index)"><IconClose /></a-button>
      </div>
      <OptionsEditor v-if="tree && option.children?.length" v-model="option.children" tree class="option-children" />
    </div>
    <a-button size="small" type="text" long @click="add"><template #icon><IconPlus /></template>{{ t('addOption') }}</a-button>
  </div>
</template>
<script setup lang="ts">
import { IconPlus, IconClose, IconArrowUp, IconBranch } from '@arco-design/web-vue/es/icon'
import { t } from './locale'
import type { Option } from './schema'
const props = defineProps<{ modelValue: Option[], tree?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [options: Option[]] }>()
function next(options: Option[]): Option { let value = options.length + 1; while (options.some(option => String(option.value) === String(value))) value++; return { label: `${t('option')} ${value}`, value: String(value) } }
function add() { emit('update:modelValue', [...props.modelValue, next(props.modelValue)]) }
function remove(index: number) { emit('update:modelValue', props.modelValue.filter((_, at) => at !== index)) }
function move(index: number, delta: number) { const options = [...props.modelValue]; const [option] = options.splice(index, 1); options.splice(index + delta, 0, option); emit('update:modelValue', options) }
function addChild(option: Option) { option.children ??= []; option.children.push(next(option.children)) }
</script>

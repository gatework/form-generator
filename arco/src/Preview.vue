<template>
  <a-form ref="formRef" :model="model" :layout="schema.layout" :size="schema.size" :disabled="schema.disabled" :label-align="schema.labelAlign" @submit-success="showResult = true" @submit-failed="showResult = false">
    <a-row :gutter="schema.gutter"><PreviewFields :fields="schema.fields" :model="model" :schema="schema" :disabled="schema.disabled" @action="action" /></a-row>
    <a-space v-if="schema.formButtons"><a-button type="primary" html-type="submit">{{ t('submit') }}</a-button><a-button @click="reset">{{ t('reset') }}</a-button></a-space>
    <a-alert v-if="flattenFields(schema.fields).some(field => field.type === 'upload')" class="upload-tip">{{ t('uploadTip') }}</a-alert>
    <section v-if="showResult"><h3>{{ t('result') }}</h3><pre>{{ JSON.stringify(model, null, 2) }}</pre></section>
  </a-form>
</template>
<script setup lang="ts">
import { nextTick, reactive, ref, watch } from 'vue'
import { Message, type FormInstance } from '@arco-design/web-vue'
import PreviewFields from './PreviewFields.vue'
import { defaultModel, flattenFields, type Schema } from './schema'
import { locale, t } from './locale'
const props = defineProps<{ schema: Schema }>()
const formRef = ref<FormInstance>()
const model = reactive(defaultModel(props.schema))
const showResult = ref(false)
function reset() { Object.assign(model, defaultModel(props.schema)); formRef.value?.clearValidate(); showResult.value = false }
async function action(value: unknown) {
  if (value === 'reset') reset()
  else if (value === 'submit') showResult.value = !(await formRef.value?.validate())
  else if (value && typeof value === 'object' && 'action' in value) Message.info(`${locale.value === 'en-US' ? 'Table action' : '表格操作'}: ${String(value.action)}`)
  else Message.info(locale.value === 'en-US' ? 'Button action: connect the exported action event to your application.' : '按钮操作：请在导出的 action 事件中接入业务逻辑。')
}
watch(locale, async() => {
  await nextTick()
  if (formRef.value?.$el.querySelector('.arco-form-item-status-error')) await formRef.value.validate()
})
</script>

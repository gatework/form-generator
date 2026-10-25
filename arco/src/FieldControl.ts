import { defineComponent, h, onBeforeUnmount, onMounted, ref, type PropType, type Component } from 'vue'
import * as Arco from '@arco-design/web-vue'
import * as Icons from '@arco-design/web-vue/es/icon'
import RichText from './RichText'
import { locale } from './locale'
import { componentNames, fieldProps, isNumeric, type Field } from './schema'

export default defineComponent({
  name: 'FieldControl',
  props: { field: { type: Object as PropType<Field>, required: true }, modelValue: null, designMode: Boolean },
  emits: ['update:modelValue', 'action'],
  setup(props, { emit }) {
    const dark = ref(document.body.getAttribute('arco-theme') === 'dark')
    const observer = new MutationObserver(() => { dark.value = document.body.getAttribute('arco-theme') === 'dark' })
    onMounted(() => observer.observe(document.body, { attributes: true, attributeFilter: ['arco-theme'] }))
    onBeforeUnmount(() => observer.disconnect())
    const icon = (name: unknown) => typeof name === 'string' && (Icons as unknown as Record<string, Component>)[name]
    return () => {
      const field = props.field
      const properties = fieldProps(field)
      if (field.type === 'richtext') {
        if (props.designMode) {
          const content = new DOMParser().parseFromString(String(props.modelValue ?? ''), 'text/html').body.textContent?.trim()
          return h('div', { class: 'richtext-sample', 'aria-disabled': field.disabled, style: { height: `${Number(properties.height)}px` } }, [
            h('div', { class: 'richtext-sample-toolbar' }, [Icons.IconBold, Icons.IconItalic, Icons.IconUnderline, Icons.IconAlignLeft, Icons.IconUnorderedList, Icons.IconLink, Icons.IconImage].map(icon => h(icon))),
            h('div', { class: 'richtext-sample-content', style: { color: content ? 'var(--color-text-1)' : 'var(--color-text-3)' } }, content || field.placeholder || (locale.value === 'en-US' ? 'Rich text content' : '富文本内容'))
          ])
        }
        return h(RichText, { ...properties, modelValue: String(props.modelValue ?? ''), locale: locale.value, dark: dark.value, 'onUpdate:modelValue': (value: string) => emit('update:modelValue', value) })
      }
      const component = (Arco as unknown as Record<string, Component>)[componentNames[field.type]]
      const key = field.type === 'upload' ? 'fileList' : 'modelValue'
      const slots: Record<string, (scope?: { record: Record<string, unknown> }) => unknown> = {}
      for (const [slot, prop] of [['prefix', 'prefixIcon'], ['suffix', 'suffixIcon'], ['icon', 'icon']]) {
        const component = icon(field.properties[prop])
        if (component) slots[slot] = () => h(component)
      }
      if (field.type === 'table') field.columns.forEach((column, index) => {
        if (column.actions?.length) slots[`action${index}`] = scope => h(Arco.Space, {}, { default: () => column.actions!.map(action => h(Arco.Button, { type: action.type ?? 'text', disabled: field.disabled, onClick: () => emit('action', { field: field.name, action: action.name, record: scope?.record }) }, { default: () => action.label })) })
      })
      if (field.type === 'button') slots.default = () => field.label
      if (field.type === 'switch') {
        if (field.properties.checkedText) slots.checked = () => String(field.properties.checkedText)
        if (field.properties.uncheckedText) slots.unchecked = () => String(field.properties.uncheckedText)
      }
      const control = h(component, {
        ...properties,
        ...(!['button', 'table', 'row'].includes(field.type) ? { [key]: isNumeric(field.type) && props.modelValue == null ? undefined : props.modelValue, [`onUpdate:${key}`]: (value: unknown) => emit('update:modelValue', value) } : {}),
        ...(field.type === 'button' ? { htmlType: 'button', onClick: () => emit('action', field.properties.buttonAction ?? 'button') } : {}),
        ...(field.type === 'upload' ? { onBeforeUpload: (file: File) => {
          const max = Number(field.properties.maxSizeMB || 0)
          if (!max || file.size <= max * 1024 * 1024) return true
          Arco.Message.error(locale.value === 'en-US' ? `File exceeds ${max} MB` : `文件大小超过 ${max} MB`)
          return false
        } } : {})
      }, slots)
      return field.type === 'rate' && field.properties.showText ? h('span', { class: 'rate-with-value' }, [control, h('span', { style: { marginLeft: '8px' } }, String(props.modelValue ?? 0))]) : control
    }
  }
})

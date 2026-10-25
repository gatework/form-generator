import { createApp } from 'vue'
import ArcoVue from '@arco-design/web-vue'
import '@arco-design/web-vue/dist/arco.css'
import App from './App.vue'
import { configureGenerator } from './generate'
import richTextSource from './RichText.ts?raw'
import dataSourceSource from './data-source.ts?raw'
configureGenerator({ richText: richTextSource, dataSource: dataSourceSource })
import { applyAppearance } from './locale'
import './style.css'
const query = new URLSearchParams(location.search)
applyAppearance({ locale: query.get('locale') ?? 'zh-CN', dark: query.get('theme') === 'dark' })
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'form-generator:appearance') return
  applyAppearance(event.data)
})
createApp(App).use(ArcoVue).mount('#app')
if (parent !== window) parent.postMessage({ type: 'form-generator:ready' }, location.origin)

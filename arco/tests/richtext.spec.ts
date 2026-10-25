// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import RichText from '../src/RichText'

describe('offline rich text public boundary', () => {
  it('imports and server-renders without starting a browser editor or leaking HTML', async() => {
    const result = await renderToString(createSSRApp({ render: () => h(RichText, { modelValue: '<script>unsafe()</script>', locale: 'en-US' }) }))
    expect(result).toContain('rich-text')
    expect(result).not.toContain('<script>unsafe()')
    expect(result).not.toContain('cdn.tiny.cloud')
  })
})

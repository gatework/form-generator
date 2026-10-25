<template>
  <section>
    <h3 class="property-section">{{ t('dataSource') }}</h3>
    <a-form-item :label="t('remoteOptions')"><a-switch v-model="field.dataSource.enabled" /></a-form-item>
    <template v-if="field.dataSource.enabled">
      <a-form-item :label="t('requestUrl')"><a-input v-model="field.dataSource.url" placeholder="/api/options" /></a-form-item>
      <a-form-item :label="t('requestMethod')"><a-select v-model="field.dataSource.method" :options="['GET', 'POST']" /></a-form-item>
      <a-form-item :label="t('dataPath')"><a-input v-model="field.dataSource.path" placeholder="data.items" /></a-form-item>
      <template v-if="field.type !== 'table'">
        <a-form-item :label="t('labelKey')"><a-input v-model="field.dataSource.labelKey" /></a-form-item>
        <a-form-item :label="t('valueKey')"><a-input v-model="field.dataSource.valueKey" /></a-form-item>
        <a-form-item v-if="field.type === 'cascader'" :label="t('childrenKey')"><a-input v-model="field.dataSource.childrenKey" /></a-form-item>
      </template>
      <a-form-item v-if="field.dataSource.method === 'POST'" :label="t('requestBody')"><a-textarea v-model="field.dataSource.body" /></a-form-item>
      <p class="property-help">{{ t('remoteTip') }}</p>
    </template>
  </section>
</template>
<script setup lang="ts">
import { t } from './locale'
import type { Field } from './schema'
defineProps<{ field: Field }>()
</script>

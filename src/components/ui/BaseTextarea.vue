<script setup lang="ts">
// منطقة نصّ أساس تحاكي VTextarea — تسمية اختيارية + عدد صفوف + تمرير attrs.
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{
  modelValue?: string
  label?: string
  rows?: number
  id?: string
}>(), { rows: 4 })
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="mb-1 block text-sm font-medium text-muted">{{ label }}</label>
    <div class="input-wrap rounded-ui bg-surface px-3 py-2">
      <textarea
        :id="id"
        :value="modelValue"
        :rows="rows"
        class="w-full resize-y bg-transparent text-content outline-none placeholder:text-muted"
        v-bind="$attrs"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseIcon from '@/components/ui/BaseIcon.vue'

// حقل إدخال أساس يحاكي VTextField — تسمية علوية + أيقونة بادئة + خانة لاحقة (slot)
// + رسالة خطأ. يمرّر بقية الـ attrs للـ <input> (placeholder/autocomplete…).
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{
  modelValue?: string
  label?: string
  type?: string
  prefixIcon?: string
  error?: string
  id?: string
}>(), { type: 'text' })
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="mb-1 block text-sm font-medium text-muted">{{ label }}</label>
    <div class="input-wrap rounded-ui flex items-center bg-surface px-3" :class="{ 'has-error': error }">
      <BaseIcon v-if="prefixIcon" :name="prefixIcon" :size="20" class="me-2 text-muted" />
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        class="h-11 min-w-0 flex-1 bg-transparent text-content outline-none placeholder:text-muted"
        v-bind="$attrs"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <slot name="suffix" />
    </div>
    <p v-if="error" class="mt-1 text-xs" style="color: rgb(var(--v-theme-error))">{{ error }}</p>
  </div>
</template>

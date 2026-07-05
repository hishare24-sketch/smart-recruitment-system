<script setup lang="ts">
import BaseIcon from '@/components/ui/BaseIcon.vue'

// حقل إدخال أساس يحاكي VTextField — تسمية علوية + أيقونة بادئة + خانة لاحقة (slot)
// + رسالة خطأ. يمرّر بقية الـ attrs للـ <input> (placeholder/autocomplete…).
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  modelValue?: string | number | null
  label?: string
  type?: string
  prefixIcon?: string
  error?: string
  id?: string
  modelModifiers?: { number?: boolean }
}>(), { type: 'text', modelModifiers: () => ({}) })
const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()

// يحترم v-model.number (كما VTextField) فيبثّ رقمًا عند تفعيل المُعدِّل
function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  emit('update:modelValue', props.modelModifiers.number ? (raw === '' ? '' : Number(raw)) : raw)
}
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
        @input="onInput"
      >
      <slot name="suffix" />
    </div>
    <p v-if="error" class="mt-1 text-xs" style="color: rgb(var(--v-theme-error))">{{ error }}</p>
  </div>
</template>

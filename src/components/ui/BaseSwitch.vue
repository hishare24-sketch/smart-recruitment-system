<script setup lang="ts">
// مفتاح تبديل أساس يحاكي VSwitch — track + thumb، لون brand عند التفعيل.
const props = withDefaults(defineProps<{
  modelValue?: boolean
  label?: string
}>(), { modelValue: false })
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="flex cursor-pointer select-none items-center gap-2 py-1">
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      class="inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition"
      :class="modelValue ? 'justify-end' : 'justify-start'"
      :style="{ background: modelValue ? 'rgb(var(--v-theme-primary))' : 'rgba(var(--v-theme-on-surface), 0.25)' }"
      @click="emit('update:modelValue', !props.modelValue)"
    >
      <span class="h-5 w-5 rounded-full bg-white shadow transition" />
    </button>
    <span v-if="label" class="text-sm">{{ label }}</span>
  </label>
</template>

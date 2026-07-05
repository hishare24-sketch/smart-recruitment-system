<script setup lang="ts">
import { computed } from 'vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

// خانة اختيار أساس تحاكي VCheckbox — تدعم v-model منطقيًّا (boolean) أو مصفوفة
// (مع `value` لكل عنصر). المحتوى عبر slot (أو `label`).
const props = withDefaults(defineProps<{
  modelValue?: boolean | (string | number)[]
  value?: string | number
  label?: string
}>(), { modelValue: false })
const emit = defineEmits<{ 'update:modelValue': [value: boolean | (string | number)[]] }>()

const checked = computed(() => {
  if (Array.isArray(props.modelValue))
    return props.value !== undefined && props.modelValue.includes(props.value)
  return !!props.modelValue
})

function toggle() {
  if (Array.isArray(props.modelValue)) {
    const set = new Set(props.modelValue)
    if (props.value === undefined)
      return
    if (set.has(props.value))
      set.delete(props.value)
    else
      set.add(props.value)
    emit('update:modelValue', [...set])
  }
  else {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<template>
  <label class="flex cursor-pointer select-none items-center gap-2 py-1">
    <span class="checkbox-box" :class="{ 'is-checked': checked }" @click.prevent="toggle">
      <BaseIcon v-if="checked" name="mdi-check" :size="14" class="text-on-brand" />
    </span>
    <span class="text-sm">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

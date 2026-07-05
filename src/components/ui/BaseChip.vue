<script setup lang="ts">
import { computed } from 'vue'

// رقاقة أساس بـ Tailwind — تحاكي VChip (tonal حسب اللون الدلالي).
const props = withDefaults(defineProps<{
  color?: 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
}>(), { color: 'brand' })

// نغمة خفيفة: خلفية شفافة من اللون + نص باللون نفسه (صيغة alpha عبر رمز الثيم)
const style = computed(() => {
  const map: Record<string, string> = {
    brand: 'primary', emerald: 'secondary', accent: 'accent',
    success: 'success', info: 'info', warning: 'warning', error: 'error',
    neutral: 'on-surface',
  }
  const name = map[props.color]
  return {
    backgroundColor: `rgba(var(--v-theme-${name}), 0.14)`,
    color: props.color === 'neutral' ? 'rgb(var(--v-theme-on-surface))' : `rgb(var(--v-theme-${name}))`,
  }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
    :style="style"
  >
    <slot />
  </span>
</template>

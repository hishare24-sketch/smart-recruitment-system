<script setup lang="ts">
import { computed } from 'vue'

// أفاتار أساس — دائرة ملوّنة تحمل أحرفًا أو أيقونة. تحاكي VAvatar.
// اللون دلالي مربوط بثيم Vuetify؛ النغمة tonal (خلفية شفافة + نص باللون) أو صلبة.
const props = withDefaults(defineProps<{
  color?: 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  size?: number
  tonal?: boolean
  square?: boolean
}>(), { color: 'brand', size: 40, tonal: false })

const theme = computed(() => ({
  brand: 'primary', emerald: 'secondary', accent: 'accent',
  success: 'success', info: 'info', warning: 'warning', error: 'error',
  neutral: 'on-surface',
}[props.color]))

const style = computed(() => {
  const name = theme.value
  if (props.tonal) {
    return {
      backgroundColor: `rgba(var(--v-theme-${name}), 0.16)`,
      color: `rgb(var(--v-theme-${name}))`,
      width: `${props.size}px`,
      height: `${props.size}px`,
    }
  }
  return {
    backgroundColor: `rgb(var(--v-theme-${name}))`,
    color: `rgb(var(--v-theme-on-${name === 'on-surface' ? 'surface' : name}))`,
    width: `${props.size}px`,
    height: `${props.size}px`,
  }
})
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center font-bold leading-none"
    :class="square ? 'rounded-ui' : 'rounded-full'"
    :style="style"
  >
    <slot />
  </span>
</template>

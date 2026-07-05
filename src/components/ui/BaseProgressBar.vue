<script setup lang="ts">
import { computed } from 'vue'

// شريط تقدّم خطّي يحاكي VProgressLinear — القيمة 0..100، لون دلالي مربوط بالثيم.
const props = withDefaults(defineProps<{
  value: number
  height?: number
  color?: string // رمز ثيم Vuetify
}>(), { height: 6, color: 'primary' })

const pct = computed(() => Math.min(100, Math.max(0, props.value)))
</script>

<template>
  <div
    class="w-full overflow-hidden rounded-full"
    :style="{ height: `${height}px`, background: 'rgba(var(--v-theme-on-surface), 0.12)' }"
  >
    <div
      class="h-full rounded-full transition-[width] duration-500"
      :style="{ width: `${pct}%`, background: `rgb(var(--v-theme-${color}))` }"
    />
  </div>
</template>

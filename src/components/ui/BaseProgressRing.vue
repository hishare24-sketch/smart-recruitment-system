<script setup lang="ts">
import { computed } from 'vue'

// حلقة تقدّم دائرية (SVG) تحاكي VProgressCircular — القيمة 0..100، لون دلالي
// مربوط بثيم Vuetify، والمنتصف slot. كل الإحداثيات في فضاء viewBox 0..100.
const props = withDefaults(defineProps<{
  value: number
  size?: number
  width?: number
  color?: string // رمز ثيم Vuetify: primary/secondary/accent/success/warning/error/info
}>(), { size: 72, width: 8, color: 'primary' })

// عرض الحدّ في فضاء viewBox (نسبة من الحجم × 100)
const strokeVB = computed(() => (props.width / props.size) * 100)
const r = computed(() => (100 - strokeVB.value) / 2)
const circumference = computed(() => 2 * Math.PI * r.value)
const dash = computed(() => (Math.min(100, Math.max(0, props.value)) / 100) * circumference.value)
const stroke = computed(() => `rgb(var(--v-theme-${props.color}))`)
</script>

<template>
  <div class="relative inline-flex items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg viewBox="0 0 100 100" class="h-full w-full -rotate-90">
      <circle cx="50" cy="50" :r="r" fill="none" :stroke-width="strokeVB" stroke="rgba(var(--v-theme-on-surface), 0.12)" />
      <circle
        cx="50" cy="50" :r="r" fill="none" :stroke-width="strokeVB"
        :stroke="stroke" stroke-linecap="round"
        :stroke-dasharray="`${dash} ${circumference}`"
        class="transition-[stroke-dasharray] duration-500"
      />
    </svg>
    <div class="absolute inset-0 flex items-center justify-center">
      <slot />
    </div>
  </div>
</template>

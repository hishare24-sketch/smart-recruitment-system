<script setup lang="ts">
import { computed } from 'vue'

// شارة أساس — نقطة أو عدّاد يعلو زاوية المحتوى (overlay)، أو inline بجانب النص.
// تحاكي VBadge: dot/content/color/location/inline + إظهار مشروط عبر show.
const props = withDefaults(defineProps<{
  show?: boolean
  dot?: boolean
  content?: number | string
  color?: 'brand' | 'accent' | 'error' | 'warning' | 'success'
  location?: 'top-end' | 'top-start' | 'bottom-end' | 'bottom-start'
  inline?: boolean
}>(), { show: true, color: 'error', location: 'top-end' })

const themeName = computed(() => ({
  brand: 'primary', accent: 'accent', error: 'error', warning: 'warning', success: 'success',
}[props.color]))

const badgeStyle = computed(() => ({
  backgroundColor: `rgb(var(--v-theme-${themeName.value}))`,
  color: `rgb(var(--v-theme-on-${themeName.value}))`,
}))

// إحداثيات الزاوية (منطقية: start/end تحترم الاتجاه RTL/LTR تلقائيًّا)
const posClass = computed(() => ({
  'top-end': '-top-1 -end-1',
  'top-start': '-top-1 -start-1',
  'bottom-end': '-bottom-1 -end-1',
  'bottom-start': '-bottom-1 -start-1',
}[props.location]))
</script>

<template>
  <!-- inline: الشارة عنصر متدفّق بجانب المحتوى -->
  <span v-if="inline" class="inline-flex items-center gap-1">
    <slot />
    <span
      v-if="show"
      class="inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[0.65rem] font-bold leading-tight"
      :style="badgeStyle"
    >{{ content }}</span>
  </span>

  <!-- overlay: الشارة تعلو زاوية المحتوى -->
  <span v-else class="relative inline-flex">
    <slot />
    <span
      v-if="show"
      class="absolute z-10 flex items-center justify-center rounded-full font-bold leading-none"
      :class="[posClass, dot ? 'h-2.5 w-2.5' : 'h-[1.1rem] min-w-[1.1rem] px-1 text-[0.65rem]']"
      :style="badgeStyle"
    >{{ dot ? '' : content }}</span>
  </span>
</template>

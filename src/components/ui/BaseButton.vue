<script setup lang="ts">
import { computed } from 'vue'

// زرّ أساس بـ Tailwind — مربوط بثيم Vuetify (يتزامن داكن/فاتح). أول لبنة في
// ترحيل المرحلة 5. الواجهة تحاكي VBtn (variant/size/block/disabled/loading).
const props = withDefaults(defineProps<{
  variant?: 'brand' | 'accent' | 'emerald' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit'
}>(), { variant: 'brand', size: 'md', type: 'button' })

const sizeClass = computed(() => ({
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}[props.size]))

const variantClass = computed(() => ({
  brand: 'bg-brand text-on-brand hover:brightness-110',
  accent: 'bg-accent text-on-accent hover:brightness-110',
  emerald: 'bg-emerald text-on-brand hover:brightness-110',
  outline: 'border-ui text-content bg-transparent hover:bg-surfalt',
  ghost: 'text-content bg-transparent hover:bg-surfalt',
}[props.variant]))
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="ring-brand-focus inline-flex items-center justify-center rounded-ui font-semibold transition
           disabled:cursor-not-allowed disabled:opacity-50"
    :class="[sizeClass, variantClass, block ? 'w-full' : '']"
  >
    <span
      v-if="loading"
      class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
    <slot v-else />
  </button>
</template>

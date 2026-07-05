<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

// زرّ أساس بـ Tailwind — مربوط بثيم Vuetify (يتزامن داكن/فاتح). أول لبنة في
// ترحيل المرحلة 5. الواجهة تحاكي VBtn (variant/size/block/disabled/loading)،
// ويصير رابطًا (RouterLink) عند تمرير `to`.
const props = withDefaults(defineProps<{
  variant?: 'brand' | 'accent' | 'emerald' | 'outline' | 'ghost' | 'tonal-brand' | 'tonal-accent' | 'tonal-emerald'
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit'
  to?: RouteLocationRaw
  align?: 'center' | 'start'
}>(), { variant: 'brand', size: 'md', type: 'button', align: 'center' })

const sizeClass = computed(() => ({
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}[props.size]))

const variantClass = computed(() => ({
  'brand': 'bg-brand text-on-brand hover:brightness-110',
  'accent': 'bg-accent text-on-accent hover:brightness-110',
  'emerald': 'bg-emerald text-on-brand hover:brightness-110',
  'outline': 'border-ui text-content bg-transparent hover:bg-surfalt',
  'ghost': 'text-content bg-transparent hover:bg-surfalt',
  'tonal-brand': 'btn-tonal-brand',
  'tonal-accent': 'btn-tonal-accent',
  'tonal-emerald': 'btn-tonal-emerald',
}[props.variant]))
</script>

<template>
  <RouterLink
    v-if="to"
    :to="to"
    class="ring-brand-focus inline-flex items-center rounded-ui font-semibold transition"
    :class="[sizeClass, variantClass, block ? 'w-full' : '', align === 'start' ? 'justify-start' : 'justify-center']"
  >
    <slot />
  </RouterLink>
  <button
    v-else
    :type="type"
    :disabled="disabled || loading"
    class="ring-brand-focus inline-flex items-center rounded-ui font-semibold transition
           disabled:cursor-not-allowed disabled:opacity-50"
    :class="[sizeClass, variantClass, block ? 'w-full' : '', align === 'start' ? 'justify-start' : 'justify-center']"
  >
    <span
      v-if="loading"
      class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
    <slot v-else />
  </button>
</template>

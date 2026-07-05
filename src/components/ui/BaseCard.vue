<script setup lang="ts">
// بطاقة أساس بـ Tailwind — سطح داكن بحدّ رفيع وانحناء موحّد، يحاكي VCard.
withDefaults(defineProps<{ padded?: boolean, hover?: boolean }>(), { padded: true })
</script>

<template>
  <div
    class="border-ui rounded-ui-lg bg-surface text-content transition"
    :class="[padded ? 'p-5' : '', hover ? 'hover:shadow-lg hover:shadow-black/20' : '']"
  >
    <slot />
  </div>
</template>

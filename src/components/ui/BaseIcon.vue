<script setup lang="ts">
// أيقونة أساس — تعتمد خطّ Material Design Icons المُحمّل عالميًّا (@mdi/font).
// تحاكي VIcon: تمرّر اسم mdi-* وحجمًا بالبكسل. لبنة ترحيل المرحلة 5 (بلا Vuetify).
withDefaults(defineProps<{ name: string, size?: number | string }>(), { size: 24 })
</script>

<template>
  <i
    class="mdi inline-flex items-center justify-center leading-none"
    :class="name"
    :style="{ fontSize: typeof size === 'number' ? `${size}px` : size }"
    aria-hidden="true"
  />
</template>

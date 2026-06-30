<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  icon: string
  color?: string
  trend?: string
}>()
</script>

<template>
  <VCard class="pa-4" height="100%">
    <div class="d-flex align-center ga-4">
      <VAvatar :color="color ?? 'primary'" size="52" rounded="lg" variant="tonal">
        <VIcon :icon="icon" size="26" />
      </VAvatar>
      <div>
        <div class="text-h5 font-weight-bold">
          {{ value }}
        </div>
        <div class="text-body-2 text-medium-emphasis">
          {{ title }}
        </div>
      </div>
    </div>
    <div v-if="trend" class="text-caption text-success mt-2">
      <VIcon icon="mdi-trending-up" size="16" /> {{ trend }}
    </div>
  </VCard>
</template>

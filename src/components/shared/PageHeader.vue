<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  icon?: string
}>()
</script>

<template>
  <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
    <div class="d-flex align-center ga-3">
      <VAvatar v-if="icon" color="primary" variant="tonal" rounded="lg" size="44">
        <VIcon :icon="icon" />
      </VAvatar>
      <div>
        <h1 class="text-h5 font-weight-bold">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-body-2 text-medium-emphasis mb-0">
          {{ subtitle }}
        </p>
      </div>
    </div>
    <div class="d-flex align-center ga-2">
      <slot name="actions" />
    </div>
  </div>
</template>

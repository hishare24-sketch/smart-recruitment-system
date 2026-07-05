<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

defineProps<{
  icon?: string
  title: string
  description?: string
  actionText?: string
  actionIcon?: string
}>()
defineEmits<{ action: [] }>()
</script>

<template>
  <div class="px-4 py-10 text-center">
    <div
      class="mx-auto mb-3 flex items-center justify-center rounded-full"
      style="width: 72px; height: 72px; background: rgb(var(--v-theme-surface-variant))"
    >
      <BaseIcon :name="icon ?? 'mdi-inbox-outline'" :size="36" style="color: rgb(var(--v-theme-primary))" />
    </div>
    <div class="font-bold">
      {{ title }}
    </div>
    <p v-if="description" class="mx-auto mt-1 text-sm text-muted" style="max-width: 420px">
      {{ description }}
    </p>
    <div class="mt-4 flex justify-center">
      <slot name="action">
        <BaseButton v-if="actionText" variant="accent" @click="$emit('action')">
          <BaseIcon v-if="actionIcon" :name="actionIcon" :size="18" /> {{ actionText }}
        </BaseButton>
      </slot>
    </div>
  </div>
</template>

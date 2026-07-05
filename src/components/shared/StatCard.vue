<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

const props = defineProps<{
  title: string
  value: string | number
  icon: string
  color?: string
  trend?: string
}>()

// تحويل رمز لون Vuetify إلى نغمة BaseAvatar
type AvatarColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function avatarColor(): AvatarColor {
  return (({ primary: 'brand', secondary: 'emerald' } as Record<string, AvatarColor>)[props.color ?? 'primary'] ?? props.color ?? 'brand') as AvatarColor
}
</script>

<template>
  <BaseCard class="h-full">
    <div class="flex items-center gap-4">
      <BaseAvatar :color="avatarColor()" :size="52" tonal square>
        <BaseIcon :name="icon" :size="26" />
      </BaseAvatar>
      <div>
        <div class="text-2xl font-bold">
          {{ value }}
        </div>
        <div class="text-sm text-muted">
          {{ title }}
        </div>
      </div>
    </div>
    <div v-if="trend" class="mt-2 flex items-center gap-1 text-xs" style="color: rgb(var(--v-theme-success))">
      <BaseIcon name="mdi-trending-up" :size="16" /> {{ trend }}
    </div>
  </BaseCard>
</template>

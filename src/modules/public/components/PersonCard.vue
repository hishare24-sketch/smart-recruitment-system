<script setup lang="ts">
// بطاقة شخص في استكشاف الأشخاص — مكوّن مستقلّ (بدل حيلة <template v-for="p in [item]">).
// يستقبل العنصر ويصدر select عند التفعيل؛ الصفحة تقرّر الفتح (صفحة حيّة أو معاينة).
import { useI18n } from 'vue-i18n'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

export interface Person {
  slug: string
  name: string
  initial: string
  headline: string
  location: string
  roles: string[]
  skills: string[]
  credibility: number
  followers: number
  rating: number
  live?: boolean
}

defineProps<{ person: Person }>()
const emit = defineEmits<{ select: [person: Person] }>()
const { t } = useI18n()
</script>

<template>
  <BaseCard
    hover class="flex h-full cursor-pointer flex-col" role="button" tabindex="0"
    @click="emit('select', person)"
    @keydown.enter="emit('select', person)"
    @keydown.space.prevent="emit('select', person)"
  >
    <div class="mb-2 flex items-center gap-3">
      <BaseAvatar color="brand" :size="48" tonal>
        <span class="text-lg font-bold">{{ person.initial }}</span>
      </BaseAvatar>
      <div class="flex-1">
        <div class="flex items-center gap-1">
          <span class="font-bold text-content">{{ person.name }}</span>
          <BaseChip v-if="person.live" color="success">{{ t('discovery.people.live') }}</BaseChip>
        </div>
        <div class="text-xs text-muted">{{ person.headline }}</div>
        <div class="text-xs text-muted"><BaseIcon name="mdi-map-marker-outline" :size="12" /> {{ person.location }}</div>
      </div>
    </div>

    <div class="mb-2 flex flex-wrap gap-1">
      <BaseChip v-for="r in person.roles" :key="r" color="emerald">{{ r }}</BaseChip>
    </div>
    <div class="mb-3 flex flex-wrap gap-1">
      <BaseChip v-for="sk in person.skills.slice(0, 3)" :key="sk" color="neutral">{{ sk }}</BaseChip>
    </div>

    <div class="mt-auto flex items-center gap-3 text-xs text-muted">
      <span :title="t('discovery.people.credibility')"><BaseIcon name="mdi-shield-check-outline" :size="14" style="color: rgb(var(--v-theme-primary))" /> {{ person.credibility }}%</span>
      <span :title="t('discovery.people.followers')"><BaseIcon name="mdi-account-group-outline" :size="14" style="color: rgb(var(--v-theme-accent))" /> {{ person.followers }}</span>
      <span :title="t('discovery.people.rating')"><BaseIcon name="mdi-star" :size="14" style="color: rgb(var(--v-theme-warning))" /> {{ person.rating }}</span>
      <BaseIcon name="mdi-arrow-left-circle-outline" :size="18" class="ms-auto" style="color: rgb(var(--v-theme-primary))" />
    </div>
  </BaseCard>
</template>

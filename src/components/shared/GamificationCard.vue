<script setup lang="ts">
import { computed } from 'vue'
import { useGamificationStore } from '@/stores/GamificationStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'

withDefaults(defineProps<{ showLink?: boolean }>(), { showLink: true })

const g = useGamificationStore()
const earnedBadges = computed(() => g.badges.filter(b => b.earned))
const lockedBadges = computed(() => g.badges.filter(b => !b.earned))
</script>

<template>
  <BaseCard>
    <div class="mb-3 flex items-center gap-2">
      <BaseIcon name="mdi-trophy-outline" :size="22" style="color: rgb(var(--v-theme-warning))" />
      <h3 class="font-bold">إنجازاتي</h3>
      <div class="flex-1" />
      <span
        class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white"
        :style="{ backgroundColor: g.tier.color }"
      >
        <BaseIcon name="mdi-shield-star-outline" :size="14" /> {{ g.tier.name }}
      </span>
    </div>

    <!-- Points + tier progress -->
    <div class="mb-3 flex items-center gap-4">
      <div class="shrink-0 text-center">
        <div class="text-4xl font-bold leading-none" style="color: rgb(var(--v-theme-warning))">
          {{ g.points }}
        </div>
        <div class="text-xs text-muted">نقطة</div>
      </div>
      <div class="flex-1">
        <div class="mb-1 flex justify-between text-xs">
          <span class="text-muted">التقدّم للمستوى التالي</span>
          <span v-if="g.nextTier" class="font-bold">{{ g.pointsToNext }} نقطة لـ{{ g.nextTier.name }}</span>
          <span v-else class="font-bold" style="color: rgb(var(--v-theme-success))">أعلى مستوى!</span>
        </div>
        <BaseProgressBar :value="g.tierProgress" color="warning" :height="8" />
      </div>
      <div class="shrink-0 text-center">
        <div class="flex items-center gap-1">
          <BaseIcon name="mdi-fire" :size="22" style="color: rgb(var(--v-theme-error))" />
          <span class="text-lg font-bold">{{ g.streak.count }}</span>
        </div>
        <div class="text-xs text-muted">يوم متتابع</div>
      </div>
    </div>

    <div class="mb-3 border-t border-ui" />

    <!-- Active challenges -->
    <div class="mb-2 flex items-center justify-between">
      <span class="flex items-center gap-1 text-xs font-bold"><BaseIcon name="mdi-target" :size="14" /> تحديات نشطة</span>
      <span class="text-xs text-muted">{{ g.earnedCount }}/{{ g.badges.length }} شارة</span>
    </div>
    <div v-for="c in g.activeChallenges" :key="c.id" class="mb-2">
      <div class="mb-1 flex justify-between text-xs">
        <span>{{ c.title }}</span>
        <span class="font-bold">{{ c.progress }}/{{ c.target }} · +{{ c.reward }}</span>
      </div>
      <BaseProgressBar :value="(c.progress / c.target) * 100" color="accent" :height="6" />
    </div>
    <div v-if="!g.activeChallenges.length" class="py-2 text-center text-xs text-muted">
      <BaseIcon name="mdi-check-decagram" :size="16" style="color: rgb(var(--v-theme-success))" /> أنجزت كل التحديات الحالية!
    </div>

    <div class="my-3 border-t border-ui" />

    <!-- Badges -->
    <div class="mb-2 flex items-center gap-1 text-xs font-bold"><BaseIcon name="mdi-medal-outline" :size="14" /> الشارات</div>
    <div class="flex flex-wrap gap-2">
      <BaseChip v-for="b in earnedBadges" :key="b.id" color="warning" :title="b.desc">
        <BaseIcon :name="b.icon" :size="14" /> {{ b.name }}
      </BaseChip>
      <span
        v-for="b in lockedBadges"
        :key="b.id"
        class="inline-flex items-center gap-1 rounded-full border-ui px-2.5 py-1 text-xs font-medium opacity-45"
        :title="`مقفلة: ${b.desc}`"
      >
        <BaseIcon :name="b.icon" :size="14" /> {{ b.name }}
      </span>
    </div>

    <RouterLink
      v-if="showLink"
      :to="{ name: 'achievements' }"
      class="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
      style="color: rgb(var(--v-theme-warning))"
    >
      الإنجازات ولوحة الصدارة <BaseIcon name="mdi-arrow-left" :size="16" />
    </RouterLink>
  </BaseCard>
</template>

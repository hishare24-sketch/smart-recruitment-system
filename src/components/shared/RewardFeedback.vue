<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGamificationStore } from '@/stores/GamificationStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'

const g = useGamificationStore()
const notifications = useNotificationsStore()

// Points toast
const pointsSnack = ref(false)
const pointsMsg = ref('')
watch(() => g.lastReward?.at, (at) => {
  if (!at || !g.lastReward)
    return
  pointsMsg.value = g.lastReward.label ? `+${g.lastReward.points} نقطة · ${g.lastReward.label}` : `+${g.lastReward.points} نقطة`
  pointsSnack.value = true
})

// Badge-unlock celebration + notification
const badgeSnack = ref(false)
const badge = ref<{ name: string, icon: string, desc: string } | null>(null)
watch(() => g.lastBadgeId, (id) => {
  if (!id)
    return
  const b = g.badgeById(id)
  if (!b)
    return
  badge.value = b
  badgeSnack.value = true
  notifications.push({
    icon: b.icon,
    color: 'warning',
    title: 'فتحت شارة جديدة! 🎉',
    body: `${b.name} — ${b.desc}`,
    category: 'system',
  })
})
</script>

<template>
  <!-- Points earned -->
  <VSnackbar v-model="pointsSnack" color="warning" location="bottom" timeout="2600">
    <div class="d-flex align-center ga-2">
      <VIcon icon="mdi-star-four-points" />
      <span class="font-weight-bold">{{ pointsMsg }}</span>
    </div>
  </VSnackbar>

  <!-- Badge unlocked celebration -->
  <VSnackbar v-model="badgeSnack" color="transparent" location="top" timeout="4500" elevation="0">
    <VCard v-if="badge" class="badge-pop pa-4 text-center" color="warning" theme="light">
      <VIcon :icon="badge.icon" size="44" class="badge-pop__icon" />
      <div class="text-subtitle-1 font-weight-bold mt-1">فتحت شارة: {{ badge.name }}</div>
      <div class="text-caption">{{ badge.desc }}</div>
    </VCard>
  </VSnackbar>
</template>

<style scoped>
.badge-pop {
  border-radius: 16px;
  animation: badge-pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.badge-pop__icon {
  animation: badge-spin 0.6s ease;
}
@keyframes badge-pop-in {
  from {
    transform: scale(0.7);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes badge-spin {
  from {
    transform: rotate(-25deg) scale(0.6);
  }
  to {
    transform: rotate(0) scale(1);
  }
}
</style>

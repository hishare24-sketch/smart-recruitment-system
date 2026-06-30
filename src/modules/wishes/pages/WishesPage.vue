<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'

interface Wish {
  id: number
  company: string
  amount: string
  duration: string
  reason: string
  matchRate: number
  status: 'new' | 'pending' | 'accepted' | 'rejected'
}

const statusMeta: Record<Wish['status'], { label: string, color: string }> = {
  new: { label: 'جديد', color: 'accent' },
  pending: { label: 'قيد الانتظار', color: 'warning' },
  accepted: { label: 'مقبول', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
}

const wishes = ref<Wish[]>([
  { id: 1, company: 'شركة الحلول الذكية', amount: '16,000 ريال', duration: '6 أشهر', reason: 'مهاراتك في Vue تطابق احتياجنا تماماً.', matchRate: 95, status: 'new' },
  { id: 2, company: 'مؤسسة البناء الرقمي', amount: '12,000 ريال', duration: 'دائم', reason: 'نبحث عن مطوّر بخبرتك لقيادة فريق الواجهات.', matchRate: 88, status: 'pending' },
  { id: 3, company: 'وكالة الإبداع', amount: '4,500 ريال', duration: 'مهمة', reason: 'مشروع قصير يناسب خبرتك.', matchRate: 79, status: 'accepted' },
])

const stats = [
  { title: 'إجمالي الرغبات', value: 12, icon: 'mdi-hand-heart-outline', color: 'primary' },
  { title: 'معلّقة', value: 4, icon: 'mdi-clock-outline', color: 'warning' },
  { title: 'مقبولة', value: 6, icon: 'mdi-check-circle-outline', color: 'success' },
  { title: 'مرفوضة', value: 2, icon: 'mdi-close-circle-outline', color: 'error' },
]

function setStatus(wish: Wish, status: Wish['status']) {
  wish.status = status
}
</script>

<template>
  <div>
    <PageHeader
      title="الرغبات الواردة"
      subtitle="جهات أبدت رغبتها في خدماتك"
      icon="mdi-hand-heart-outline"
    />

    <VRow class="mb-2">
      <VCol v-for="s in stats" :key="s.title" cols="6" md="3">
        <StatCard v-bind="s" />
      </VCol>
    </VRow>

    <VRow>
      <VCol v-for="wish in wishes" :key="wish.id" cols="12" md="6">
        <VCard class="pa-4" height="100%">
          <div class="d-flex justify-space-between align-start mb-2">
            <div class="d-flex align-center ga-3">
              <VAvatar color="secondary" variant="tonal" rounded="lg">
                <VIcon icon="mdi-domain" />
              </VAvatar>
              <div>
                <div class="text-subtitle-1 font-weight-bold">{{ wish.company }}</div>
                <div class="text-caption text-medium-emphasis">{{ wish.amount }} · {{ wish.duration }}</div>
              </div>
            </div>
            <VChip :color="statusMeta[wish.status].color" size="small" label>
              {{ statusMeta[wish.status].label }}
            </VChip>
          </div>

          <p class="text-body-2 text-medium-emphasis my-2">{{ wish.reason }}</p>

          <VAlert type="info" variant="tonal" density="compact" class="text-caption mb-3">
            <VIcon icon="mdi-robot-happy-outline" size="14" /> هذه الرغبة تطابق مهاراتك بنسبة {{ wish.matchRate }}%
          </VAlert>

          <div v-if="wish.status === 'new' || wish.status === 'pending'" class="d-flex ga-2">
            <VBtn color="success" size="small" class="flex-grow-1" prepend-icon="mdi-check" @click="setStatus(wish, 'accepted')">
              قبول
            </VBtn>
            <VBtn color="warning" variant="outlined" size="small" prepend-icon="mdi-swap-horizontal">
              تفاوض
            </VBtn>
            <VBtn color="error" variant="outlined" size="small" icon="mdi-close" @click="setStatus(wish, 'rejected')" />
          </div>
          <div v-else class="text-center text-body-2 text-medium-emphasis pt-1">
            تم {{ statusMeta[wish.status].label }} هذه الرغبة
          </div>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import { useWishesStore } from '@/stores/WishesStore'
import type { Wish, WishStatus } from '@/stores/WishesStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral' } as Record<string, BaseColor>)[c] ?? c) as BaseColor
}

const store = useWishesStore()

const statusMeta: Record<WishStatus, { label: string, color: string }> = {
  new: { label: 'جديد', color: 'accent' },
  pending: { label: 'قيد الانتظار', color: 'warning' },
  accepted: { label: 'مقبول', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
}

const stats = computed(() => [
  { title: 'إجمالي الرغبات', value: store.total, icon: 'mdi-hand-heart-outline', color: 'primary' },
  { title: 'معلّقة', value: store.pendingCount, icon: 'mdi-clock-outline', color: 'warning' },
  { title: 'مقبولة', value: store.acceptedCount, icon: 'mdi-check-circle-outline', color: 'success' },
  { title: 'مرفوضة', value: store.rejectedCount, icon: 'mdi-close-circle-outline', color: 'error' },
])

// Negotiation dialog
const negotiateDialog = ref(false)
const activeWish = ref<Wish | null>(null)
const counterAmount = ref('')
const counterDuration = ref('')
const counterNotes = ref('')

function openNegotiate(wish: Wish) {
  activeWish.value = wish
  counterAmount.value = ''
  counterDuration.value = ''
  counterNotes.value = ''
  negotiateDialog.value = true
}
function submitNegotiation() {
  if (activeWish.value)
    store.setStatus(activeWish.value.id, 'pending')
  negotiateDialog.value = false
}
</script>

<template>
  <div>
    <PageHeader title="الرغبات الواردة" subtitle="جهات أبدت رغبتها في خدماتك" icon="mdi-hand-heart-outline" />

    <div class="mb-2 grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard v-for="s in stats" :key="s.title" v-bind="s" />
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <BaseCard v-for="wish in store.wishes" :key="wish.id" class="flex h-full flex-col">
        <div class="mb-2 flex items-start justify-between">
          <div class="flex items-center gap-3">
            <BaseAvatar color="emerald" tonal square>
              <span class="font-bold">{{ wish.companyInitial }}</span>
            </BaseAvatar>
            <div>
              <div class="font-bold text-content">{{ wish.company }}</div>
              <div class="text-xs text-muted">{{ wish.role }} · {{ wish.amount }} · {{ wish.duration }}</div>
            </div>
          </div>
          <BaseChip :color="mapColor(statusMeta[wish.status].color)">{{ statusMeta[wish.status].label }}</BaseChip>
        </div>

        <p class="my-2 text-sm text-muted">{{ wish.reason }}</p>

        <div class="mb-3 flex flex-wrap gap-2">
          <BaseChip color="info"><BaseIcon name="mdi-robot-happy-outline" :size="13" /> تطابق {{ wish.matchRate }}%</BaseChip>
          <BaseChip color="success"><BaseIcon name="mdi-star-outline" :size="13" /> سمعة الجهة: {{ wish.reputation }}</BaseChip>
        </div>

        <div v-if="wish.status === 'new' || wish.status === 'pending'" class="mt-auto flex gap-2">
          <BaseButton variant="emerald" size="sm" class="flex-1" @click="store.setStatus(wish.id, 'accepted')">
            <BaseIcon name="mdi-check" :size="16" /> قبول
          </BaseButton>
          <BaseButton variant="outline" size="sm" @click="openNegotiate(wish)">
            <BaseIcon name="mdi-swap-horizontal" :size="16" /> تفاوض
          </BaseButton>
          <BaseButton variant="outline" size="sm" aria-label="رفض" @click="store.setStatus(wish.id, 'rejected')">
            <BaseIcon name="mdi-close" :size="16" style="color: rgb(var(--v-theme-error))" />
          </BaseButton>
        </div>
        <div v-else class="mt-auto pt-1 text-center text-sm text-muted">
          تم {{ statusMeta[wish.status].label }} هذه الرغبة
          <button class="font-medium text-brand" @click="store.setStatus(wish.id, 'new')">تراجع</button>
        </div>
      </BaseCard>
    </div>

    <!-- Negotiation dialog -->
    <BaseModal v-model="negotiateDialog" :title="`التفاوض مع ${activeWish?.company ?? ''}`" :max-width="480">
      <BaseInput v-model="counterAmount" label="المقابل المقترح" placeholder="مثال: 18,000 ريال" class="mb-2" />
      <BaseInput v-model="counterDuration" label="المدة المقترحة" placeholder="مثال: سنة" class="mb-2" />
      <BaseTextarea v-model="counterNotes" label="ملاحظات" :rows="3" />
      <template #actions>
        <BaseButton variant="ghost" size="sm" @click="negotiateDialog = false">إلغاء</BaseButton>
        <BaseButton variant="brand" size="sm" @click="submitNegotiation">
          <BaseIcon name="mdi-send" :size="16" /> إرسال العرض المضاد
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import type { MarketExpert, MarketExpertRole } from '@/stores/ExpertRolesStore'
import { EXPERT_TIER_META, MARKET_EXPERTS, MARKET_ROLE_META, expertTier } from '@/stores/ExpertRolesStore'
import { EXPERT_SPECIALTY_META } from '@/services/personas'
import type { FacetSpec, SortSpec } from '@/composables/useFacetedList'
import FacetedList from '@/components/shared/FacetedList.vue'
import { uniq } from '@/utils/array'
import type { PeerRequestType } from '@/stores/PeerRequestsStore'
import { usePeerRequestsStore } from '@/stores/PeerRequestsStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { useAuthStore } from '@/stores/AuthStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'

// السوق الموحّد لاكتشاف خبراء النظام البيئي (جانب الطلب) — يغذي الطلبات المتبادلة
const { t } = useI18n()
const peerRequests = usePeerRequestsStore()
const notifications = useNotificationsStore()
const authStore = useAuthStore()

const snackbar = ref(false)

// —— العقد الموحّد: الدور محوريّ + التخصّص فاسِت باحث (بلا محور قطاعيّ — محور مستقلّ) ——
const roleKeys = Object.keys(MARKET_ROLE_META) as MarketExpertRole[]
const facets = computed<FacetSpec<MarketExpert>[]>(() => [
  {
    key: 'role', label: t('discovery.experts.facetRole'), kind: 'multi', primary: true,
    value: e => e.role,
    options: () => roleKeys.map(r => ({ value: r, label: MARKET_ROLE_META[r].label, icon: MARKET_ROLE_META[r].icon })),
  },
  {
    key: 'specialty', label: t('discovery.experts.facetSpecialty'), kind: 'multi', searchable: true,
    value: e => e.specialtyKey,
    options: () => uniq(MARKET_EXPERTS.map(e => e.specialtyKey)).map(sp => ({ value: sp, label: EXPERT_SPECIALTY_META[sp].label, icon: EXPERT_SPECIALTY_META[sp].icon })),
  },
])
const sorts = computed<SortSpec<MarketExpert>[]>(() => [
  { key: 'rating', label: t('discovery.sortRatingHigh'), cmp: (a, b) => b.rating - a.rating },
  { key: 'clients', label: t('discovery.experts.sortClients'), cmp: (a, b) => b.clients - a.clients },
  { key: 'price', label: t('discovery.experts.sortPriceLow'), cmp: (a, b) => a.priceFrom - b.priceFrom },
])
const expertText = (e: MarketExpert) => `${e.name} ${e.title} ${e.specialty} ${EXPERT_SPECIALTY_META[e.specialtyKey].label}`

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function roleColor(role: MarketExpertRole): BaseColor {
  return ({ coach: 'brand', trainer: 'info', consultant: 'warning' } as Record<MarketExpertRole, BaseColor>)[role]
}
function tierColor(c: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald' } as Record<string, BaseColor>)[c] ?? c) as BaseColor
}
function tierOf(e: MarketExpert) {
  return EXPERT_TIER_META[expertTier(e.clients)]
}

// دور الخبير → نوع الطلب المتبادل المقابل
const ROLE_TO_REQUEST: Record<MarketExpertRole, PeerRequestType> = {
  coach: 'coaching',
  trainer: 'training',
  consultant: 'consultation',
}

const requestDialog = ref(false)
const selected = ref<MarketExpert | null>(null)
const reason = ref('')
function openRequest(e: MarketExpert) {
  selected.value = e
  reason.value = ''
  requestDialog.value = true
}
function sendRequest() {
  const e = selected.value
  if (!e || !reason.value.trim())
    return
  peerRequests.create({
    type: ROLE_TO_REQUEST[e.role],
    personName: e.name,
    personRole: e.title,
    reason: reason.value.trim(),
    skills: [e.specialty],
    attachments: [],
  })
  requestDialog.value = false
  snackbar.value = true
  notifications.push({
    icon: MARKET_ROLE_META[e.role].icon,
    color: 'success',
    title: t('discovery.experts.notifTitle'),
    body: t('discovery.experts.notifBody', { service: MARKET_ROLE_META[e.role].service, name: e.name }),
    category: 'system',
    actionTo: '/peer-requests',
    actionLabel: t('discovery.experts.notifAction'),
  })
}

const canJoin = computed(() => !!authStore.authUser)
</script>

<template>
  <div>
    <PageHeader
      :title="t('discovery.experts.title')"
      :subtitle="t('discovery.experts.subtitle')"
      icon="mdi-account-tie-outline"
    />

    <FacetedList
      :items="MARKET_EXPERTS"
      :facets="facets"
      :sorts="sorts"
      :text="expertText"
      :item-key="(e: MarketExpert) => e.id"
      view="grid"
      :noun="t('discovery.experts.noun')"
      :search-placeholder="t('discovery.experts.search')"
    >
      <template #item="{ item }">
        <template v-for="e in [item as MarketExpert]" :key="e.id">
        <BaseCard class="flex h-full flex-col">
        <div class="mb-2 flex items-center gap-3">
          <BaseAvatar :color="roleColor(e.role)" :size="48" tonal>{{ e.initial }}</BaseAvatar>
          <div class="flex-1">
            <div class="flex items-center gap-1">
              <span class="font-bold">{{ e.name }}</span>
              <BaseIcon v-if="e.verified" name="mdi-check-decagram" :size="16" style="color: rgb(var(--v-theme-primary))" />
            </div>
            <div class="text-xs text-muted">{{ e.title }}</div>
          </div>
        </div>

        <div class="mb-2 flex flex-wrap gap-1">
          <BaseChip :color="roleColor(e.role)"><BaseIcon :name="EXPERT_SPECIALTY_META[e.specialtyKey].icon" :size="14" /> {{ EXPERT_SPECIALTY_META[e.specialtyKey].label }}</BaseChip>
          <BaseChip :color="tierColor(tierOf(e).color)"><BaseIcon :name="tierOf(e).icon" :size="14" /> {{ tierOf(e).label }}</BaseChip>
        </div>

        <div class="mb-3 text-sm">{{ e.specialty }}</div>

        <div class="mb-3 mt-auto flex items-center gap-3 text-xs text-muted">
          <span class="flex items-center gap-1"><BaseIcon name="mdi-star" :size="14" style="color: rgb(var(--v-theme-warning))" /> {{ e.rating }}</span>
          <span class="flex items-center gap-1"><BaseIcon name="mdi-account-group-outline" :size="14" /> {{ t('discovery.experts.clients', { count: e.clients }) }}</span>
          <span class="ms-auto font-bold" style="color: rgb(var(--v-theme-primary))">{{ t('discovery.experts.priceFrom', { price: e.priceFrom, unit: e.priceUnit }) }}</span>
        </div>

        <div class="flex gap-2">
          <BaseButton variant="outline" size="sm" :to="{ name: 'expert-profile', params: { slug: e.slug } }">{{ t('discovery.experts.profile') }}</BaseButton>
          <BaseButton :variant="e.role === 'consultant' ? 'accent' : e.role === 'trainer' ? 'emerald' : 'brand'" size="sm" class="flex-1" @click="openRequest(e)">
            <BaseIcon name="mdi-send" :size="16" /> {{ t('discovery.experts.request', { service: MARKET_ROLE_META[e.role].service }) }}
          </BaseButton>
        </div>
        </BaseCard>
        </template>
      </template>
    </FacetedList>

    <!-- دعوة جانب العرض -->
    <div v-if="canJoin" class="brand-gradient rounded-ui-lg mt-6 p-5 text-center">
      <p class="mb-3 text-white">{{ t('discovery.experts.joinBanner') }}</p>
      <div class="flex flex-wrap justify-center gap-2">
        <RouterLink
          v-for="(meta, role) in MARKET_ROLE_META"
          :key="role"
          :to="`/join/${role}`"
          class="rounded-ui inline-flex items-center gap-1 border border-white/60 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <BaseIcon :name="meta.icon" :size="16" /> {{ t('discovery.experts.join', { label: meta.label }) }}
        </RouterLink>
      </div>
    </div>

    <!-- طلب خدمة -->
    <BaseModal v-model="requestDialog" :title="selected ? t('discovery.experts.requestModalTitle', { service: MARKET_ROLE_META[selected.role].service }) : ''" :max-width="480">
      <template v-if="selected">
        <div class="mb-3 flex items-center gap-2">
          <BaseAvatar :color="roleColor(selected.role)" :size="36" tonal>{{ selected.initial }}</BaseAvatar>
          <div>
            <div class="text-sm font-bold">{{ selected.name }}</div>
            <div class="text-xs text-muted">{{ selected.specialty }} · {{ t('discovery.experts.priceFrom', { price: selected.priceFrom, unit: selected.priceUnit }) }}</div>
          </div>
        </div>
        <BaseTextarea v-model="reason" :label="t('discovery.experts.describeGoal')" :rows="3" :placeholder="t('discovery.experts.describeGoalPlaceholder')" />
        <p class="mt-2 text-xs text-muted">{{ t('discovery.experts.requestHelp') }}</p>
      </template>
      <template #actions>
        <BaseButton variant="ghost" @click="requestDialog = false">{{ t('common.cancel') }}</BaseButton>
        <BaseButton :variant="selected?.role === 'consultant' ? 'accent' : 'brand'" :disabled="!reason.trim()" @click="sendRequest">
          <BaseIcon name="mdi-send" :size="18" /> {{ t('discovery.experts.sendRequest') }}
        </BaseButton>
      </template>
    </BaseModal>

    <BaseSnackbar v-model="snackbar" color="success" :timeout="3000">{{ t('discovery.experts.requestSent') }}</BaseSnackbar>
  </div>
</template>

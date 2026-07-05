<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import type { AccountTier } from '@/stores/AccountPlanStore'
import { ACCOUNT_TIER_META, TIER_FEATURES, TIER_RANK, useAccountPlanStore } from '@/stores/AccountPlanStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { usePublicProfileStore } from '@/stores/PublicProfileStore'
import { useSurveysStore } from '@/stores/SurveysStore'
import { useWalletStore } from '@/stores/WalletStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'

// ===== باقة الحساب الموحّدة — كل التمكين من مكان واحد =====
// embedded: تُعرض داخل مركز الإعدادات بلا ترويسة مكررة
withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

const plan = useAccountPlanStore()
const wallet = useWalletStore()
const surveys = useSurveysStore()
const pub = usePublicProfileStore()
const notifications = useNotificationsStore()

const TIERS: AccountTier[] = ['free', 'pro', 'elite']

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral', 'surface-variant': 'neutral', grey: 'neutral', amber: 'warning' } as Record<string, BaseColor>)[c] ?? c) as BaseColor
}

function change(tier: AccountTier) {
  const ok = plan.setTier(tier)
  if (!ok) {
    notifications.push({
      icon: 'mdi-wallet-outline',
      color: 'error',
      title: 'رصيد المحفظة لا يكفي',
      body: `ترقية «${ACCOUNT_TIER_META[tier].label}» تتطلب ${ACCOUNT_TIER_META[tier].price} ر.س — اشحن محفظتك ثم أعد المحاولة.`,
      category: 'system',
      actionTo: '/wallet',
      actionLabel: 'شحن المحفظة',
    })
  }
}

const usage = computed(() => [
  {
    label: 'الاستبيانات النشطة',
    icon: 'mdi-poll',
    used: surveys.mySurveys.length,
    limit: plan.surveyLimit,
  },
  {
    label: 'قوة صفحتك التعريفية',
    icon: 'mdi-card-account-details-star-outline',
    used: pub.strength.score,
    limit: 100,
  },
])
</script>

<template>
  <div>
    <PageHeader
      v-if="!embedded"
      title="باقة حسابك"
      subtitle="حساب واحد بكل الأدوار — والباقة وحدها تحدد التمكين والمزايا عبر كل المنصة"
      icon="mdi-crown-outline"
    >
      <template #actions>
        <BaseChip color="brand">
          <BaseIcon name="mdi-wallet-outline" :size="14" />
          رصيدك: {{ wallet.available }} ر.س
        </BaseChip>
      </template>
    </PageHeader>
    <div
      v-if="embedded"
      class="mb-4 flex flex-wrap items-center gap-2 rounded-ui border-s-4 bg-surfalt px-4 py-3"
      :style="{ borderColor: 'rgb(var(--v-theme-secondary))' }"
    >
      <span class="text-sm text-content">حساب واحد بكل الأدوار — والباقة وحدها تحدد التمكين عبر كل المنصة.</span>
      <span class="flex-1" />
      <BaseChip color="brand">
        <BaseIcon name="mdi-wallet-outline" :size="14" />
        رصيدك: {{ wallet.available }} ر.س
      </BaseChip>
    </div>

    <!-- بطاقات الباقات -->
    <div class="mb-2 grid grid-cols-1 gap-4 md:grid-cols-3">
      <BaseCard
        v-for="t in TIERS"
        :key="t"
        class="flex h-full flex-col"
        :class="plan.tier === t ? 'ring-2' : ''"
        :style="plan.tier === t ? { '--tw-ring-color': 'rgb(var(--v-theme-success))' } : {}"
      >
        <div class="mb-1 flex items-center gap-2">
          <BaseAvatar :color="mapColor(ACCOUNT_TIER_META[t].color)" tonal :size="40">
            <BaseIcon :name="ACCOUNT_TIER_META[t].icon" :size="20" />
          </BaseAvatar>
          <div class="flex-1">
            <div class="text-base font-bold text-content">{{ ACCOUNT_TIER_META[t].label }}</div>
            <div class="text-xs text-muted">
              {{ ACCOUNT_TIER_META[t].price ? `${ACCOUNT_TIER_META[t].price} ر.س / شهريًا` : 'مجانية للأبد' }}
            </div>
          </div>
          <BaseChip v-if="plan.tier === t" color="success">باقتك</BaseChip>
        </div>
        <p class="mb-3 text-sm text-muted">{{ ACCOUNT_TIER_META[t].pitch }}</p>

        <div class="mb-3 flex-1">
          <div
            v-for="f in TIER_FEATURES"
            :key="f.label"
            class="flex items-start gap-2 py-1"
            :class="{ 'opacity-45': TIER_RANK[f.tier] > TIER_RANK[t] }"
          >
            <BaseIcon
              :name="TIER_RANK[f.tier] <= TIER_RANK[t] ? 'mdi-check-circle' : 'mdi-lock-outline'"
              :size="16"
              class="mt-0.5"
              :style="{ color: TIER_RANK[f.tier] <= TIER_RANK[t] ? 'rgb(var(--v-theme-success))' : 'rgba(var(--v-theme-on-surface), 0.5)' }"
            />
            <span class="text-xs text-content">{{ f.label }}</span>
          </div>
        </div>

        <BaseButton
          v-if="plan.tier !== t"
          block
          :variant="TIER_RANK[t] > TIER_RANK[plan.tier] ? 'brand' : 'tonal-brand'"
          @click="change(t)"
        >
          <BaseIcon :name="TIER_RANK[t] > TIER_RANK[plan.tier] ? 'mdi-arrow-up-bold-circle-outline' : 'mdi-arrow-down-bold-circle-outline'" :size="18" />
          {{ TIER_RANK[t] > TIER_RANK[plan.tier] ? `ترقية (${ACCOUNT_TIER_META[t].price} ر.س)` : 'انتقال' }}
        </BaseButton>
        <BaseButton v-else block variant="tonal-emerald" disabled>
          <BaseIcon name="mdi-check" :size="18" />
          مفعّلة
        </BaseButton>
      </BaseCard>
    </div>

    <!-- استهلاكك الحالي -->
    <BaseCard>
      <h2 class="mb-3 flex items-center gap-1 text-base font-bold text-content">
        <BaseIcon name="mdi-gauge" :size="20" :style="{ color: 'rgb(var(--v-theme-primary))' }" />
        استهلاكك على باقتك الحالية
      </h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div v-for="u in usage" :key="u.label">
          <div class="mb-1 flex items-center gap-2">
            <BaseIcon :name="u.icon" :size="18" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />
            <span class="flex-1 text-sm text-content">{{ u.label }}</span>
            <span class="text-xs font-bold text-content">{{ u.used }}<template v-if="u.limit != null"> / {{ u.limit }}</template><template v-else> / ∞</template></span>
          </div>
          <BaseProgressBar
            :value="u.limit != null ? Math.min(100, (u.used / u.limit) * 100) : 12"
            :height="8"
            :color="u.limit != null && u.used / u.limit > 0.85 ? 'warning' : 'primary'"
          />
        </div>
      </div>
      <p class="mb-0 mt-3 text-xs text-muted">
        كل الأدوار متاحة فورًا مهما كانت باقتك — الباقة تحدد سعة الأدوات ومزايا الظهور فقط.
      </p>
    </BaseCard>
  </div>
</template>

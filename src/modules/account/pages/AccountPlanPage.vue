<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import type { AccountTier } from '@/stores/AccountPlanStore'
import { ACCOUNT_TIER_META, SURVEY_LIMITS, TIER_FEATURES, TIER_RANK, useAccountPlanStore } from '@/stores/AccountPlanStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { usePublicProfileStore } from '@/stores/PublicProfileStore'
import { useSurveysStore } from '@/stores/SurveysStore'
import { useWalletStore } from '@/stores/WalletStore'

// ===== باقة الحساب الموحّدة — كل التمكين من مكان واحد =====
const plan = useAccountPlanStore()
const wallet = useWalletStore()
const surveys = useSurveysStore()
const pub = usePublicProfileStore()
const notifications = useNotificationsStore()

const TIERS: AccountTier[] = ['free', 'pro', 'elite']

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
      title="باقة حسابك"
      subtitle="حساب واحد بكل الأدوار — والباقة وحدها تحدد التمكين والمزايا عبر كل المنصة"
      icon="mdi-crown-outline"
    >
      <template #actions>
        <VChip color="primary" variant="tonal" label prepend-icon="mdi-wallet-outline">
          رصيدك: {{ wallet.available }} ر.س
        </VChip>
      </template>
    </PageHeader>

    <!-- بطاقات الباقات -->
    <VRow class="mb-2">
      <VCol v-for="t in TIERS" :key="t" cols="12" md="4">
        <VCard
          class="pa-5 h-100 d-flex flex-column tier-card"
          :class="{ 'tier-current': plan.tier === t }"
          :variant="plan.tier === t ? 'elevated' : 'outlined'"
        >
          <div class="d-flex align-center ga-2 mb-1">
            <VAvatar :color="ACCOUNT_TIER_META[t].color" variant="tonal" size="40">
              <VIcon :icon="ACCOUNT_TIER_META[t].icon" size="20" />
            </VAvatar>
            <div class="flex-grow-1">
              <div class="text-subtitle-1 font-weight-bold">{{ ACCOUNT_TIER_META[t].label }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ ACCOUNT_TIER_META[t].price ? `${ACCOUNT_TIER_META[t].price} ر.س / شهريًا` : 'مجانية للأبد' }}
              </div>
            </div>
            <VChip v-if="plan.tier === t" size="small" color="success" label>باقتك</VChip>
          </div>
          <p class="text-body-2 text-medium-emphasis mb-3">{{ ACCOUNT_TIER_META[t].pitch }}</p>

          <div class="flex-grow-1 mb-3">
            <div
              v-for="f in TIER_FEATURES"
              :key="f.label"
              class="d-flex align-start ga-2 py-1"
              :class="{ 'feature-off': TIER_RANK[f.tier] > TIER_RANK[t] }"
            >
              <VIcon
                :icon="TIER_RANK[f.tier] <= TIER_RANK[t] ? 'mdi-check-circle' : 'mdi-lock-outline'"
                :color="TIER_RANK[f.tier] <= TIER_RANK[t] ? 'success' : 'medium-emphasis'"
                size="16"
                class="mt-1"
              />
              <span class="text-caption">{{ f.label }}</span>
            </div>
          </div>

          <VBtn
            v-if="plan.tier !== t"
            :color="ACCOUNT_TIER_META[t].color"
            :variant="TIER_RANK[t] > TIER_RANK[plan.tier] ? 'flat' : 'tonal'"
            block
            :prepend-icon="TIER_RANK[t] > TIER_RANK[plan.tier] ? 'mdi-arrow-up-bold-circle-outline' : 'mdi-arrow-down-bold-circle-outline'"
            @click="change(t)"
          >
            {{ TIER_RANK[t] > TIER_RANK[plan.tier] ? `ترقية (${ACCOUNT_TIER_META[t].price} ر.س)` : 'انتقال' }}
          </VBtn>
          <VBtn v-else variant="tonal" color="success" block disabled prepend-icon="mdi-check">مفعّلة</VBtn>
        </VCard>
      </VCol>
    </VRow>

    <!-- استهلاكك الحالي -->
    <VCard class="pa-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-3"><VIcon icon="mdi-gauge" size="20" color="primary" class="me-1" />استهلاكك على باقتك الحالية</h2>
      <VRow>
        <VCol v-for="u in usage" :key="u.label" cols="12" sm="6">
          <div class="d-flex align-center ga-2 mb-1">
            <VIcon :icon="u.icon" size="18" color="secondary" />
            <span class="text-body-2 flex-grow-1">{{ u.label }}</span>
            <span class="text-caption font-weight-bold">{{ u.used }}<template v-if="u.limit != null"> / {{ u.limit }}</template><template v-else> / ∞</template></span>
          </div>
          <VProgressLinear
            :model-value="u.limit != null ? Math.min(100, (u.used / u.limit) * 100) : 12"
            :color="u.limit != null && u.used / u.limit > 0.85 ? 'warning' : 'primary'"
            height="8"
            rounded
          />
        </VCol>
      </VRow>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        كل الأدوار متاحة فورًا مهما كانت باقتك — الباقة تحدد سعة الأدوات ومزايا الظهور فقط.
      </p>
    </VCard>
  </div>
</template>

<style scoped>
.tier-card {
  border: 1px solid rgba(140, 163, 150, 0.25);
}
.tier-current {
  border: 2px solid rgb(var(--v-theme-success));
}
.feature-off {
  opacity: 0.45;
}
</style>

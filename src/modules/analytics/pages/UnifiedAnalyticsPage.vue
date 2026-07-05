<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import type { UserRole } from '@/interfaces/Auth'
import { useAuthStore } from '@/stores/AuthStore'
import { useExpertRolesStore } from '@/stores/ExpertRolesStore'
import { useGamificationStore } from '@/stores/GamificationStore'
import { useInterviewersStore } from '@/stores/InterviewersStore'
import { usePostedOpportunitiesStore } from '@/stores/PostedOpportunitiesStore'
import { usePublicProfileStore } from '@/stores/PublicProfileStore'
import { useSurveysStore } from '@/stores/SurveysStore'
import { useTrustStore } from '@/stores/TrustStore'
import { useUnifiedHubStore } from '@/stores/UnifiedHubStore'
import { useWalletStore } from '@/stores/WalletStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'

// ===== التحليلات الموحّدة — كل مؤشراتك عبر الأدوار في جدول واحد قابل للفلترة والفرز =====
const { t } = useI18n()
const auth = useAuthStore()
const hub = useUnifiedHubStore()
const wallet = useWalletStore()
const gamification = useGamificationStore()
const pub = usePublicProfileStore()
const surveys = useSurveysStore()
const trust = useTrustStore()
const interviewersStore = useInterviewersStore()
const expertStore = useExpertRolesStore()
const postedStore = usePostedOpportunitiesStore()

type Domain = 'مالية' | 'تفاعل' | 'أداء' | 'استبيانات' | 'سمعة'
interface MetricRow {
  domain: Domain
  role: UserRole | 'all'
  label: string
  value: number
  unit: string
  icon: string
  color: string
}

const DOMAIN_META: Record<Domain, { icon: string, color: string }> = {
  'مالية': { icon: 'mdi-cash-multiple', color: 'success' },
  'تفاعل': { icon: 'mdi-account-heart-outline', color: 'accent' },
  'أداء': { icon: 'mdi-chart-line', color: 'primary' },
  'استبيانات': { icon: 'mdi-poll', color: 'secondary' },
  'سمعة': { icon: 'mdi-shield-star-outline', color: 'warning' },
}

/** كل الصفوف تُشتق حيًّا من المخازن — الحساب أولًا ثم صفوف كل دور يملكه المستخدم */
const allRows = computed<MetricRow[]>(() => {
  const rows: MetricRow[] = [
    { domain: 'مالية', role: 'all', label: 'رصيد المحفظة المتاح', value: wallet.available, unit: '﷼', icon: 'mdi-wallet-outline', color: 'success' },
    { domain: 'مالية', role: 'all', label: 'أرباح معلقة قيد التسوية', value: wallet.pending, unit: '﷼', icon: 'mdi-cash-clock', color: 'warning' },
    { domain: 'مالية', role: 'all', label: 'أرباحي عبر الأدوار', value: hub.kpis.earnings, unit: '﷼', icon: 'mdi-cash-multiple', color: 'success' },
    { domain: 'مالية', role: 'all', label: 'قيمة معلقة بانتظار قراراتي', value: hub.kpis.pendingMoney, unit: '﷼', icon: 'mdi-gesture-tap-button', color: 'error' },
    { domain: 'سمعة', role: 'all', label: 'نقاط التحفيز', value: gamification.points, unit: 'نقطة', icon: 'mdi-star-circle-outline', color: 'warning' },
    { domain: 'تفاعل', role: 'all', label: 'مشاهدات صفحتي التعريفية', value: pub.state.views, unit: '', icon: 'mdi-eye-outline', color: 'primary' },
    { domain: 'تفاعل', role: 'all', label: 'متابعو صفحتي', value: pub.state.followersCount, unit: '', icon: 'mdi-account-group-outline', color: 'accent' },
    { domain: 'تفاعل', role: 'all', label: 'رسائل التواصل من صفحتي', value: pub.state.contacts, unit: '', icon: 'mdi-message-arrow-left-outline', color: 'info' },
    { domain: 'أداء', role: 'all', label: 'عناصر تنتظر قراري في المركز', value: hub.kpis.actionCount, unit: '', icon: 'mdi-inbox-full-outline', color: 'error' },
  ]

  // استبياناتي (لأي دور يملك استبيانات)
  const myResponses = surveys.mySurveys.reduce((sum, s) => sum + surveys.statsFor(s.id).responses, 0)
  const rewardsSpent = surveys.mySurveys.reduce((sum, s) => sum + s.rewardsSpent, 0)
  rows.push(
    { domain: 'استبيانات', role: 'all', label: 'استبياناتي المنشأة', value: surveys.mySurveys.length, unit: '', icon: 'mdi-poll', color: 'secondary' },
    { domain: 'استبيانات', role: 'all', label: 'استجابات على استبياناتي', value: myResponses, unit: '', icon: 'mdi-comment-check-outline', color: 'secondary' },
    { domain: 'استبيانات', role: 'all', label: 'نقاط صُرفت من مجمعات الحوافز', value: rewardsSpent, unit: 'نقطة', icon: 'mdi-gift-outline', color: 'warning' },
  )

  if (auth.ownsRole('seeker'))
    rows.push({ domain: 'سمعة', role: 'seeker', label: 'نسبة الثقة (كباحث)', value: trust.score, unit: '%', icon: 'mdi-shield-check-outline', color: 'primary' })
  if (auth.ownsRole('interviewer')) {
    const s = interviewersStore.interviewerStats
    rows.push(
      { domain: 'أداء', role: 'interviewer', label: 'جلسات تقييم منفّذة', value: s.sessions, unit: '', icon: 'mdi-account-tie-voice-outline', color: 'primary' },
      { domain: 'مالية', role: 'interviewer', label: 'أرباح المقيّم', value: s.earnings, unit: '﷼', icon: 'mdi-cash-plus', color: 'success' },
      { domain: 'سمعة', role: 'interviewer', label: 'متوسط تقييمي كمقيّم (من 5)', value: s.avgRating, unit: '★', icon: 'mdi-star-outline', color: 'warning' },
    )
  }
  if (auth.ownsRole('company')) {
    rows.push({ domain: 'أداء', role: 'company', label: 'فرص منشورة', value: postedStore.publishedCount, unit: '', icon: 'mdi-briefcase-plus-outline', color: 'info' })
  }
  if (auth.ownsRole('coach')) {
    const s = expertStore.coachStats
    rows.push(
      { domain: 'مالية', role: 'coach', label: 'اشتراكات الإرشاد الشهرية', value: s.monthlyRecurring, unit: '﷼', icon: 'mdi-compass-outline', color: 'success' },
      { domain: 'أداء', role: 'coach', label: 'عملاء الإرشاد', value: s.clients, unit: '', icon: 'mdi-account-multiple-outline', color: 'primary' },
    )
  }
  if (auth.ownsRole('trainer')) {
    const s = expertStore.trainerStats
    rows.push(
      { domain: 'مالية', role: 'trainer', label: 'إيراد التدريب', value: s.revenue, unit: '﷼', icon: 'mdi-school-outline', color: 'success' },
      { domain: 'أداء', role: 'trainer', label: 'متدربون مسجّلون', value: s.trainees, unit: '', icon: 'mdi-account-school-outline', color: 'primary' },
    )
  }
  if (auth.ownsRole('consultant')) {
    const s = expertStore.consultantStats
    rows.push({ domain: 'أداء', role: 'consultant', label: 'استشارات منجزة', value: s.done, unit: '', icon: 'mdi-lightbulb-on-outline', color: 'primary' })
  }
  return rows
})

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c?: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral', 'surface-variant': 'neutral', grey: 'neutral', orange: 'warning', amber: 'warning' } as Record<string, BaseColor>)[c ?? ''] ?? c ?? 'brand') as BaseColor
}
function toggleStyle(active: boolean, color = 'primary') {
  if (active)
    return { background: `rgb(var(--v-theme-${color}))`, color: `rgb(var(--v-theme-on-${color}))`, borderColor: 'transparent' }
  return { background: 'transparent', color: 'rgba(var(--v-theme-on-surface), 0.75)', borderColor: 'rgba(var(--v-theme-on-surface), 0.2)' }
}

// —— الفلترة والفرز ——
const roleFilter = ref<(UserRole | 'all')[]>([])
const domainFilter = ref<Domain[]>([])
const sortBy = ref<'value-desc' | 'value-asc' | 'domain'>('value-desc')
const query = ref('')
const SORT_ITEMS = [
  { value: 'value-desc' as const, title: 'القيمة: من الأعلى' },
  { value: 'value-asc' as const, title: 'القيمة: من الأدنى' },
  { value: 'domain' as const, title: 'حسب المجال' },
]
function toggleDomain(d: Domain) {
  domainFilter.value = domainFilter.value.includes(d) ? domainFilter.value.filter(x => x !== d) : [...domainFilter.value, d]
}
function toggleRole(r: UserRole | 'all') {
  roleFilter.value = roleFilter.value.includes(r) ? roleFilter.value.filter(x => x !== r) : [...roleFilter.value, r]
}

const roleOptions = computed(() => {
  const owned = [...new Set(allRows.value.map(r => r.role))]
  return owned.map(r => ({ value: r, title: r === 'all' ? 'الحساب (مشترك)' : t(`roles.${r}`) }))
})

const visibleRows = computed(() => {
  let rows = allRows.value
    .filter(r => !roleFilter.value.length || roleFilter.value.includes(r.role))
    .filter(r => !domainFilter.value.length || domainFilter.value.includes(r.domain))
    .filter(r => !query.value.trim() || r.label.includes(query.value.trim()))
  if (sortBy.value === 'value-desc')
    rows = [...rows].sort((a, b) => b.value - a.value)
  else if (sortBy.value === 'value-asc')
    rows = [...rows].sort((a, b) => a.value - b.value)
  else
    rows = [...rows].sort((a, b) => a.domain.localeCompare(b.domain, 'ar'))
  return rows
})

const domainSummary = computed(() =>
  (Object.keys(DOMAIN_META) as Domain[]).map(d => ({
    domain: d,
    ...DOMAIN_META[d],
    count: allRows.value.filter(r => r.domain === d).length,
  })),
)
</script>

<template>
  <div>
    <PageHeader
      title="التحليلات الموحّدة"
      subtitle="كل مؤشراتك — المال والتفاعل والأداء والسمعة — عبر كل أدوارك في شاشة واحدة"
      icon="mdi-chart-multiple"
    >
      <template #actions>
        <BaseButton v-if="auth.ownsRole('interviewer')" variant="ghost" size="sm" :to="{ name: 'interviewer-analytics' }"><BaseIcon name="mdi-chart-box-outline" :size="16" />تحليلات المقيّم التفصيلية</BaseButton>
        <BaseButton v-if="auth.ownsRole('company')" variant="ghost" size="sm" :to="{ name: 'analytics' }"><BaseIcon name="mdi-chart-box-outline" :size="16" />تحليلات الشركة التفصيلية</BaseButton>
      </template>
    </PageHeader>

    <!-- فلاتر المجالات -->
    <div class="mb-4 flex flex-wrap gap-2">
      <button
        v-for="d in domainSummary"
        :key="d.domain"
        type="button"
        class="inline-flex items-center gap-1 rounded-ui border px-2.5 py-1 text-sm font-medium transition"
        :style="toggleStyle(domainFilter.includes(d.domain), d.color)"
        @click="toggleDomain(d.domain)"
      >
        <BaseIcon :name="d.icon" :size="14" />{{ d.domain }} ({{ d.count }})
      </button>
    </div>

    <!-- شريط التحكم -->
    <div class="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
      <BaseInput v-model="query" placeholder="بحث في المؤشرات..." prefix-icon="mdi-magnify" class="sm:col-span-4" />
      <div class="sm:col-span-5">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-medium text-muted">الأدوار:</span>
          <button
            v-for="o in roleOptions"
            :key="String(o.value)"
            type="button"
            class="rounded-full border px-2.5 py-1 text-xs font-medium transition"
            :style="toggleStyle(roleFilter.includes(o.value))"
            @click="toggleRole(o.value)"
          >{{ o.title }}</button>
        </div>
      </div>
      <div class="sm:col-span-3">
        <label class="mb-1 block text-xs font-medium text-muted">فرز</label>
        <BaseSelect :model-value="sortBy" :items="SORT_ITEMS" @update:model-value="v => v && (sortBy = v)" />
      </div>
    </div>

    <!-- شبكة المؤشرات -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BaseCard v-for="r in visibleRows" :key="`${r.role}-${r.label}`" class="flex items-center gap-3">
        <BaseAvatar :color="mapColor(r.color)" tonal square :size="44">
          <BaseIcon :name="r.icon" :size="22" />
        </BaseAvatar>
        <div class="min-w-0 flex-1">
          <div class="text-lg font-bold text-content">{{ r.value }}<span v-if="r.unit" class="text-sm text-muted"> {{ r.unit }}</span></div>
          <div class="truncate text-xs text-muted">{{ r.label }}</div>
        </div>
        <div class="flex flex-col items-end gap-1">
          <BaseChip :color="mapColor(DOMAIN_META[r.domain].color)">{{ r.domain }}</BaseChip>
          <span class="rounded-full border border-ui px-2 py-0.5 text-[10px] text-muted">{{ r.role === 'all' ? 'الحساب' : t(`roles.${r.role}`) }}</span>
        </div>
      </BaseCard>
    </div>

    <BaseCard v-if="!visibleRows.length" class="py-10 text-center">
      <BaseIcon name="mdi-chart-line-variant" :size="48" :style="{ color: 'rgba(var(--v-theme-on-surface), 0.5)' }" />
      <p class="mb-0 mt-2 text-sm text-muted">لا مؤشرات مطابقة — وسّع الفلاتر.</p>
    </BaseCard>
  </div>
</template>

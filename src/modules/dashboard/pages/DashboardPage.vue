<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/AuthStore'
import { useApplicationsStore } from '@/stores/ApplicationsStore'
import { useSavedStore } from '@/stores/SavedStore'
import { useWishesStore } from '@/stores/WishesStore'
import { useCandidatesStore } from '@/stores/CandidatesStore'
import { usePostedOpportunitiesStore } from '@/stores/PostedOpportunitiesStore'
import { useTrustStore } from '@/stores/TrustStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { useInterviewersStore } from '@/stores/InterviewersStore'
import StatCard from '@/components/shared/StatCard.vue'
import GamificationCard from '@/components/shared/GamificationCard.vue'
import OpportunityCard from '@/modules/opportunities/components/OpportunityCard.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseProgressRing from '@/components/ui/BaseProgressRing.vue'
import { mockOpportunities } from '@/modules/opportunities/services/mockOpportunities'
import { LEVEL_META } from '@/stores/InterviewsStore'
import { ai } from '@/services/ai'
import { matchScore } from '@/services/matching'
import { opportunityMatchProfile, seekerMatchProfile } from '@/services/matchProfile'
import { sectorForField } from '@/services/sectors'
import { useSectorContext } from '@/composables/useSectorContext'

// تحويل رمز لون Vuetify إلى نغمة BaseChip
type ChipColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function chipColor(c: string): ChipColor {
  return (({ primary: 'brand', secondary: 'emerald', amber: 'warning' } as Record<string, ChipColor>)[c] ?? c) as ChipColor
}

const { t } = useI18n()
const authStore = useAuthStore()
const applicationsStore = useApplicationsStore()
const savedStore = useSavedStore()
const wishesStore = useWishesStore()
const candidatesStore = useCandidatesStore()
const postedStore = usePostedOpportunitiesStore()
const trustStore = useTrustStore()
const profileStore = useProfileStore()
const sector = useSectorContext()

const userName = computed(() => authStore.authUser?.name ?? '')
const isCompany = computed(() => authStore.role === 'company')

// «موصى به لك»: تطابق حيّ (قطاع من سياق المستخدم عبر matchInput) بدل matchRate الثابت،
// وترجيح boost كاسر تعادل يرفع قطاعات المستخدم — متّسق مع فرز الأسواق.
const seekerProfile = computed(() => seekerMatchProfile({
  skills: profileStore.skills.map(s => s.name),
  city: profileStore.prefs.location,
  opportunityType: profileStore.prefs.preferred_employment_types[0],
  ...sector.matchInput(),
}))
function recoMatch(o: typeof mockOpportunities[number]): number {
  return matchScore(seekerProfile.value, opportunityMatchProfile(o)).score
}
const recommended = computed(() => [...mockOpportunities].sort((a, b) => {
  const d = recoMatch(b) - recoMatch(a)
  if (d !== 0)
    return d
  const boostDiff = sector.boost(sectorForField(b.department)?.id) - sector.boost(sectorForField(a.department)?.id)
  // كاسر تعادل أخير: ترتيب matchRate المنسّق (يحفظ سلوك التوصية لملف فارغ بلا سياق)
  return boostDiff !== 0 ? boostDiff : b.matchRate - a.matchRate
}).slice(0, 5))
const topCandidates = computed(() => [...candidatesStore.candidates].sort((a, b) => b.matchRate - a.matchRate).slice(0, 5))

// — Seeker AI widgets —
const trustDelta = 5 // simulated weekly change
const pendingProofs = computed(() => profileStore.pendingProofRequests)
const recommendedInterview = computed(() => ai.recommendInterview(profileStore.unverifiedSkills))
const proactiveNudges = computed(() =>
  ai.proactiveNudges({
    trust: trustStore.score,
    trustDelta,
    pendingProofs: pendingProofs.value.length,
    unverifiedSkills: profileStore.unverifiedSkills,
  }),
)

const seekerStats = computed(() => [
  { title: 'طلباتي النشطة', value: applicationsStore.count, icon: 'mdi-file-send-outline', color: 'primary' },
  { title: t('dashboard.incomingWishes'), value: wishesStore.pendingCount, icon: 'mdi-hand-heart-outline', color: 'accent' },
  { title: 'الفرص المحفوظة', value: savedStore.count, icon: 'mdi-bookmark-outline', color: 'secondary' },
  { title: t('dashboard.completedAssessments'), value: 4, icon: 'mdi-clipboard-check-outline', color: 'success' },
])

const companyStats = computed(() => [
  { title: 'الفرص المنشورة', value: postedStore.publishedCount, icon: 'mdi-briefcase-outline', color: 'primary' },
  { title: 'ترشيحات جديدة', value: candidatesStore.newCount, icon: 'mdi-account-group-outline', color: 'accent' },
  { title: 'مقابلات مجدولة', value: candidatesStore.interviewCount, icon: 'mdi-calendar-clock-outline', color: 'success' },
  { title: 'متوسط وقت التوظيف', value: avgTimeToHire.value, icon: 'mdi-timer-sand', color: 'secondary' },
])

const stats = computed(() => (isCompany.value ? companyStats.value : seekerStats.value))

// — Company AI widgets (doc §3.3-ج) —
// Deterministic mock: hiring speed improves as candidates progress to interviews
const avgTimeToHire = computed(() => `${18 - Math.min(candidatesStore.interviewCount * 2, 8)} يومًا`)

const companyNudges = computed(() => {
  if (!isCompany.value)
    return []
  const list: { tone: 'info' | 'success' | 'warning', icon: string, text: string, action?: string, actionLabel?: string }[] = []
  if (candidatesStore.newCount > 0)
    list.push({ tone: 'info', icon: 'mdi-account-plus-outline', text: `لديك ${candidatesStore.newCount} ترشيحات جديدة بانتظار المراجعة`, action: 'candidates', actionLabel: 'راجعها الآن' })
  if (candidatesStore.interviewCount > 0)
    list.push({ tone: 'success', icon: 'mdi-calendar-clock-outline', text: `${candidatesStore.interviewCount} مرشحون وصلوا مرحلة المقابلة — تابع جدولتها`, action: 'candidates', actionLabel: 'عرض' })
  if (postedStore.publishedCount === 0)
    list.push({ tone: 'warning', icon: 'mdi-briefcase-plus-outline', text: 'لا فرص منشورة حاليًا — انشر فرصة لتصلك ترشيحات', action: 'create-opportunity', actionLabel: 'انشر فرصة' })
  return list
})

// 30-day applications trend (4 weekly buckets, deterministic from the pool)
const weeklyApplications = computed(() => {
  const total = candidatesStore.candidates.length
  const weeks = [
    { label: 'أسبوع 1', value: Math.max(1, Math.round(total * 0.6)) },
    { label: 'أسبوع 2', value: Math.max(1, Math.round(total * 0.85)) },
    { label: 'أسبوع 3', value: Math.max(1, Math.round(total * 0.7)) },
    { label: 'أسبوع 4', value: total },
  ]
  const max = Math.max(...weeks.map(w => w.value))
  return weeks.map(w => ({ ...w, pct: Math.round((w.value / max) * 100) }))
})

// — Smart cross-role agenda (doc §5.3): one schedule across my roles —
const interviewersStore = useInterviewersStore()
const crossRoleAgenda = computed(() => {
  if (!authStore.hasRole('interviewer'))
    return []
  const asCandidate = interviewersStore.bookings
    .filter(b => b.status === 'scheduled')
    .map(b => ({ key: `b${b.id}`, title: `مقابلة مع ${b.interviewerName}`, datetime: b.datetime, roleLabel: 'كباحث', color: 'primary' }))
  const asInterviewer = interviewersStore.agendaUpcoming
    .map(a => ({ key: `a${a.id}`, title: `تقييم ${a.candidateName}`, datetime: a.datetime, roleLabel: 'كمقيّم', color: 'amber' }))
  return [...asCandidate, ...asInterviewer].slice(0, 4)
})

// Most common skills among applicants
const topSkills = computed(() => {
  const freq = new Map<string, number>()
  for (const c of candidatesStore.candidates) {
    for (const s of c.skills ?? [])
      freq.set(s, (freq.get(s) ?? 0) + 1)
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
})

const wishes = computed(() => wishesStore.wishes.slice(0, 3))
const wishStatusMeta: Record<string, { label: string, color: string }> = {
  new: { label: 'جديد', color: 'accent' },
  pending: { label: 'قيد الانتظار', color: 'warning' },
  accepted: { label: 'مقبول', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
}

const activities = [
  { icon: 'mdi-send-check-outline', text: 'تقدمت لفرصة "مطوّر واجهات أمامية"', time: 'قبل ساعة' },
  { icon: 'mdi-file-account-outline', text: 'أنشأت سيرة ذاتية جديدة (قالب حديث)', time: 'أمس' },
  { icon: 'mdi-clipboard-check-outline', text: 'أكملت اختبار "أساسيات JavaScript"', time: 'قبل 3 أيام' },
  { icon: 'mdi-account-star-outline', text: 'استلمت توصية من أحمد المنصور', time: 'قبل 4 أيام' },
]

const aiSuggestions = [
  'حلّل فرصي الحالية',
  'كيف أحسّن ملفي؟',
  'أنشئ لي سيرة ذاتية',
  'ما المهارات المطلوبة في مجالي؟',
]
</script>

<template>
  <div>
    <!-- AI greeting banner -->
    <div class="brand-gradient rounded-ui-lg mb-6 p-5">
      <div class="flex items-center gap-4">
        <div class="flex h-14 w-14 items-center justify-center rounded-ui" style="background: rgba(255, 255, 255, 0.15)">
          <BaseIcon name="mdi-robot-happy-outline" :size="30" class="text-white" />
        </div>
        <div class="text-white">
          <div class="text-xl font-bold">
            {{ t('dashboard.welcome', { name: userName }) }}
          </div>
          <div class="text-sm opacity-90">
            {{ t('dashboard.aiGreeting', { opportunities: 3, wishes: 6, endorsements: 2 }) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Proactive AI nudges (seeker + company) -->
    <div v-if="(isCompany ? companyNudges : proactiveNudges).length" class="mb-4 flex flex-col gap-2">
      <div
        v-for="(n, i) in (isCompany ? companyNudges : proactiveNudges)"
        :key="i"
        class="rounded-ui border-s-4 p-3"
        :style="{ borderColor: `rgb(var(--v-theme-${n.tone}))`, background: `rgba(var(--v-theme-${n.tone}), 0.1)` }"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <BaseIcon :name="n.icon" :size="20" :style="{ color: `rgb(var(--v-theme-${n.tone}))` }" />
            <span class="text-sm">{{ n.text }}</span>
          </div>
          <RouterLink
            v-if="n.action"
            :to="{ name: n.action }"
            class="rounded-ui inline-flex h-8 items-center px-3 text-sm font-semibold text-on-accent"
            :style="{ background: `rgb(var(--v-theme-${n.tone === 'warning' ? 'warning' : 'accent'}))` }"
          >
            {{ n.actionLabel }}
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="mb-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard v-for="stat in stats" :key="stat.title" v-bind="stat" />
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Main column -->
      <div class="lg:col-span-2">
        <div class="mb-3 mt-2 flex items-center justify-between">
          <h2 class="text-xl font-bold">
            {{ isCompany ? 'أحدث الترشيحات' : t('dashboard.recommendedOpportunities') }}
          </h2>
          <RouterLink
            :to="{ name: isCompany ? 'candidates' : 'opportunities' }"
            class="rounded-ui px-2 py-1 text-sm font-medium transition hover:bg-surfalt"
            style="color: rgb(var(--v-theme-secondary))"
          >
            {{ t('dashboard.viewAll') }}
          </RouterLink>
        </div>

        <!-- Company: latest candidates -->
        <BaseCard v-if="isCompany" :padded="false">
          <button
            v-for="(c, i) in topCandidates"
            :key="c.id"
            class="flex w-full items-center gap-3 p-4 text-start transition hover:bg-surfalt"
            :class="i < topCandidates.length - 1 ? 'border-b border-ui' : ''"
            @click="$router.push({ name: 'candidate-profile', params: { id: c.id } })"
          >
            <BaseAvatar color="emerald" :size="40">{{ c.name.charAt(0) }}</BaseAvatar>
            <div class="flex-1">
              <div class="font-bold">{{ c.name }}</div>
              <div class="text-sm text-muted">{{ c.title }} · تطابق {{ c.matchRate }}%</div>
            </div>
            <BaseChip color="success">{{ c.matchRate }}%</BaseChip>
          </button>
        </BaseCard>

        <!-- Seeker: recommended opportunities -->
        <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <OpportunityCard v-for="opp in recommended" :key="opp.id" :opportunity="opp" />
        </div>

        <!-- Incoming wishes -->
        <h2 class="mb-3 mt-5 text-xl font-bold">
          {{ isCompany ? 'الرغبات المرسلة' : t('dashboard.latestWishes') }}
        </h2>
        <BaseCard :padded="false">
          <div
            v-for="(wish, i) in wishes"
            :key="i"
            class="flex items-center gap-3 p-4"
            :class="i < wishes.length - 1 ? 'border-b border-ui' : ''"
          >
            <BaseAvatar color="emerald" :size="40" tonal square>
              <BaseIcon name="mdi-hand-heart-outline" :size="22" />
            </BaseAvatar>
            <div class="flex-1">
              <div class="font-bold">{{ wish.company }}</div>
              <div class="text-sm text-muted">{{ wish.amount }} · {{ wish.duration }}</div>
            </div>
            <BaseChip :color="chipColor(wishStatusMeta[wish.status].color)">
              {{ wishStatusMeta[wish.status].label }}
            </BaseChip>
          </div>
        </BaseCard>
      </div>

      <!-- Side column -->
      <div>
        <!-- Trust summary (seeker) -->
        <BaseCard v-if="!isCompany" class="mt-2 mb-4">
          <div class="flex items-center gap-4">
            <BaseProgressRing :value="trustStore.score" :size="72" :width="8" :color="trustStore.level.color">
              <span class="text-lg font-bold">{{ trustStore.score }}</span>
            </BaseProgressRing>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold">نسبة الثقة</span>
                <BaseChip :color="chipColor(trustStore.level.color)">{{ trustStore.level.label }}</BaseChip>
              </div>
              <div class="flex items-center gap-1 text-xs" style="color: rgb(var(--v-theme-success))">
                <BaseIcon name="mdi-trending-up" :size="16" /> ارتفعت {{ trustDelta }}% هذا الأسبوع
              </div>
              <RouterLink :to="{ name: 'profile' }" class="mt-1 inline-block text-xs font-semibold" style="color: rgb(var(--v-theme-primary))">
                عرض التفاصيل
              </RouterLink>
            </div>
          </div>
        </BaseCard>

        <!-- Quick analytics (company, doc §3.3-ج) -->
        <BaseCard v-if="isCompany" class="mt-2 mb-4">
          <div class="mb-3 flex items-center gap-2">
            <BaseIcon name="mdi-chart-bar" :size="22" style="color: rgb(var(--v-theme-secondary))" />
            <span class="font-bold">تحليلات سريعة — آخر 30 يومًا</span>
          </div>
          <div class="mb-1 flex items-end gap-2" style="height: 88px">
            <div v-for="w in weeklyApplications" :key="w.label" class="flex h-full flex-1 flex-col justify-end text-center">
              <div class="text-xs font-bold">{{ w.value }}</div>
              <div class="bar-lime mx-auto rounded-t" :style="{ height: `${w.pct * 0.6}%`, width: '70%' }" />
            </div>
          </div>
          <div class="flex gap-2">
            <div v-for="w in weeklyApplications" :key="w.label" class="flex-1 text-center text-xs text-muted">
              {{ w.label }}
            </div>
          </div>
          <div class="my-3 border-t border-ui" />
          <div class="mb-2 text-sm font-bold">أكثر المهارات شيوعًا بين المتقدمين</div>
          <div class="mb-2 flex flex-wrap gap-1">
            <BaseChip v-for="[skill, count] in topSkills" :key="skill" color="brand">
              {{ skill }} · {{ count }}
            </BaseChip>
          </div>
          <RouterLink :to="{ name: 'analytics' }" class="text-sm font-medium" style="color: rgb(var(--v-theme-secondary))">
            التحليلات الكاملة
          </RouterLink>
        </BaseCard>

        <!-- Smart cross-role agenda (multi-role users) -->
        <BaseCard v-if="crossRoleAgenda.length" class="mt-2 mb-4">
          <div class="mb-2 flex items-center gap-2">
            <BaseIcon name="mdi-calendar-multiple" :size="22" style="color: rgb(var(--v-theme-secondary))" />
            <span class="font-bold">أجندتك عبر الأدوار</span>
          </div>
          <div v-for="item in crossRoleAgenda" :key="item.key" class="flex items-center gap-2 py-2">
            <BaseChip :color="chipColor(item.color)" class="shrink-0">{{ item.roleLabel }}</BaseChip>
            <div class="flex-1">
              <div class="text-sm font-bold">{{ item.title }}</div>
              <div class="text-xs text-muted">{{ item.datetime }}</div>
            </div>
          </div>
        </BaseCard>

        <!-- Gamification (all roles — points/level/streak/leaderboard are universal) -->
        <div class="mb-4">
          <GamificationCard />
        </div>

        <!-- Recommended interview (seeker) -->
        <BaseCard
          v-if="!isCompany && recommendedInterview"
          class="mb-4"
          :style="{ background: 'rgba(var(--v-theme-accent), 0.12)', borderColor: 'rgba(var(--v-theme-accent), 0.3)' }"
        >
          <div class="mb-2 flex items-center gap-2">
            <BaseIcon name="mdi-account-tie-voice-outline" :size="22" style="color: rgb(var(--v-theme-accent))" />
            <span class="text-sm font-bold">مقابلة موصى بها</span>
            <BaseChip color="success" class="ms-auto">+{{ recommendedInterview.trustGain }}% ثقة</BaseChip>
          </div>
          <p class="mb-3 text-sm">{{ recommendedInterview.reason }}</p>
          <BaseButton variant="accent" size="sm" block :to="{ name: 'interviews' }">
            <BaseIcon name="mdi-play" :size="18" /> ابدأ مقابلة {{ LEVEL_META[recommendedInterview.level].label }}
          </BaseButton>
        </BaseCard>

        <!-- Pending proof requests (seeker) -->
        <BaseCard v-if="!isCompany && pendingProofs.length" class="mb-4">
          <div class="mb-3 flex items-center gap-2">
            <BaseIcon name="mdi-account-star-outline" :size="22" style="color: rgb(var(--v-theme-secondary))" />
            <span class="font-bold">إثباتات معلّقة ({{ pendingProofs.length }})</span>
          </div>
          <div v-for="req in pendingProofs" :key="req.id" class="mb-2 flex items-center gap-2">
            <BaseAvatar color="emerald" :size="36" tonal>
              <BaseIcon name="mdi-account" :size="20" />
            </BaseAvatar>
            <div class="flex-1">
              <div class="text-sm font-bold">{{ req.from }}</div>
              <div class="text-xs text-muted">يطلب إثبات «{{ req.skill }}» · {{ req.date }}</div>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full"
              style="background: rgba(var(--v-theme-success), 0.16); color: rgb(var(--v-theme-success))"
              aria-label="قبول"
              @click="profileStore.resolveProofRequest(req.id, true)"
            >
              <BaseIcon name="mdi-check" :size="18" />
            </button>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surfalt"
              style="color: rgb(var(--v-theme-error))"
              aria-label="رفض"
              @click="profileStore.resolveProofRequest(req.id, false)"
            >
              <BaseIcon name="mdi-close" :size="18" />
            </button>
          </div>
        </BaseCard>

        <!-- AI assistant mini -->
        <BaseCard class="mt-2 mb-4">
          <div class="mb-3 flex items-center gap-2">
            <BaseIcon name="mdi-robot-happy-outline" :size="22" style="color: rgb(var(--v-theme-secondary))" />
            <span class="font-bold">{{ t('nav.assistant') }}</span>
          </div>
          <div class="flex flex-col gap-2">
            <BaseButton
              v-for="(s, i) in aiSuggestions"
              :key="i"
              variant="tonal-brand"
              size="sm"
              align="start"
              block
              :to="{ name: 'assistant' }"
            >
              <BaseIcon name="mdi-message-text-outline" :size="18" /> {{ s }}
            </BaseButton>
          </div>
        </BaseCard>

        <!-- Recent activity -->
        <BaseCard>
          <div class="mb-3 font-bold">
            {{ t('dashboard.recentActivity') }}
          </div>
          <div class="flex flex-col gap-3">
            <div v-for="(act, i) in activities" :key="i" class="flex items-start gap-3">
              <div
                class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style="background: rgba(var(--v-theme-primary), 0.14); color: rgb(var(--v-theme-primary))"
              >
                <BaseIcon :name="act.icon" :size="16" />
              </div>
              <div>
                <div class="text-sm">{{ act.text }}</div>
                <div class="text-xs text-muted">{{ act.time }}</div>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>

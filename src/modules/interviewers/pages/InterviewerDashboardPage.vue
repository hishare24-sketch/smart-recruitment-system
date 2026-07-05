<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import ReviewsPanel from '@/components/shared/ReviewsPanel.vue'
import StatCard from '@/components/shared/StatCard.vue'
import { COMMISSION_NOTE, KIND_META, useInterviewersStore } from '@/stores/InterviewersStore'
import type { AgendaItem, MarketInterviewKind } from '@/stores/InterviewersStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { ai } from '@/services/ai'
import type { EvalElementSuggestion } from '@/services/ai'
import { MY_INTERVIEWER_ID, useInterviewerBrandStore } from '@/stores/InterviewerBrandStore'
import { useReviewsStore } from '@/stores/ReviewsStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseSlider from '@/components/ui/BaseSlider.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseRating from '@/components/ui/BaseRating.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'

const router = useRouter()
const store = useInterviewersStore()
const notifications = useNotificationsStore()

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c?: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral', 'surface-variant': 'neutral', grey: 'neutral', amber: 'warning' } as Record<string, BaseColor>)[c ?? ''] ?? c ?? 'brand') as BaseColor
}
function colorVar(c: string) {
  return `rgb(var(--v-theme-${c === 'amber' ? 'warning' : c}))`
}

// ===== لوحة التسويق الشخصي (شريك نجاح) =====
const brand = useInterviewerBrandStore()
const reviewsStore = useReviewsStore()
const linkCopied = ref(false)
const refCopied = ref(false)
function copyPublicLink() {
  navigator.clipboard?.writeText(`${window.location.origin}${import.meta.env.BASE_URL}${brand.publicPath}`)
  brand.recordShare()
  linkCopied.value = true
  setTimeout(() => (linkCopied.value = false), 1800)
}
function copyReferral() {
  navigator.clipboard?.writeText(brand.referralLink)
  refCopied.value = true
  setTimeout(() => (refCopied.value = false), 1800)
}

// مستشار النمو الذكي — يحلل تعليقات مرشحيّ الحقيقية ويقارن بمتوسط المجال
const growth = computed(() => {
  const myReviews = reviewsStore.forSubject('toInterviewer', String(MY_INTERVIEWER_ID))
  return ai.interviewerGrowthTips({
    comments: myReviews.map(r => r.comment),
    avgRating: store.interviewerStats.avgRating || 4.6,
    fieldAvgRating: 4.3, // متوسط مجاله (تحليل منافسين ضمني — بلا أسماء)
  })
})

// عرض ترويجي جديد
const promoDialog = ref(false)
const newPromo = ref({ title: '', kind: 'discount' as 'discount' | 'free_intro', pct: 20 })
function savePromo() {
  if (!newPromo.value.title.trim())
    return
  brand.addPromo({ title: newPromo.value.title.trim(), kind: newPromo.value.kind, pct: newPromo.value.kind === 'discount' ? newPromo.value.pct : undefined })
  promoDialog.value = false
  newPromo.value = { title: '', kind: 'discount', pct: 20 }
}

// توصيات الزملاء المتبادلة — زملاء المهنة من سوق المقيّمين (عداي)
const peerDialog = ref(false)
const colleagues = computed(() => store.interviewers.filter(i => i.id !== MY_INTERVIEWER_ID))
const selectedPeerId = ref<number | null>(null)
function requestEndorsement() {
  const peer = colleagues.value.find(c => c.id === selectedPeerId.value)
  if (!peer)
    return
  brand.requestPeerEndorsement(peer.name, peer.title, peer.initial)
  peerDialog.value = false
  selectedPeerId.value = null
  notifications.push({ icon: 'mdi-account-heart-outline', color: 'info', title: 'أُرسل طلب التوصية', body: `طلبت توصية مهنية من ${peer.name} — ستصلك فور ردّه.`, category: 'endorsement' })
}

// قصة نجاح جديدة — تُرسل لصاحبها للموافقة قبل النشر
const storyDialog = ref(false)
const newStory = ref({ candidateName: '', headline: '', story: '' })
const storyValid = computed(() => !!newStory.value.candidateName.trim() && !!newStory.value.headline.trim() && !!newStory.value.story.trim())
function saveStory() {
  if (!storyValid.value)
    return
  brand.addSuccessStory(newStory.value.candidateName.trim(), newStory.value.headline.trim(), newStory.value.story.trim())
  storyDialog.value = false
  newStory.value = { candidateName: '', headline: '', story: '' }
  notifications.push({ icon: 'mdi-email-fast-outline', color: 'info', title: 'أُرسل طلب الموافقة', body: 'لن تُنشر القصة في ملفك العام إلا بعد موافقة صاحبها.', category: 'system' })
}

const STORY_STATUS_META = {
  awaiting_consent: { label: 'بانتظار الموافقة', color: 'warning' },
  approved: { label: 'منشورة بموافقة', color: 'success' },
  declined: { label: 'اعتُذر عنها', color: 'error' },
} as const

// مقال جديد
const articleDialog = ref(false)
const newArticle = ref({ title: '', body: '' })
function saveArticle() {
  if (!newArticle.value.title.trim() || !newArticle.value.body.trim())
    return
  brand.submitArticle(newArticle.value.title.trim(), newArticle.value.body.trim())
  articleDialog.value = false
  newArticle.value = { title: '', body: '' }
  notifications.push({ icon: 'mdi-post-outline', color: 'info', title: 'أُرسل مقالك للمراجعة', body: 'سيُنشر في ملفك العام فور اعتماده.', category: 'system' })
}

function acceptRequest(a: AgendaItem) {
  store.acceptRequest(a.id)
  notifications.push({
    icon: 'mdi-calendar-check-outline',
    color: 'success',
    title: 'قبلت طلب مقابلة',
    body: `أكّدت مقابلة ${KIND_META[a.kind].label} مع ${a.candidateName} — ${a.datetime}`,
    category: 'interview',
  })
}

const stats = computed(() => [
  { title: 'أرباح الشهر', value: `${store.interviewerStats.earnings} ﷼`, icon: 'mdi-cash-multiple', color: 'success' },
  { title: 'مقابلات منفّذة', value: store.interviewerStats.sessions, icon: 'mdi-check-decagram', color: 'primary' },
  { title: 'متوسط التقييم', value: `${store.interviewerStats.avgRating} ★`, icon: 'mdi-star', color: 'warning' },
  { title: 'طلبات جديدة', value: store.interviewerStats.pending, icon: 'mdi-bell-ring-outline', color: 'accent' },
])

// Pricing management
const priceDialog = ref(false)
const kinds = Object.keys(KIND_META) as MarketInterviewKind[]
const draftPricing = ref<Record<MarketInterviewKind, number>>({ ...store.pricing })
function openPricing() {
  draftPricing.value = { ...store.pricing }
  priceDialog.value = true
}
function savePricing() {
  kinds.forEach(k => store.setPrice(k, draftPricing.value[k]))
  priceDialog.value = false
}

// Custom evaluation elements management
const commissionNote = COMMISSION_NOTE
const newElement = ref({ name: '', description: '', price: 50 })
function addElement() {
  if (!newElement.value.name.trim())
    return
  store.addEvalElement({ name: newElement.value.name.trim(), description: newElement.value.description.trim(), price: newElement.value.price })
  newElement.value = { name: '', description: '', price: 50 }
}
const suggestions = ref<EvalElementSuggestion[]>([])
function loadSuggestions() {
  suggestions.value = ai.suggestEvalElements('technical', [])
}
function addSuggestion(s: EvalElementSuggestion) {
  store.addEvalElement({ name: s.name, description: s.description, price: s.price })
  suggestions.value = suggestions.value.filter(x => x.name !== s.name)
}

const marketingMetrics = computed(() => [
  { label: 'مشاهدات الملف', value: brand.marketingStats.views, icon: 'mdi-eye-outline', color: 'primary' },
  { label: 'مرات المشاركة', value: brand.marketingStats.shares, icon: 'mdi-share-variant-outline', color: 'secondary' },
  { label: 'أضافوني للمفضلة', value: brand.marketingStats.favorites, icon: 'mdi-heart-outline', color: 'error' },
  { label: 'إحالات ناجحة', value: brand.marketingStats.referrals, icon: 'mdi-account-plus-outline', color: 'accent' },
])
</script>

<template>
  <div>
    <PageHeader
      title="لوحة المقيّم"
      subtitle="أدر مقابلاتك التقييمية وأرباحك وأسعارك"
      icon="mdi-account-tie"
    >
      <template #actions>
        <BaseButton variant="ghost" size="sm" :to="{ name: 'interviewer-analytics' }"><BaseIcon name="mdi-chart-box-outline" :size="16" />التحليلات</BaseButton>
        <BaseButton variant="tonal-emerald" size="sm" @click="openPricing"><BaseIcon name="mdi-tag-outline" :size="16" />إدارة الأسعار</BaseButton>
      </template>
    </PageHeader>

    <div class="mb-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard v-for="s in stats" :key="s.title" v-bind="s" />
    </div>

    <!-- AI tip -->
    <div class="mb-4 flex items-start gap-2 rounded-ui border-s-4 bg-surfalt p-3" :style="{ borderColor: 'rgb(var(--v-theme-secondary))' }">
      <BaseIcon name="mdi-robot-happy-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />
      <span class="text-sm text-content">
        لديك {{ store.interviewerStats.pending }} طلب مقابلة جديد يناسب تخصصك — الرد السريع يرفع تقييمك وترتيبك في السوق.
      </span>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <!-- Requests + upcoming -->
      <div class="lg:col-span-7">
        <h2 class="mb-3 text-base font-bold text-content">طلبات مقابلات جديدة ({{ store.agendaRequests.length }})</h2>
        <BaseCard v-if="store.agendaRequests.length" :padded="false" class="mb-5 overflow-hidden">
          <div v-for="(a, i) in store.agendaRequests" :key="a.id" class="flex items-center gap-3 p-3" :class="{ 'border-t border-ui': i > 0 }">
            <BaseAvatar color="accent" tonal><span class="font-bold">{{ a.candidateInitial }}</span></BaseAvatar>
            <div class="min-w-0 flex-1">
              <div class="font-bold text-content">{{ a.candidateName }} · {{ KIND_META[a.kind].label }}</div>
              <div class="truncate text-xs text-muted">{{ a.candidateField }} · {{ a.datetime }} · {{ a.price }} ﷼</div>
            </div>
            <div class="flex items-center gap-1">
              <BaseButton size="sm" variant="tonal-emerald" @click="acceptRequest(a)"><BaseIcon name="mdi-check" :size="16" />قبول</BaseButton>
              <button class="icon-btn h-8 w-8" style="color: rgb(var(--v-theme-error))" aria-label="رفض" @click="store.declineRequest(a.id)"><BaseIcon name="mdi-close" :size="18" /></button>
            </div>
          </div>
        </BaseCard>
        <BaseCard v-else class="mb-5 py-6 text-center">
          <BaseIcon name="mdi-inbox-outline" :size="40" :style="{ color: colorVar('medium-emphasis') }" />
          <div class="mt-1 text-sm text-muted">لا طلبات جديدة حاليًا</div>
        </BaseCard>

        <h2 class="mb-3 text-base font-bold text-content">مقابلات قادمة ({{ store.agendaUpcoming.length }})</h2>
        <BaseCard v-if="store.agendaUpcoming.length" :padded="false" class="overflow-hidden">
          <div v-for="(a, i) in store.agendaUpcoming" :key="a.id" class="flex items-center gap-3 p-3" :class="{ 'border-t border-ui': i > 0 }">
            <BaseAvatar color="info" tonal><span class="font-bold">{{ a.candidateInitial }}</span></BaseAvatar>
            <div class="min-w-0 flex-1">
              <div class="font-bold text-content">{{ a.candidateName }} · {{ KIND_META[a.kind].label }}</div>
              <div class="truncate text-xs text-muted">{{ a.datetime }} · {{ a.price }} ﷼</div>
            </div>
            <BaseButton size="sm" variant="brand" @click="router.push({ name: 'conduct-interview', params: { id: a.id } })">
              <BaseIcon name="mdi-video-outline" :size="16" />بدء المقابلة
            </BaseButton>
          </div>
        </BaseCard>
        <BaseCard v-else class="py-6 text-center">
          <BaseIcon name="mdi-calendar-blank-outline" :size="40" :style="{ color: colorVar('medium-emphasis') }" />
          <div class="mt-1 text-sm text-muted">لا مقابلات مجدولة</div>
        </BaseCard>
      </div>

      <!-- Completed -->
      <div class="lg:col-span-5">
        <h2 class="mb-3 text-base font-bold text-content">مقابلات منفّذة ({{ store.agendaCompleted.length }})</h2>
        <BaseCard :padded="false" class="overflow-hidden">
          <template v-if="store.agendaCompleted.length">
            <div v-for="(a, i) in store.agendaCompleted" :key="a.id" class="flex items-center gap-3 p-3" :class="{ 'border-t border-ui': i > 0 }">
              <BaseAvatar color="success" tonal><span class="font-bold">{{ a.candidateInitial }}</span></BaseAvatar>
              <div class="min-w-0 flex-1">
                <div class="font-bold text-content">{{ a.candidateName }}</div>
                <div class="truncate text-xs text-muted">{{ KIND_META[a.kind].label }} · {{ a.datetime }}</div>
              </div>
              <div class="flex items-center gap-2">
                <BaseRating v-if="a.rating" :model-value="a.rating" color="warning" :size="14" readonly />
                <BaseChip v-if="a.report" color="success">{{ a.report.overall }}%</BaseChip>
              </div>
            </div>
          </template>
          <div v-else class="py-6 text-center text-muted">لا مقابلات منفّذة بعد</div>
        </BaseCard>
      </div>

      <!-- Custom evaluation elements management -->
      <div class="lg:col-span-12">
        <BaseCard>
          <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <BaseIcon name="mdi-tune-vertical" :size="22" :style="{ color: 'rgb(var(--v-theme-accent))' }" />
              <h2 class="text-base font-bold text-content">عناصر التقييم المخصّصة</h2>
            </div>
            <BaseButton size="sm" variant="tonal-emerald" @click="loadSuggestions"><BaseIcon name="mdi-robot-happy-outline" :size="16" />اقترح بالذكاء الاصطناعي</BaseButton>
          </div>
          <p class="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted">
            أضِف عناصر تقييم إضافية بسعر مستقل تظهر للمرشّحين عند الحجز.
            <BaseDropdown align="start" :close-on-content="false">
              <template #trigger="{ toggle }">
                <span class="inline-flex cursor-pointer items-center gap-1" style="color: rgb(var(--v-theme-secondary))" @click="toggle"><BaseIcon name="mdi-information-outline" :size="14" />العمولة</span>
              </template>
              <div class="max-w-[320px] p-3 text-xs text-content">{{ commissionNote }}</div>
            </BaseDropdown>
          </p>

          <div v-if="suggestions.length" class="mb-3 flex flex-wrap gap-2">
            <button v-for="s in suggestions" :key="s.name" type="button" class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium" style="background: rgba(var(--v-theme-secondary), 0.16); color: rgb(var(--v-theme-secondary))" @click="addSuggestion(s)">
              <BaseIcon name="mdi-plus" :size="14" />{{ s.name }} (+{{ s.price }})
            </button>
          </div>

          <div v-if="store.myEvalElements.length" class="mb-4 flex flex-col gap-2">
            <div v-for="el in store.myEvalElements" :key="el.id" class="element-row flex items-center gap-2 p-2">
              <div class="flex-1">
                <div class="text-sm font-bold text-content">{{ el.name }}</div>
                <div class="text-xs text-muted">{{ el.description }}</div>
              </div>
              <span class="font-bold text-content">+{{ el.price }} ﷼</span>
              <button class="icon-btn h-8 w-8" style="color: rgb(var(--v-theme-error))" aria-label="حذف" @click="store.removeEvalElement(el.id)"><BaseIcon name="mdi-delete-outline" :size="16" /></button>
            </div>
          </div>
          <div v-else class="mb-3 text-xs text-muted">لا عناصر مخصّصة بعد.</div>

          <div class="grid grid-cols-1 items-end gap-3 sm:grid-cols-12">
            <BaseInput v-model="newElement.name" label="اسم العنصر" class="sm:col-span-4" />
            <BaseInput v-model="newElement.description" label="الوصف" class="sm:col-span-5" />
            <BaseInput v-model.number="newElement.price" type="number" label="السعر" class="sm:col-span-2">
              <template #suffix><span class="text-xs text-muted">﷼</span></template>
            </BaseInput>
            <BaseButton variant="accent" block :disabled="!newElement.name.trim()" class="sm:col-span-1" @click="addElement"><BaseIcon name="mdi-plus" :size="18" /></BaseButton>
          </div>
        </BaseCard>
      </div>

      <!-- Personal marketing & growth panel (شريك نجاح) -->
      <div class="lg:col-span-12">
        <BaseCard>
          <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <BaseIcon name="mdi-bullhorn-outline" :size="22" :style="{ color: 'rgb(var(--v-theme-accent))' }" />
              <h2 class="text-base font-bold text-content">التسويق الشخصي</h2>
              <BaseChip v-if="brand.isAmbassador" color="accent"><BaseIcon name="mdi-shield-star-outline" :size="12" />سفير المنصة</BaseChip>
            </div>
            <div class="flex flex-wrap gap-2">
              <BaseButton size="sm" variant="tonal-brand" :to="`/${brand.publicPath}`"><BaseIcon name="mdi-open-in-new" :size="16" />ملفي العام</BaseButton>
              <BaseButton size="sm" variant="tonal-emerald" @click="copyPublicLink"><BaseIcon :name="linkCopied ? 'mdi-check' : 'mdi-link-variant'" :size="16" />{{ linkCopied ? 'نُسخ الرابط' : 'مشاركة الملف' }}</BaseButton>
              <BaseButton size="sm" variant="ghost" @click="brand.shareOnLinkedIn()"><BaseIcon name="mdi-linkedin" :size="16" :style="{ color: 'rgb(var(--v-theme-info))' }" /><span :style="{ color: 'rgb(var(--v-theme-info))' }">LinkedIn</span></BaseButton>
            </div>
          </div>
          <p class="mb-3 text-xs text-muted">ملفك العام بطاقة تسويقية — شاركه على LinkedIn ووسائل التواصل لجذب حجوزات جديدة.</p>

          <!-- مؤشرات الوصول -->
          <div class="mb-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div v-for="m in marketingMetrics" :key="m.label" class="growth-tile rounded-ui p-3 text-center">
              <BaseIcon :name="m.icon" :size="20" class="mb-1" :style="{ color: colorVar(m.color) }" />
              <div class="text-lg font-bold text-content">{{ m.value }}</div>
              <div class="text-xs text-muted">{{ m.label }}</div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <!-- رابط الدعوة -->
            <div>
              <div class="mb-1 flex items-center gap-1 text-sm font-bold text-content"><BaseIcon name="mdi-account-multiple-plus-outline" :size="16" /> رابط الدعوة (شريك نمو)</div>
              <p class="mb-2 text-xs text-muted">كل مرشح يسجّل عبر رابطك = +50 نقطة في محفظتك.</p>
              <BaseInput :model-value="brand.referralLink" readonly dir="ltr">
                <template #suffix>
                  <button class="icon-btn h-8 w-8" :style="refCopied ? { color: 'rgb(var(--v-theme-success))' } : {}" aria-label="نسخ" @click="copyReferral"><BaseIcon :name="refCopied ? 'mdi-check' : 'mdi-content-copy'" :size="18" /></button>
                </template>
              </BaseInput>
            </div>

            <!-- العروض الترويجية -->
            <div>
              <div class="mb-1 flex items-center justify-between">
                <div class="flex items-center gap-1 text-sm font-bold text-content"><BaseIcon name="mdi-tag-heart-outline" :size="16" /> عروضي الترويجية</div>
                <BaseButton size="sm" variant="tonal-accent" @click="promoDialog = true"><BaseIcon name="mdi-plus" :size="14" />عرض جديد</BaseButton>
              </div>
              <div v-for="p in brand.state.promos" :key="p.id" class="flex items-center gap-2 py-1">
                <BaseSwitch :model-value="p.active" @update:model-value="brand.togglePromo(p.id)" />
                <span class="flex-1 text-xs" :class="p.active ? 'text-content' : 'text-muted'">{{ p.title }}<b v-if="p.pct"> ({{ p.pct }}%)</b></span>
                <button class="icon-btn h-8 w-8" style="color: rgb(var(--v-theme-error))" aria-label="حذف" @click="brand.removePromo(p.id)"><BaseIcon name="mdi-delete-outline" :size="16" /></button>
              </div>
              <p v-if="!brand.state.promos.length" class="text-xs text-muted">أنشئ عرضًا (خصم أو جلسة تعارف مجانية) لجذب مرشحين جدد.</p>
            </div>
          </div>

          <hr class="my-3 border-ui">

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <!-- توصيات AI للنمو -->
            <div>
              <div class="mb-2 flex items-center gap-1 text-sm font-bold text-content"><BaseIcon name="mdi-robot-happy-outline" :size="16" :style="{ color: 'rgb(var(--v-theme-secondary))' }" /> مستشار النمو الذكي</div>
              <div class="mb-2 rounded-ui border-s-4 p-2 text-xs text-content" style="background: rgba(var(--v-theme-success), 0.14); border-color: rgb(var(--v-theme-success))">{{ growth.praise }}</div>
              <div class="mb-2 rounded-ui border-s-4 p-2 text-xs text-content" style="background: rgba(var(--v-theme-warning), 0.14); border-color: rgb(var(--v-theme-warning))">{{ growth.focus }}</div>
              <div class="rounded-ui border-s-4 p-2 text-xs text-content" style="background: rgba(var(--v-theme-info), 0.14); border-color: rgb(var(--v-theme-info))">{{ growth.vsField }}</div>
            </div>

            <!-- مقالاتي -->
            <div>
              <div class="mb-1 flex items-center justify-between">
                <div class="flex items-center gap-1 text-sm font-bold text-content"><BaseIcon name="mdi-post-outline" :size="16" /> مقالاتي المهنية</div>
                <BaseButton size="sm" variant="tonal-emerald" @click="articleDialog = true"><BaseIcon name="mdi-pencil-plus-outline" :size="14" />مقال جديد</BaseButton>
              </div>
              <div v-for="a in brand.state.articles" :key="a.id" class="flex items-center gap-2 py-1">
                <BaseChip :color="a.status === 'published' ? 'success' : 'warning'">{{ a.status === 'published' ? 'منشور' : 'قيد المراجعة' }}</BaseChip>
                <span class="flex-1 text-xs text-content">{{ a.title }}</span>
              </div>
              <p class="mt-1 text-xs text-muted">المقالات تُعرض في ملفك العام بعد مراجعة المنصة — تبني سلطتك المهنية.</p>
            </div>
          </div>

          <hr class="my-3 border-ui">

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <!-- توصيات الزملاء المتبادلة -->
            <div>
              <div class="mb-1 flex items-center justify-between">
                <div class="flex items-center gap-1 text-sm font-bold text-content"><BaseIcon name="mdi-account-heart-outline" :size="16" :style="{ color: 'rgb(var(--v-theme-secondary))' }" /> توصيات زملاء المهنة</div>
                <BaseButton size="sm" variant="tonal-emerald" @click="peerDialog = true"><BaseIcon name="mdi-plus" :size="14" />اطلب توصية</BaseButton>
              </div>
              <div v-for="e in brand.state.peerEndorsements" :key="e.id" class="flex items-center gap-2 py-1">
                <BaseChip :color="e.status === 'received' ? 'success' : 'warning'">{{ e.status === 'received' ? 'مستلمة' : 'بانتظار الرد' }}</BaseChip>
                <span class="flex-1 text-xs text-content">{{ e.peerName }}</span>
                <BaseChip v-if="e.reciprocated" color="emerald"><BaseIcon name="mdi-swap-horizontal" :size="12" />متبادلة</BaseChip>
                <BaseButton v-else-if="e.status === 'received'" size="sm" variant="ghost" @click="brand.reciprocatePeerEndorsement(e.id)">
                  <BaseIcon name="mdi-swap-horizontal" :size="14" :style="{ color: 'rgb(var(--v-theme-secondary))' }" /><span :style="{ color: 'rgb(var(--v-theme-secondary))' }">ردّ التوصية</span>
                </BaseButton>
              </div>
              <p class="mt-1 text-xs text-muted">التوصيات المتبادلة بين المقيّمين ترفع مصداقية الطرفين وتظهر في الملف العام بشارة «متبادلة».</p>
            </div>

            <!-- قصص النجاح (بموافقة أصحابها) -->
            <div>
              <div class="mb-1 flex items-center justify-between">
                <div class="flex items-center gap-1 text-sm font-bold text-content"><BaseIcon name="mdi-trophy-variant-outline" :size="16" :style="{ color: 'rgb(var(--v-theme-success))' }" /> قصص نجاح مرشحيّ</div>
                <BaseButton size="sm" variant="tonal-emerald" @click="storyDialog = true"><BaseIcon name="mdi-plus" :size="14" />قصة جديدة</BaseButton>
              </div>
              <div v-for="s in brand.state.successStories" :key="s.id" class="flex items-center gap-2 py-1">
                <BaseChip :color="mapColor(STORY_STATUS_META[s.status].color)">{{ STORY_STATUS_META[s.status].label }}</BaseChip>
                <span class="flex-1 text-xs text-content">{{ s.headline }}</span>
                <button class="icon-btn h-8 w-8" style="color: rgb(var(--v-theme-error))" aria-label="حذف" @click="brand.removeSuccessStory(s.id)"><BaseIcon name="mdi-delete-outline" :size="16" /></button>
              </div>
              <p class="mt-1 text-xs text-muted">لا تُنشر أي قصة في ملفك العام قبل موافقة صاحبها الصريحة — الخصوصية أولًا.</p>
            </div>
          </div>

          <hr class="my-3 border-ui">

          <!-- شهاداتي القابلة للمشاركة -->
          <div class="mb-2 flex items-center gap-1 text-sm font-bold text-content"><BaseIcon name="mdi-certificate-outline" :size="16" :style="{ color: 'rgb(var(--v-theme-primary))' }" /> شهاداتي وإنجازاتي — شاركها على LinkedIn</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="a in brand.achievements.filter(x => x.earned)"
              :key="a.id"
              type="button"
              class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium"
              style="background: rgba(var(--v-theme-primary), 0.14); color: rgb(var(--v-theme-primary))"
              @click="brand.shareOnLinkedIn()"
            >
              <BaseIcon :name="a.icon" :size="16" />{{ a.label }}
              <BaseIcon name="mdi-linkedin" :size="16" :style="{ color: 'rgb(var(--v-theme-info))' }" />
            </button>
          </div>
          <p class="mb-0 mt-2 text-xs text-muted">النقر على الشهادة يفتح مشاركة LinkedIn لملفك العام الموثّق — كل شهادة مشتقة من أداء حقيقي على المنصة.</p>
        </BaseCard>
      </div>

      <!-- Candidate reviews of me (doc §3.3-ب) -->
      <div class="lg:col-span-12">
        <BaseCard>
          <div class="mb-1 flex items-center gap-2">
            <BaseIcon name="mdi-star-check-outline" :size="22" :style="{ color: colorVar('amber') }" />
            <h2 class="text-base font-bold text-content">تقييمات المرشحين لي</h2>
          </div>
          <p class="mb-3 text-xs text-muted">آخر التقييمات العلنية من مرشحيك — يمكنك الرد مرة واحدة على كل تقييم.</p>
          <ReviewsPanel direction="toInterviewer" subject-id="1" can-reply :limit="3" />
        </BaseCard>
      </div>
    </div>

    <!-- New promo dialog -->
    <BaseModal v-model="promoDialog" title="عرض ترويجي جديد" :max-width="440">
      <BaseInput v-model="newPromo.title" label="عنوان العرض" placeholder="خصم على الحزمة الشاملة" class="mb-3" />
      <div class="seg mb-3 w-full">
        <button type="button" class="seg-btn flex flex-1 items-center justify-center gap-1" :class="{ 'is-active': newPromo.kind === 'discount' }" @click="newPromo.kind = 'discount'"><BaseIcon name="mdi-percent-outline" :size="16" />خصم %</button>
        <button type="button" class="seg-btn flex flex-1 items-center justify-center gap-1" :class="{ 'is-active': newPromo.kind === 'free_intro' }" @click="newPromo.kind = 'free_intro'"><BaseIcon name="mdi-gift-outline" :size="16" />جلسة مجانية</button>
      </div>
      <div v-if="newPromo.kind === 'discount'">
        <div class="mb-1 flex justify-between text-sm text-content"><span>نسبة الخصم</span><span class="font-bold">{{ newPromo.pct }}%</span></div>
        <BaseSlider v-model="newPromo.pct" :min="5" :max="50" :step="5" color="accent" />
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="promoDialog = false">إلغاء</BaseButton>
        <BaseButton variant="accent" :disabled="!newPromo.title.trim()" @click="savePromo">تفعيل العرض</BaseButton>
      </template>
    </BaseModal>

    <!-- Peer endorsement request dialog -->
    <BaseModal v-model="peerDialog" title="طلب توصية من زميل مقيّم" :max-width="440">
      <label class="mb-1 block text-sm font-medium text-muted">اختر الزميل</label>
      <BaseSelect v-model="selectedPeerId" :items="colleagues.map(c => ({ title: `${c.name} — ${c.title}`, value: c.id }))" placeholder="—" />
      <p class="mb-0 mt-2 text-xs text-muted">تصلك التوصية فور ردّ الزميل وتظهر في ملفك العام — ويمكنك ردّها لتصبح «متبادلة».</p>
      <template #actions>
        <BaseButton variant="ghost" @click="peerDialog = false">إلغاء</BaseButton>
        <BaseButton variant="tonal-emerald" :disabled="!selectedPeerId" @click="requestEndorsement"><BaseIcon name="mdi-send" :size="16" />إرسال الطلب</BaseButton>
      </template>
    </BaseModal>

    <!-- New success story dialog -->
    <BaseModal v-model="storyDialog" title="قصة نجاح جديدة" :max-width="560">
      <BaseInput v-model="newStory.candidateName" label="اسم المرشح صاحب القصة" class="mb-3" />
      <BaseInput v-model="newStory.headline" label="عنوان القصة" placeholder="من رفض متكرر إلى عرض عمل" class="mb-3" />
      <BaseTextarea v-model="newStory.story" label="القصة" :rows="4" />
      <div class="mt-2 rounded-ui border-s-4 p-2 text-xs text-content" style="background: rgba(var(--v-theme-warning), 0.14); border-color: rgb(var(--v-theme-warning))">
        تُرسل القصة أولًا لصاحبها للموافقة — ولا تظهر في ملفك العام إلا بعد موافقته الصريحة.
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="storyDialog = false">إلغاء</BaseButton>
        <BaseButton variant="tonal-emerald" :disabled="!storyValid" @click="saveStory"><BaseIcon name="mdi-email-fast-outline" :size="16" />طلب موافقة صاحبها</BaseButton>
      </template>
    </BaseModal>

    <!-- New article dialog -->
    <BaseModal v-model="articleDialog" title="مقال مهني جديد" :max-width="560">
      <BaseInput v-model="newArticle.title" label="عنوان المقال" class="mb-3" />
      <BaseTextarea v-model="newArticle.body" label="المحتوى" :rows="5" />
      <p class="mt-2 text-xs text-muted">يُراجَع المقال من المنصة قبل النشر في ملفك العام.</p>
      <template #actions>
        <BaseButton variant="ghost" @click="articleDialog = false">إلغاء</BaseButton>
        <BaseButton variant="tonal-emerald" :disabled="!newArticle.title.trim() || !newArticle.body.trim()" @click="saveArticle"><BaseIcon name="mdi-send" :size="16" />إرسال للمراجعة</BaseButton>
      </template>
    </BaseModal>

    <!-- Pricing dialog -->
    <BaseModal v-model="priceDialog" title="إدارة أسعار المقابلات" :max-width="460">
      <div v-for="k in kinds" :key="k" class="mb-2 flex items-center gap-3">
        <span class="flex-1 text-sm text-content">{{ KIND_META[k].label }}</span>
        <BaseInput v-model.number="draftPricing[k]" type="number" class="max-w-[130px]">
          <template #suffix><span class="text-xs text-muted">﷼</span></template>
        </BaseInput>
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="priceDialog = false">إلغاء</BaseButton>
        <BaseButton variant="accent" @click="savePricing"><BaseIcon name="mdi-content-save" :size="16" />حفظ الأسعار</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.element-row {
  border: 1px solid rgba(140, 163, 150, 0.2);
  border-radius: var(--ui-radius);
}
.growth-tile {
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>

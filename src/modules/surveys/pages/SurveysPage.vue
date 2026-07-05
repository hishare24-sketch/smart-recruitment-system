<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { DEFAULT_SETTINGS, FREE_SURVEY_LIMIT, QUESTION_TYPE_META, SURVEY_STATUS_META, generateQuestions, useSurveysStore } from '@/stores/SurveysStore'
import type { Survey, SurveyQuestion, SurveyQuestionType, SurveySettings } from '@/stores/SurveysStore'
import { bankFor } from '../services/questionBanks'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseTagInput from '@/components/ui/BaseTagInput.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral' } as Record<string, BaseColor>)[c] ?? c) as BaseColor
}

// embedded: تُعرض داخل مركز الاستبيانات الموحّد بلا ترويسة مكررة
withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

const router = useRouter()
const store = useSurveysStore()

const surveyTypes = [
  { id: 1, name: 'تقييم وظيفي', desc: 'تقييم أداء المرشح من مديره السابق', icon: 'mdi-star-check-outline', color: 'brand' },
  { id: 2, name: 'توصية مهنية', desc: 'جمع توصيات من زملاء العمل', icon: 'mdi-account-star-outline', color: 'emerald' },
  { id: 3, name: 'رضا المرشح', desc: 'انطباع المرشح عن عملية التوظيف', icon: 'mdi-emoticon-happy-outline', color: 'success' },
  { id: 4, name: 'رضا جهة التوظيف', desc: 'تقييم جودة الترشيحات وسرعة الإنجاز', icon: 'mdi-domain', color: 'info' },
  { id: 5, name: 'تحليل شخصية', desc: 'فهم السمات الشخصية للباحث', icon: 'mdi-head-cog-outline', color: 'accent' },
  { id: 6, name: 'احتياجات السوق', desc: 'مهارات مطلوبة، رواتب، اتجاهات', icon: 'mdi-chart-line', color: 'warning' },
  { id: 7, name: 'جودة الخدمة', desc: 'تقييم تجربة المستخدم مع المنصة', icon: 'mdi-thumb-up-outline', color: 'brand' },
  { id: 8, name: 'التدريب والتطوير', desc: 'احتياجات المستخدمين من دورات', icon: 'mdi-school-outline', color: 'emerald' },
] as const

const QUESTION_TYPES = Object.entries(QUESTION_TYPE_META).map(([value, m]) => ({ value: value as SurveyQuestionType, title: m.label, icon: m.icon }))
const needsOptions = (t: SurveyQuestionType) => ['single', 'multiple', 'dropdown', 'ranking'].includes(t)

// ===== Builder (3 steps: أساسي → أسئلة → إعدادات) =====
const dialog = ref(false)
const step = ref(1)
const selectedType = ref('')
const surveyTitle = ref('')
const audience = ref<Survey['audience']>('both')
const questions = ref<SurveyQuestion[]>([])
const settings = ref<SurveySettings>({ ...DEFAULT_SETTINGS })
const editingId = ref<number | null>(null) // null = إنشاء جديد
let qId = 1

const AUDIENCES = [
  { value: 'internal', title: 'داخل المنصة فقط' },
  { value: 'external', title: 'رابط خارجي فقط' },
  { value: 'both', title: 'داخل المنصة + رابط خارجي' },
]
const STEPS = [
  { value: 1, label: 'أساسي', icon: 'mdi-information-outline' },
  { value: 2, label: 'الأسئلة', icon: 'mdi-format-list-numbered' },
  { value: 3, label: 'إعدادات احترافية', icon: 'mdi-cog-outline' },
]

// بوابة خطة الاشتراك: المجانية = 3 استبيانات
const upgradeDialog = ref(false)
function guardPlan(): boolean {
  if (store.canCreate)
    return true
  upgradeDialog.value = true
  return false
}
function upgradeNow() {
  const ok = store.upgradePlan() // يمر عبر باقة الحساب الموحّدة (مدفوعة من المحفظة)
  upgradeDialog.value = false
  snackbar.value = ok ? 'ترقّت باقة حسابك — سعة استبيانات أكبر' : 'رصيد المحفظة لا يكفي — اشحن ثم أعد المحاولة'
}

function createSurvey(name: string) {
  if (!guardPlan())
    return
  editingId.value = null
  selectedType.value = name
  surveyTitle.value = `استبيان ${name}`
  audience.value = 'both'
  questions.value = generateQuestions(name).map(q => ({ ...q, id: qId++ }))
  settings.value = { ...DEFAULT_SETTINGS }
  step.value = 1
  dialog.value = true
}

// [+] استبيان فارغ من الصفر
function createBlank() {
  if (!guardPlan())
    return
  editingId.value = null
  selectedType.value = 'مخصص'
  surveyTitle.value = ''
  audience.value = 'both'
  questions.value = []
  settings.value = { ...DEFAULT_SETTINGS }
  step.value = 1
  dialog.value = true
}

// تعديل استبيان قائم في صفحته المستقلة (المنشئ نفسه)
function editSurvey(s: Survey) {
  editingId.value = s.id
  selectedType.value = s.type
  surveyTitle.value = s.title
  audience.value = s.audience
  questions.value = JSON.parse(JSON.stringify(s.questions))
  qId = Math.max(0, ...questions.value.map(q => q.id)) + 1
  settings.value = { ...DEFAULT_SETTINGS, ...JSON.parse(JSON.stringify(s.settings)) }
  step.value = 2
  dialog.value = true
}

// بنك الأسئلة الثابت (20 سؤالًا لكل نموذج) — يضاف كنسخة قابلة للتعديل
const bankOpen = ref(false)
const bankQuestions = computed(() => bankFor(selectedType.value))
function addFromBank(i: number) {
  const q = bankQuestions.value[i]
  questions.value.push({ ...JSON.parse(JSON.stringify(q)), id: qId++ })
}
function addAllFromBank() {
  bankQuestions.value.forEach((_, i) => addFromBank(i))
}
function inSurvey(text: string): boolean {
  return questions.value.some(q => q.text === text)
}

function addQuestion(type: SurveyQuestionType = 'single') {
  questions.value.push({
    id: qId++,
    text: '',
    type,
    options: needsOptions(type) ? ['خيار 1', 'خيار 2'] : undefined,
    rows: type === 'matrix' ? ['عنصر 1', 'عنصر 2'] : undefined,
  })
}
function onTypeChange(q: SurveyQuestion) {
  q.options = needsOptions(q.type) ? (q.options ?? ['خيار 1', 'خيار 2']) : undefined
  q.rows = q.type === 'matrix' ? (q.rows ?? ['عنصر 1', 'عنصر 2']) : undefined
}
function removeQuestion(id: number) {
  questions.value = questions.value.filter(q => q.id !== id)
}
function moveQuestion(i: number, dir: -1 | 1) {
  const t = i + dir
  if (t < 0 || t >= questions.value.length)
    return
  ;[questions.value[i], questions.value[t]] = [questions.value[t], questions.value[i]]
}
function aiGenerate() {
  questions.value = generateQuestions(selectedType.value).map(q => ({ ...q, id: qId++ }))
}

const savedSurvey = ref<Survey | null>(null)
function saveSurvey(status: 'active' | 'draft') {
  const payload = {
    title: surveyTitle.value || `استبيان ${selectedType.value}`,
    type: selectedType.value,
    audience: audience.value,
    questions: questions.value.filter(q => q.text.trim()),
    settings: { ...settings.value },
    status,
  }
  let s: Survey
  if (editingId.value !== null) {
    store.update(editingId.value, payload)
    s = store.byId(editingId.value)!
    snackbar.value = 'حُفظت تعديلات الاستبيان'
  }
  else {
    s = store.add({ ...payload, owner: 'me' })
  }
  dialog.value = false
  if (editingId.value === null && status === 'active' && s.audience !== 'internal') {
    savedSurvey.value = s
    shareDialog.value = true
  }
}

// ===== Share (external link + QR) =====
const shareDialog = ref(false)
const shareTarget = computed(() => savedSurvey.value)
const shareLink = computed(() => (shareTarget.value ? `${window.location.origin}${import.meta.env.BASE_URL}survey/${shareTarget.value.token}` : ''))
const qrUrl = computed(() => (shareLink.value ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareLink.value)}` : ''))
const copied = ref(false)
function openShare(s: Survey) {
  savedSurvey.value = s
  shareDialog.value = true
}
function copyLink() {
  navigator.clipboard?.writeText(shareLink.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1600)
}
function simulate() {
  if (shareTarget.value)
    store.simulateResponses(shareTarget.value.id, 4)
  snackbar.value = 'بدأ وصول استجابات تجريبية عبر الرابط — تابع الإشعارات والتحليل'
}

const snackbar = ref('')
const STATUS_META = SURVEY_STATUS_META

const canPublish = computed(() => questions.value.some(q => q.text.trim()))
</script>

<template>
  <div>
    <PageHeader v-if="!embedded" title="الاستبيانات التفاعلية" subtitle="منشئ احترافي بعشرة أنماط أسئلة، نشر داخلي وخارجي، وتحليل ذكي للنتائج" icon="mdi-poll" />

    <h3 class="mb-3 text-lg font-bold text-content">أنشئ استبياناً جديداً</h3>
    <div class="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
      <!-- [+] استبيان فارغ ببنك الأنماط العشرة -->
      <button
        type="button"
        class="flex flex-col items-center justify-center rounded-ui-lg border border-dashed border-ui bg-surface p-4 text-center transition hover:brightness-105"
        @click="createBlank"
      >
        <BaseAvatar color="brand" tonal square :size="52" class="mx-auto mb-2"><BaseIcon name="mdi-plus" :size="30" /></BaseAvatar>
        <div class="text-sm font-bold text-content">استبيان جديد فارغ</div>
        <div class="text-xs text-muted">ابنِه من الصفر بأنماط الأسئلة العشرة</div>
      </button>
      <button
        v-for="s in surveyTypes"
        :key="s.id"
        type="button"
        class="flex flex-col items-center rounded-ui-lg border-ui bg-surface p-4 text-center transition hover:brightness-105"
        @click="createSurvey(s.name)"
      >
        <BaseAvatar :color="s.color" tonal square :size="52" class="mb-2"><BaseIcon :name="s.icon" :size="28" /></BaseAvatar>
        <div class="text-sm font-bold text-content">{{ s.name }}</div>
        <div class="text-xs text-muted">{{ s.desc }}</div>
        <BaseChip color="emerald" class="mt-1">بنك 20 سؤالًا</BaseChip>
      </button>
    </div>

    <div class="mb-3 flex flex-wrap items-center gap-2">
      <h3 class="text-lg font-bold text-content">استبياناتي ({{ store.mySurveys.length }})</h3>
      <BaseChip :color="store.plan === 'pro' ? 'success' : 'warning'">
        {{ store.plan === 'pro' ? 'باقة مدفوعة — سعة موسّعة' : `الباقة الأساسية — ${store.mySurveys.length}/${FREE_SURVEY_LIMIT}` }}
      </BaseChip>
      <BaseButton v-if="store.plan === 'free'" variant="tonal-emerald" size="sm" @click="upgradeDialog = true">
        <BaseIcon name="mdi-arrow-up-bold-circle-outline" :size="16" /> ترقية
      </BaseButton>
    </div>

    <BaseCard :padded="false" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-ui text-muted">
            <th class="p-3 text-start font-medium">الاستبيان</th>
            <th class="p-3 text-start font-medium">الحالة</th>
            <th class="p-3 text-start font-medium">الأسئلة</th>
            <th class="p-3 text-start font-medium">المستجيبون</th>
            <th class="p-3 text-start font-medium">نسبة الإكمال</th>
            <th class="p-3 text-start font-medium">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in store.mySurveys" :key="s.id" class="border-b border-ui last:border-0">
            <td class="p-3">
              <div class="font-bold text-content">{{ s.title }}</div>
              <div class="text-xs text-muted">{{ s.type }} · {{ s.createdAt }}</div>
            </td>
            <td class="p-3"><BaseChip :color="mapColor(STATUS_META[s.status].color)">{{ STATUS_META[s.status].label }}</BaseChip></td>
            <td class="p-3 text-content">{{ s.questions.length || '—' }}</td>
            <td class="p-3 text-content">
              {{ store.statsFor(s.id).responses }}
              <span class="text-xs text-muted">({{ store.statsFor(s.id).external }} خارجي)</span>
            </td>
            <td class="min-w-[150px] p-3">
              <div class="flex items-center gap-2">
                <BaseProgressBar :value="store.statsFor(s.id).completion" color="success" :height="8" class="flex-1" />
                <span class="text-xs font-bold text-content">{{ store.statsFor(s.id).completion }}%</span>
              </div>
            </td>
            <td class="whitespace-nowrap p-3">
              <div class="flex items-center gap-0.5">
                <BaseButton variant="ghost" size="sm" title="التحليل" @click="router.push({ name: 'survey-analysis', params: { id: s.id } })">
                  <BaseIcon name="mdi-chart-box-outline" :size="18" style="color: rgb(var(--v-theme-primary))" />
                </BaseButton>
                <button class="icon-btn h-9 w-9" title="الإدارة الاحترافية: الجدولة والاستهداف والحوافز والمستبينون" @click="router.push({ name: 'survey-admin', params: { id: s.id } })">
                  <BaseIcon name="mdi-cog-transfer-outline" :size="18" style="color: rgb(var(--v-theme-accent))" />
                </button>
                <button class="icon-btn h-9 w-9" title="تعديل الأسئلة والإعدادات" @click="editSurvey(s)">
                  <BaseIcon name="mdi-pencil-outline" :size="18" />
                </button>
                <button
                  class="icon-btn h-9 w-9 disabled:opacity-40"
                  title="مشاركة الرابط الخارجي"
                  :disabled="s.audience === 'internal'"
                  @click="openShare(s)"
                >
                  <BaseIcon name="mdi-share-variant-outline" :size="18" style="color: rgb(var(--v-theme-secondary))" />
                </button>
                <button class="icon-btn h-9 w-9" title="معاينة" @click="router.push({ name: 'survey-answer', params: { token: s.token }, query: { src: 'in' } })">
                  <BaseIcon name="mdi-eye-outline" :size="18" />
                </button>
                <button class="icon-btn h-9 w-9" title="نسخ" @click="store.duplicate(s.id); snackbar = 'أُنشئت نسخة كمسودة'">
                  <BaseIcon name="mdi-content-copy" :size="18" />
                </button>
                <button class="icon-btn h-9 w-9" :title="s.status === 'active' ? 'إغلاق الاستقبال' : 'تفعيل'" @click="store.setStatus(s.id, s.status === 'active' ? 'closed' : 'active')">
                  <BaseIcon :name="s.status === 'active' ? 'mdi-lock-outline' : 'mdi-lock-open-variant-outline'" :size="18" style="color: rgb(var(--v-theme-warning))" />
                </button>
                <button class="icon-btn h-9 w-9" title="حذف" @click="store.remove(s.id)">
                  <BaseIcon name="mdi-delete-outline" :size="18" style="color: rgb(var(--v-theme-error))" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <!-- ===== Builder dialog (3 steps) ===== -->
    <BaseModal v-model="dialog" :title="`منشئ الاستبيان: ${selectedType}`" :max-width="760">
      <!-- steps tabs -->
      <div class="seg mb-4 flex">
        <button
          v-for="t in STEPS"
          :key="t.value"
          type="button"
          class="seg-btn flex flex-1 items-center justify-center gap-1"
          :class="{ 'is-active': step === t.value }"
          @click="step = t.value"
        >
          <BaseIcon :name="t.icon" :size="16" />
          {{ t.label }}<template v-if="t.value === 2"> ({{ questions.length }})</template>
        </button>
      </div>

      <div class="max-h-[62vh] overflow-y-auto pe-1">
        <!-- Step 1: basics -->
        <div v-if="step === 1">
          <BaseInput v-model="surveyTitle" label="عنوان الاستبيان" class="mb-3" />
          <div class="mb-3">
            <label class="mb-1 block text-sm font-medium text-muted">قنوات النشر</label>
            <BaseSelect v-model="audience" :items="AUDIENCES" />
          </div>
          <div class="rounded-ui p-3 text-sm" style="background: rgba(var(--v-theme-secondary), 0.12); color: rgb(var(--v-theme-secondary))">
            النشر الخارجي يولّد رابط مشاركة عامًا — كل استجابة عبره تصل مباشرة لحسابك مع إشعار.
          </div>
        </div>

        <!-- Step 2: questions (10 types) -->
        <div v-else-if="step === 2">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs text-muted">10 أنماط أسئلة متاحة — اختر النمط لكل سؤال</span>
            <BaseButton variant="tonal-emerald" size="sm" @click="aiGenerate">
              <BaseIcon name="mdi-robot-happy-outline" :size="16" /> توليد بالذكاء الاصطناعي
            </BaseButton>
          </div>

          <!-- بنك الأسئلة الثابت (20 سؤالًا) -->
          <div v-if="bankQuestions.length" class="mb-3 rounded-ui" style="background: rgba(var(--v-theme-secondary), 0.1)">
            <div class="flex cursor-pointer items-center gap-2 p-3" @click="bankOpen = !bankOpen">
              <BaseIcon name="mdi-bank-outline" :size="18" style="color: rgb(var(--v-theme-secondary))" />
              <span class="text-sm font-bold text-content">بنك أسئلة «{{ selectedType }}» ({{ bankQuestions.length }} سؤالًا جاهزًا)</span>
              <BaseButton variant="emerald" size="sm" class="ms-auto" @click.stop="addAllFromBank">إضافة الكل</BaseButton>
              <BaseIcon :name="bankOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'" :size="20" class="text-muted" />
            </div>
            <div v-show="bankOpen" class="max-h-[260px] overflow-y-auto px-3 pb-3">
              <div v-for="(bq, bi) in bankQuestions" :key="bi" class="flex items-center gap-2 py-1">
                <BaseChip color="neutral"><BaseIcon :name="QUESTION_TYPE_META[bq.type].icon" :size="12" /> {{ QUESTION_TYPE_META[bq.type].label }}</BaseChip>
                <span class="flex-1 text-xs text-content">{{ bq.text }}</span>
                <button
                  class="icon-btn h-8 w-8 disabled:opacity-40"
                  :disabled="inSurvey(bq.text)"
                  :title="inSurvey(bq.text) ? 'مُضاف' : 'إضافة'"
                  @click="addFromBank(bi)"
                >
                  <BaseIcon :name="inSurvey(bq.text) ? 'mdi-check' : 'mdi-plus'" :size="16" :style="{ color: inSurvey(bq.text) ? 'rgb(var(--v-theme-success))' : 'rgb(var(--v-theme-primary))' }" />
                </button>
              </div>
            </div>
          </div>

          <div v-for="(q, i) in questions" :key="q.id" class="mb-2 rounded-ui border-ui p-3">
            <div class="mb-2 flex items-center gap-2">
              <div class="flex flex-col">
                <button class="icon-btn h-6 w-6 disabled:opacity-30" :disabled="i === 0" aria-label="لأعلى" @click="moveQuestion(i, -1)"><BaseIcon name="mdi-chevron-up" :size="16" /></button>
                <button class="icon-btn h-6 w-6 disabled:opacity-30" :disabled="i === questions.length - 1" aria-label="لأسفل" @click="moveQuestion(i, 1)"><BaseIcon name="mdi-chevron-down" :size="16" /></button>
              </div>
              <span class="text-sm font-bold text-content">{{ i + 1 }}.</span>
              <BaseInput v-model="q.text" placeholder="نص السؤال" class="flex-1" />
              <button class="icon-btn h-9 w-9" aria-label="حذف السؤال" @click="removeQuestion(q.id)"><BaseIcon name="mdi-delete-outline" :size="18" style="color: rgb(var(--v-theme-error))" /></button>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <BaseSelect v-model="q.type" :items="QUESTION_TYPES" class="w-[230px]" @update:model-value="onTypeChange(q)" />
              <BaseSwitch v-model="q.required" label="إلزامي" />
            </div>
            <BaseTagInput v-if="q.options" v-model="q.options" label="الخيارات" class="mt-2" />
            <BaseTagInput v-if="q.rows" v-model="q.rows" label="عناصر المصفوفة (كل عنصر يُقيَّم على حدة)" class="mt-2" />
            <div v-if="q.type === 'scale'" class="mt-2 flex gap-2">
              <BaseInput v-model="q.scaleMin" label="تسمية الطرف الأدنى" class="flex-1" />
              <BaseInput v-model="q.scaleMax" label="تسمية الطرف الأعلى" class="flex-1" />
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-1">
            <button
              v-for="qt in QUESTION_TYPES"
              :key="qt.value"
              type="button"
              class="btn-tonal-brand inline-flex items-center gap-1 rounded-ui px-2.5 py-1 text-xs font-medium transition"
              @click="addQuestion(qt.value)"
            >
              <BaseIcon :name="QUESTION_TYPE_META[qt.value].icon" :size="14" /> {{ qt.title }}
            </button>
          </div>
        </div>

        <!-- Step 3: professional settings -->
        <div v-else-if="step === 3">
          <BaseTextarea v-model="settings.welcomeMessage" label="رسالة الترحيب" :rows="2" class="mb-2" />
          <BaseTextarea v-model="settings.thanksMessage" label="رسالة الشكر" :rows="2" class="mb-3" />
          <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <BaseSwitch v-model="settings.anonymous" label="استجابات مجهولة الهوية" />
            <BaseSwitch v-model="settings.showProgress" label="إظهار شريط التقدم" />
            <BaseSwitch v-model="settings.oneQuestionPerPage" label="سؤال واحد لكل صفحة" />
            <BaseSwitch v-model="settings.shuffleQuestions" label="ترتيب عشوائي للأسئلة" />
          </div>
          <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <BaseInput v-model.number="settings.responseLimit" type="number" label="حد أقصى للاستجابات (اختياري)" />
            <BaseInput v-model="settings.closesAt" type="date" label="تاريخ الإغلاق التلقائي (اختياري)" />
          </div>
          <div class="my-3 border-t border-ui" />
          <div class="mb-1 flex items-center gap-2">
            <BaseIcon name="mdi-gift-outline" :size="20" style="color: rgb(var(--v-theme-accent))" />
            <span class="text-sm font-bold text-content">نقاط تحفيزية للمشاركين</span>
          </div>
          <p class="mb-2 text-xs text-muted">تُمنح لكل مشارك داخل المنصة وتُخصم من محفظة نقاطك تلقائيًا — تزيد نسبة المشاركة بوضوح.</p>
          <BaseInput v-model.number="settings.rewardPoints" type="number" label="النقاط لكل مشارك (0 = بدون مكافأة)" prefix-icon="mdi-star-circle-outline" class="max-w-[320px]" />
        </div>
      </div>

      <template #actions>
        <BaseButton variant="ghost" size="sm" @click="dialog = false">إلغاء</BaseButton>
        <BaseButton variant="outline" size="sm" @click="saveSurvey('draft')">
          <BaseIcon name="mdi-content-save-outline" :size="16" /> حفظ كمسودة
        </BaseButton>
        <BaseButton variant="accent" size="sm" :disabled="!canPublish" @click="saveSurvey('active')">
          <BaseIcon name="mdi-send" :size="16" /> نشر الاستبيان
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ===== Share dialog ===== -->
    <BaseModal v-model="shareDialog" :title="`مشاركة «${shareTarget?.title ?? ''}»`" :max-width="440">
      <div class="text-center">
        <p class="mb-3 text-sm text-muted">كل من يفتح الرابط يمكنه الإجابة — حتى من خارج المنصة — وتصلك النتيجة فورًا.</p>
        <BaseInput :model-value="shareLink" readonly dir="ltr" class="mb-2">
          <template #suffix>
            <button class="icon-btn h-8 w-8" aria-label="نسخ" @click="copyLink">
              <BaseIcon :name="copied ? 'mdi-check' : 'mdi-content-copy'" :size="16" :style="copied ? 'color: rgb(var(--v-theme-success))' : ''" />
            </button>
          </template>
        </BaseInput>
        <img v-if="qrUrl" :src="qrUrl" alt="QR" width="140" height="140" class="my-2 inline-block rounded-ui">
        <div class="mt-2 flex justify-center gap-2">
          <BaseButton variant="tonal-emerald" size="sm" @click="simulate">
            <BaseIcon name="mdi-account-multiple-plus-outline" :size="16" /> محاكاة مستجيبين
          </BaseButton>
          <a
            :href="shareLink"
            target="_blank"
            rel="noopener"
            class="border-ui inline-flex h-8 items-center gap-1.5 rounded-ui px-3 text-sm font-semibold text-content transition hover:bg-surfalt"
          >
            <BaseIcon name="mdi-open-in-new" :size="16" /> فتح الرابط
          </a>
        </div>
      </div>
    </BaseModal>

    <!-- Upgrade plan dialog (mock subscription) -->
    <BaseModal v-model="upgradeDialog" title="الترقية للخطة الاحترافية" :max-width="420">
      <div class="text-center">
        <BaseIcon name="mdi-arrow-up-bold-circle-outline" :size="48" style="color: rgb(var(--v-theme-secondary))" class="mb-2" />
        <p class="mb-3 text-sm text-content">وصلت حدّ الخطة المجانية ({{ FREE_SURVEY_LIMIT }} استبيانات). الخطة الاحترافية تمنحك استبيانات بلا حدود مع كل أدوات التحليل.</p>
        <div class="mx-auto flex max-w-[260px] flex-col gap-1 text-start text-sm text-content">
          <span><BaseIcon name="mdi-check" :size="16" style="color: rgb(var(--v-theme-success))" /> استبيانات غير محدودة</span>
          <span><BaseIcon name="mdi-check" :size="16" style="color: rgb(var(--v-theme-success))" /> نشر خارجي + QR</span>
          <span><BaseIcon name="mdi-check" :size="16" style="color: rgb(var(--v-theme-success))" /> تحليل AI وتصدير CSV</span>
        </div>
      </div>
      <template #actions>
        <BaseButton variant="ghost" size="sm" @click="upgradeDialog = false">لاحقًا</BaseButton>
        <BaseButton variant="accent" size="sm" @click="upgradeNow">
          <BaseIcon name="mdi-rocket-launch-outline" :size="16" /> رقِّ الآن (تجريبي)
        </BaseButton>
      </template>
    </BaseModal>

    <BaseSnackbar :model-value="!!snackbar" color="primary" @update:model-value="snackbar = ''">
      {{ snackbar }}
    </BaseSnackbar>
  </div>
</template>

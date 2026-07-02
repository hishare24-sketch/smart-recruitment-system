import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useAccountPlanStore } from '@/stores/AccountPlanStore'
import { useGamificationStore } from '@/stores/GamificationStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'

// ===== نظام الاستبيانات — 10 أنماط أسئلة + نشر داخلي/خارجي + استجابات حيّة =====

export type SurveyQuestionType
  = 'single' | 'multiple' | 'dropdown' | 'text' | 'longtext'
    | 'rating' | 'nps' | 'scale' | 'matrix' | 'ranking'

export const QUESTION_TYPE_META: Record<SurveyQuestionType, { label: string, icon: string, hint: string }> = {
  single: { label: 'اختيار واحد', icon: 'mdi-radiobox-marked', hint: 'خيار واحد من قائمة' },
  multiple: { label: 'اختيار متعدد', icon: 'mdi-checkbox-multiple-marked-outline', hint: 'عدة خيارات معًا' },
  dropdown: { label: 'قائمة منسدلة', icon: 'mdi-form-dropdown', hint: 'اختيار من قائمة طويلة' },
  text: { label: 'نص قصير', icon: 'mdi-form-textbox', hint: 'إجابة من سطر واحد' },
  longtext: { label: 'نص مطوّل', icon: 'mdi-text-box-outline', hint: 'إجابة مفصّلة' },
  rating: { label: 'تقييم نجوم', icon: 'mdi-star-outline', hint: 'من 1 إلى 5 نجوم' },
  nps: { label: 'مقياس NPS', icon: 'mdi-speedometer', hint: 'التوصية من 0 إلى 10' },
  scale: { label: 'مقياس خطي', icon: 'mdi-tune-variant', hint: 'تدرّج بين طرفين' },
  matrix: { label: 'مصفوفة', icon: 'mdi-grid', hint: 'عدة عناصر على نفس المقياس' },
  ranking: { label: 'ترتيب أولويات', icon: 'mdi-sort-ascending', hint: 'رتّب الخيارات حسب الأهمية' },
}

export interface SurveyQuestion {
  id: number
  text: string
  type: SurveyQuestionType
  required?: boolean
  options?: string[] // single/multiple/dropdown/ranking
  rows?: string[] // matrix rows
  scaleMin?: string // scale end labels
  scaleMax?: string
}

export interface SurveySettings {
  welcomeMessage: string
  thanksMessage: string
  anonymous: boolean
  showProgress: boolean
  shuffleQuestions: boolean
  oneQuestionPerPage: boolean
  /** حد عدد المستبينين — null = بلا حد */
  responseLimit: number | null
  /** بداية استقبال المشاركات — null = فور التفعيل */
  startsAt: string | null // ISO date
  closesAt: string | null // ISO date
  /** نقاط تحفيزية لكل مشارك — تُخصم من محفظة المنشئ */
  rewardPoints: number
  /** مجمع النقاط الكلي (حد القيمة) — null = بلا سقف؛ عند استنفاده يُغلق الاستبيان تلقائيًا */
  rewardBudget: number | null
}

export const DEFAULT_SETTINGS: SurveySettings = {
  welcomeMessage: 'نقدّر مشاركتك — إجاباتك تساعدنا على التحسين.',
  thanksMessage: 'شكرًا لك! تم استلام إجاباتك بنجاح.',
  anonymous: true,
  showProgress: true,
  shuffleQuestions: false,
  oneQuestionPerPage: true,
  responseLimit: null,
  startsAt: null,
  closesAt: null,
  rewardPoints: 0,
  rewardBudget: null,
}

// ===== الاستهداف الديموغرافي والجغرافي =====
export interface SurveyTargeting {
  /** فارغة = كل المناطق */
  regions: string[]
  gender: 'all' | 'male' | 'female'
  ageMin: number | null
  ageMax: number | null
}

export const DEFAULT_TARGETING: SurveyTargeting = { regions: [], gender: 'all', ageMin: null, ageMax: null }

export const SURVEY_REGIONS = [
  'الرياض', 'مكة المكرمة', 'المدينة المنورة', 'الشرقية', 'عسير', 'تبوك',
  'القصيم', 'حائل', 'جازان', 'نجران', 'الباحة', 'الجوف', 'الحدود الشمالية', 'خارج السعودية',
]

export const GENDER_META: Record<SurveyTargeting['gender'], string> = {
  all: 'الجميع',
  male: 'ذكور',
  female: 'إناث',
}

// ===== قائمة المستبينين (تُستورد من شيت CSV/Excel أو تُضاف يدويًا) =====
export interface SurveyInvitee {
  id: number
  name: string
  /** بريد أو جوال */
  contact: string
  source: 'internal' | 'external'
  status: 'pending' | 'invited' | 'responded'
}

// ===== دورة الحالة الإدارية الكاملة =====
export type SurveyStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'closed' | 'archived'

export const SURVEY_STATUS_META: Record<SurveyStatus, { label: string, color: string, icon: string }> = {
  draft: { label: 'مسودة', color: 'warning', icon: 'mdi-pencil-outline' },
  scheduled: { label: 'مجدول', color: 'info', icon: 'mdi-calendar-clock-outline' },
  active: { label: 'نشط', color: 'success', icon: 'mdi-play-circle-outline' },
  paused: { label: 'موقوف مؤقتًا', color: 'orange', icon: 'mdi-pause-circle-outline' },
  closed: { label: 'مغلق', color: 'surface-variant', icon: 'mdi-lock-outline' },
  archived: { label: 'مؤرشف', color: 'secondary', icon: 'mdi-archive-outline' },
}

/** الانتقالات المسموحة في دورة الحياة */
export const STATUS_TRANSITIONS: Record<SurveyStatus, SurveyStatus[]> = {
  draft: ['scheduled', 'active'],
  scheduled: ['active', 'draft'],
  active: ['paused', 'closed'],
  paused: ['active', 'closed'],
  closed: ['active', 'archived'],
  archived: [],
}

export interface Survey {
  id: number
  title: string
  type: string
  audience: 'internal' | 'external' | 'both'
  token: string // external share link key
  questions: SurveyQuestion[]
  settings: SurveySettings
  targeting: SurveyTargeting
  invitees: SurveyInvitee[]
  /** مجموع النقاط المصروفة من مجمع الحوافز */
  rewardsSpent: number
  status: SurveyStatus
  createdAt: string
  /** 'me' = من إنشاء المستخدم الحالي؛ 'platform' = استبيانات جهات أخرى متاحة للمشاركة */
  owner: 'me' | 'platform'
  ownerName?: string
}

// خطط الاشتراك (mock): المجانية تسمح بعدد محدود من الاستبيانات النشطة
export type SurveyPlan = 'free' | 'pro'
export const FREE_SURVEY_LIMIT = 3

export type AnswerValue = string | number | string[] | Record<string, number>

export interface SurveyResponse {
  id: number
  surveyId: number
  source: 'internal' | 'external'
  at: string
  durationSec: number
  completed: boolean
  /** true = المستخدم الحالي هو المشارك (لمنع التكرار ولصرف المكافأة) */
  mine?: boolean
  answers: Record<number, AnswerValue>
}

const STORAGE_KEY = 'surveys'
const RESPONSES_KEY = 'surveyResponses'

function makeToken(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6)
}

const seedQuestions: SurveyQuestion[] = [
  { id: 1, text: 'كيف تقيّم تجربتك مع المنصة عمومًا؟', type: 'rating', required: true },
  { id: 2, text: 'ما مدى احتمال أن توصي زميلًا بالمنصة؟', type: 'nps', required: true },
  { id: 3, text: 'هل كانت عملية التوظيف واضحة؟', type: 'single', options: ['واضحة تمامًا', 'واضحة نوعًا ما', 'غير واضحة'] },
  { id: 4, text: 'ما القنوات التي تفضّلها للتواصل؟', type: 'multiple', options: ['البريد', 'الإشعارات', 'الرسائل داخل المنصة', 'الجوال'] },
  { id: 5, text: 'قيّم الجوانب التالية', type: 'matrix', rows: ['سرعة الرد', 'وضوح الفرص', 'جودة الترشيحات'] },
  { id: 6, text: 'ما الذي يمكن تحسينه في تجربتك؟', type: 'longtext' },
]

const seed: Survey[] = [
  { id: 1, title: 'رضا المرشحين - يونيو', type: 'رضا المرشح', audience: 'both', token: 'demo01sat', questions: seedQuestions, settings: { ...DEFAULT_SETTINGS, rewardPoints: 10, rewardBudget: 500, responseLimit: 50 }, targeting: { regions: ['الرياض', 'الشرقية'], gender: 'all', ageMin: 20, ageMax: 45 }, invitees: [
    { id: 1, name: 'سارة العتيبي', contact: 'sara@demo.sa', source: 'internal', status: 'responded' },
    { id: 2, name: 'محمد الحارثي', contact: '0551234567', source: 'external', status: 'invited' },
    { id: 3, name: 'نورة القحطاني', contact: 'noura@mail.com', source: 'external', status: 'pending' },
  ], rewardsSpent: 90, status: 'active', createdAt: '2026-06-20', owner: 'me' },
  { id: 2, title: 'احتياجات سوق التقنية', type: 'احتياجات السوق', audience: 'external', token: 'demo02mkt', questions: [
    { id: 1, text: 'ما المهارات الأكثر طلبًا لديكم؟', type: 'ranking', options: ['تطوير', 'تصميم', 'بيانات', 'تسويق'] },
    { id: 2, text: 'ما متوسط الرواتب المتوقعة؟', type: 'dropdown', options: ['أقل من 8 آلاف', '8-15 ألفًا', '15-25 ألفًا', 'أكثر من 25 ألفًا'] },
    { id: 3, text: 'كيف تقيّم توفّر المواهب؟', type: 'scale', scaleMin: 'نادر جدًا', scaleMax: 'متوفر بكثرة' },
  ], settings: { ...DEFAULT_SETTINGS, anonymous: false }, targeting: { ...DEFAULT_TARGETING }, invitees: [], rewardsSpent: 0, status: 'active', createdAt: '2026-06-12', owner: 'me' },
]

// استبيانات جهات أخرى منشورة داخل المنصة — تظهر لكل المستخدمين للمشاركة بمكافأة
const platformSeed: Survey[] = [
  { id: 101, title: 'تجربة التقديم على الفرص التقنية', type: 'رضا المرشح', audience: 'internal', token: 'pf01apply', owner: 'platform', ownerName: 'شركة تقنية المستقبل', status: 'active', createdAt: '2026-06-28', settings: { ...DEFAULT_SETTINGS, rewardPoints: 25 }, targeting: { ...DEFAULT_TARGETING }, invitees: [], rewardsSpent: 0, questions: [
    { id: 1, text: 'كيف تقيّم وضوح إعلانات الفرص لدينا؟', type: 'rating', required: true },
    { id: 2, text: 'ما مدى احتمال أن توصي زميلًا بالتقديم لدينا؟', type: 'nps', required: true },
    { id: 3, text: 'ما الذي يجذبك أكثر في عروض العمل؟', type: 'ranking', options: ['الراتب', 'المرونة', 'فرص التطور', 'ثقافة الفريق'] },
    { id: 4, text: 'ما الذي ينقص صفحات الفرص لدينا؟', type: 'longtext' },
  ] },
  { id: 102, title: 'جودة تقارير المقيّمين المعتمدين', type: 'جودة الخدمة', audience: 'internal', token: 'pf02rep', owner: 'platform', ownerName: 'منظومة التوظيف الذكية', status: 'active', createdAt: '2026-06-25', settings: { ...DEFAULT_SETTINGS, rewardPoints: 15 }, targeting: { ...DEFAULT_TARGETING }, invitees: [], rewardsSpent: 0, questions: [
    { id: 1, text: 'قيّم وضوح تقارير المقيّمين التي اطلعت عليها', type: 'rating', required: true },
    { id: 2, text: 'قيّم الجوانب التالية في التقارير', type: 'matrix', rows: ['دقة التشخيص', 'عملية التوصيات', 'سهولة القراءة'] },
    { id: 3, text: 'هل السعر مقابل التقييم عادل؟', type: 'single', options: ['عادل', 'مرتفع قليلًا', 'مرتفع جدًا'] },
    { id: 4, text: 'ما الذي تضيفه للتقارير لو كان القرار لك؟', type: 'text' },
  ] },
]

function load(): Survey[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return [...seed, ...platformSeed].map(s => structuredClone(s))
  try {
    const list = JSON.parse(raw) as (Survey & { responses?: number })[]
    // Migration from the legacy flat shape (no token/settings/questions typing)
    const migrated = list.map(s => ({
      ...s,
      token: s.token ?? makeToken(),
      settings: { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) },
      targeting: { ...DEFAULT_TARGETING, ...(s.targeting ?? {}) },
      invitees: s.invitees ?? [],
      rewardsSpent: s.rewardsSpent ?? 0,
      questions: s.questions ?? [],
      audience: (['internal', 'external', 'both'].includes(s.audience as string) ? s.audience : 'both') as Survey['audience'],
      status: ((s.status === 'draft' ? 'draft' : s.status) ?? 'draft') as SurveyStatus,
      createdAt: s.createdAt ?? '2026-06-01',
      owner: (s.owner ?? 'me') as Survey['owner'],
    }))
    // Ensure the shared platform surveys exist for participation
    for (const p of platformSeed) {
      if (!migrated.some(s => s.token === p.token))
        migrated.push(structuredClone(p))
    }
    return migrated
  }
  catch {
    return [...seed, ...platformSeed].map(s => structuredClone(s))
  }
}

// Deterministic-ish demo answers per question type (used by the response simulator)
function sampleAnswer(q: SurveyQuestion, i: number): AnswerValue {
  switch (q.type) {
    case 'single':
    case 'dropdown':
      return q.options?.[i % (q.options.length || 1)] ?? ''
    case 'multiple':
      return (q.options ?? []).filter((_, idx) => (idx + i) % 2 === 0)
    case 'rating':
      return 3 + ((i + q.id) % 3) // 3..5
    case 'nps':
      return [9, 10, 8, 7, 10, 6, 9, 3][i % 8]
    case 'scale':
      return 5 + ((i * 2 + q.id) % 6) // 5..10
    case 'matrix':
      return Object.fromEntries((q.rows ?? []).map((r, ri) => [r, 3 + ((i + ri) % 3)]))
    case 'ranking':
      { const opts = [...(q.options ?? [])]
        return [...opts.slice(i % opts.length), ...opts.slice(0, i % opts.length)] }
    case 'text':
      return ['ممتاز عمومًا', 'جيد ويحتاج تحسينات بسيطة', 'تجربة سلسة'][i % 3]
    case 'longtext':
      return [
        'أعجبتني سرعة الترشيح ووضوح الفرص، أتمنى تحسين إشعارات المتابعة.',
        'التجربة ممتازة لكن أقترح إضافة مقابلات تجريبية أكثر.',
        'المنصة سهلة، وأرى أن توثيق المهارات ميزة فارقة.',
      ][i % 3]
  }
}

let nextId = 300
let nextResponseId = 5000

export const useSurveysStore = defineStore('surveys', () => {
  const surveys = ref<Survey[]>(load())
  const responses = ref<SurveyResponse[]>(JSON.parse(localStorage.getItem(RESPONSES_KEY) ?? 'null') ?? [])

  // Persist immediately: load() may have generated migration tokens / appended
  // platform surveys, and share links must survive a full page reload.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys.value))

  watch(surveys, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })
  watch(responses, val => localStorage.setItem(RESPONSES_KEY, JSON.stringify(val)), { deep: true })

  // ===== التمكين حسب باقة الحساب الموحّدة (بديل surveyPlan القديمة) =====
  const accountPlan = useAccountPlanStore()
  /** اسم قديم يبقى للتوافق: pro = أي باقة مدفوعة */
  const plan = computed<SurveyPlan>(() => (accountPlan.tier === 'free' ? 'free' : 'pro'))
  const mySurveys = computed(() => surveys.value.filter(s => s.owner === 'me'))
  const canCreate = computed(() => {
    const limit = accountPlan.surveyLimit
    return limit == null || mySurveys.value.length < limit
  })
  /** الترقية تمر عبر باقة الحساب الموحّدة (مدفوعة من المحفظة) */
  function upgradePlan(): boolean {
    return accountPlan.setTier(accountPlan.tier === 'free' ? 'pro' : 'elite')
  }

  // ===== قسم المشاركة: استبيانات داخلية نشطة من جهات أخرى =====
  const participatable = computed(() =>
    surveys.value.filter(s => s.owner === 'platform' && s.status === 'active' && s.audience !== 'external'),
  )
  function hasParticipated(surveyId: number): boolean {
    return responses.value.some(r => r.surveyId === surveyId && r.mine)
  }

  // Seed live responses for the demo surveys on first run
  if (!responses.value.length) {
    for (const s of seed) {
      const n = s.id === 1 ? 9 : 6
      for (let i = 0; i < n; i++) {
        responses.value.push({
          id: nextResponseId++,
          surveyId: s.id,
          source: i % 3 === 0 ? 'internal' : 'external',
          at: `2026-06-${String(14 + i).padStart(2, '0')}`,
          durationSec: 90 + i * 25,
          completed: i % 5 !== 4,
          answers: Object.fromEntries(s.questions.map(q => [q.id, sampleAnswer(q, i)])),
        })
      }
    }
  }

  function byId(id: number) {
    return surveys.value.find(s => s.id === id)
  }
  function byToken(token: string) {
    return surveys.value.find(s => s.token === token)
  }
  function responsesFor(surveyId: number) {
    return responses.value.filter(r => r.surveyId === surveyId)
  }
  function statsFor(surveyId: number) {
    const rs = responsesFor(surveyId)
    const completedCount = rs.filter(r => r.completed).length
    const avg = rs.length ? Math.round(rs.reduce((s, r) => s + r.durationSec, 0) / rs.length) : 0
    return {
      responses: rs.length,
      completion: rs.length ? Math.round((completedCount / rs.length) * 100) : 0,
      avgTime: rs.length ? `${Math.floor(avg / 60)}:${String(avg % 60).padStart(2, '0')}` : '—',
      internal: rs.filter(r => r.source === 'internal').length,
      external: rs.filter(r => r.source === 'external').length,
    }
  }

  function add(survey: Omit<Survey, 'id' | 'token' | 'createdAt' | 'targeting' | 'invitees' | 'rewardsSpent'> & Partial<Pick<Survey, 'targeting' | 'invitees' | 'rewardsSpent'>>): Survey {
    const s: Survey = {
      targeting: { ...DEFAULT_TARGETING },
      invitees: [],
      rewardsSpent: 0,
      ...survey,
      id: nextId++,
      token: makeToken(),
      createdAt: new Date().toISOString().slice(0, 10),
    }
    surveys.value.unshift(s)
    return s
  }

  function update(id: number, patch: Partial<Omit<Survey, 'id' | 'token'>>) {
    const s = byId(id)
    if (s)
      Object.assign(s, patch)
  }

  function remove(id: number) {
    surveys.value = surveys.value.filter(s => s.id !== id)
    responses.value = responses.value.filter(r => r.surveyId !== id)
  }

  function duplicate(id: number): Survey | null {
    const s = byId(id)
    if (!s)
      return null
    // JSON round-trip: reactive proxies can't pass through structuredClone
    const plain = JSON.parse(JSON.stringify({ title: s.title, type: s.type, audience: s.audience, questions: s.questions, settings: s.settings, targeting: s.targeting }))
    return add({ ...plain, title: `${s.title} (نسخة)`, status: 'draft', owner: 'me' })
  }

  /** انتقال حالة مُتحقَّق منه وفق دورة الحياة الإدارية */
  function setStatus(id: number, status: SurveyStatus): boolean {
    const s = byId(id)
    if (!s || !STATUS_TRANSITIONS[s.status].includes(status))
      return false
    s.status = status
    return true
  }

  /**
   * مزامنة دورة الحياة تلقائيًا:
   * مجدول حان موعده → نشط · نشط انتهى موعده/امتلأت حصته/استُنفد مجمعه → مغلق
   */
  function syncLifecycle() {
    const today = new Date().toISOString().slice(0, 10)
    const notifications = useNotificationsStore()
    for (const s of surveys.value) {
      if (s.status === 'scheduled' && s.settings.startsAt && s.settings.startsAt <= today) {
        s.status = 'active'
        if (s.owner === 'me')
          notifications.push({ icon: 'mdi-play-circle-outline', color: 'success', title: 'انطلق استبيانك المجدول', body: `«${s.title}» بدأ استقبال المشاركات.`, category: 'system', actionTo: `/surveys/${s.id}/admin`, actionLabel: 'إدارة الاستبيان' })
      }
      if (s.status === 'active') {
        const quotaFull = !!s.settings.responseLimit && responsesFor(s.id).length >= s.settings.responseLimit
        const expired = !!s.settings.closesAt && s.settings.closesAt < today
        const budgetOut = s.settings.rewardBudget != null && s.settings.rewardPoints > 0
          && s.rewardsSpent + s.settings.rewardPoints > s.settings.rewardBudget
        if (quotaFull || expired || budgetOut) {
          s.status = 'closed'
          if (s.owner === 'me') {
            const reason = quotaFull ? 'اكتملت حصة المستبينين' : expired ? 'انتهى موعد المشاركة' : 'استُنفد مجمع النقاط التحفيزية'
            notifications.push({ icon: 'mdi-lock-outline', color: 'warning', title: 'أُغلق استبيانك تلقائيًا', body: `«${s.title}» — ${reason}.`, category: 'system', actionTo: `/surveys/${s.id}/admin`, actionLabel: 'عرض النتائج' })
          }
        }
      }
    }
  }
  syncLifecycle()

  // ===== قائمة المستبينين =====
  let nextInviteeId = 900
  /** استيراد صفوف من شيت (CSV): كل صف اسم + بريد/جوال */
  function importInvitees(surveyId: number, rows: { name: string, contact: string }[], source: SurveyInvitee['source']): number {
    const s = byId(surveyId)
    if (!s)
      return 0
    let added = 0
    for (const r of rows) {
      const name = r.name.trim()
      const contact = r.contact.trim()
      if (!name || !contact || s.invitees.some(i => i.contact === contact))
        continue // تخطي المكرر والفارغ
      s.invitees.push({ id: nextInviteeId++, name, contact, source, status: 'pending' })
      added++
    }
    return added
  }
  function removeInvitee(surveyId: number, inviteeId: number) {
    const s = byId(surveyId)
    if (s)
      s.invitees = s.invitees.filter(i => i.id !== inviteeId)
  }
  /** إرسال الدعوات للمعلّقين — وتُحاكى استجابة بعضهم لإبقاء العرض حيًّا */
  function inviteAll(surveyId: number): number {
    const s = byId(surveyId)
    if (!s)
      return 0
    const pending = s.invitees.filter(i => i.status === 'pending')
    pending.forEach(i => (i.status = 'invited'))
    if (pending.length) {
      useNotificationsStore().push({
        icon: 'mdi-email-fast-outline',
        color: 'info',
        title: `أُرسلت ${pending.length} دعوة مشاركة`,
        body: `«${s.title}» — ستصلك الاستجابات تباعًا.`,
        category: 'system',
        actionTo: `/surveys/${surveyId}/admin`,
        actionLabel: 'متابعة الاستجابات',
      })
      // محاكاة: ثلثا المدعوين يستجيبون تباعًا
      const responders = pending.filter((_, idx) => idx % 3 !== 2)
      responders.forEach((inv, idx) => {
        setTimeout(() => {
          const sv = byId(surveyId)
          if (!sv || sv.status !== 'active')
            return
          const ok = submitResponse(surveyId, Object.fromEntries(sv.questions.map(q => [q.id, sampleAnswer(q, idx + sv.invitees.length)])), {
            source: inv.source,
            durationSec: 95 + idx * 21,
          })
          if (ok) {
            const cur = sv.invitees.find(i => i.id === inv.id)
            if (cur)
              cur.status = 'responded'
          }
        }, 1500 * (idx + 1))
      })
    }
    return pending.length
  }

  /** لوحة قياس الإدارة: الحصة والمجمع وقُمع الدعوات والمهل */
  function adminFor(surveyId: number) {
    const s = byId(surveyId)
    if (!s)
      return null
    const rs = responsesFor(surveyId)
    const limit = s.settings.responseLimit
    const budget = s.settings.rewardBudget
    const today = new Date().toISOString().slice(0, 10)
    const daysLeft = s.settings.closesAt
      ? Math.max(0, Math.ceil((new Date(s.settings.closesAt).getTime() - new Date(today).getTime()) / 86400000))
      : null
    return {
      quota: { used: rs.length, limit, pct: limit ? Math.min(100, Math.round((rs.length / limit) * 100)) : null },
      budget: { spent: s.rewardsSpent, total: budget, pct: budget ? Math.min(100, Math.round((s.rewardsSpent / budget) * 100)) : null },
      invitees: {
        total: s.invitees.length,
        pending: s.invitees.filter(i => i.status === 'pending').length,
        invited: s.invitees.filter(i => i.status === 'invited').length,
        responded: s.invitees.filter(i => i.status === 'responded').length,
      },
      daysLeft,
      startsAt: s.settings.startsAt,
    }
  }

  /** استلام استجابة حقيقية (من صفحة الإجابة الداخلية أو رابط المشاركة الخارجي) */
  function submitResponse(surveyId: number, answers: Record<number, AnswerValue>, meta: { source: 'internal' | 'external', durationSec: number, completed?: boolean, mine?: boolean }): boolean {
    syncLifecycle() // قد يفعّل مجدولًا حان موعده أو يغلق منتهيًا قبل القبول
    const s = byId(surveyId)
    if (!s || s.status !== 'active')
      return false
    const limit = s.settings.responseLimit
    if (limit && responsesFor(surveyId).length >= limit)
      return false
    if (meta.mine && hasParticipated(surveyId))
      return false // مشاركة واحدة لكل مستخدم
    // حد القيمة: مجمع النقاط لا يغطي مكافأة مشارك جديد → يُغلق الاستبيان ولا تُقبل الاستجابة
    if (s.settings.rewardBudget != null && s.settings.rewardPoints > 0 && !meta.mine
      && s.rewardsSpent + s.settings.rewardPoints > s.settings.rewardBudget) {
      s.status = 'closed'
      useNotificationsStore().push({
        icon: 'mdi-lock-outline',
        color: 'warning',
        title: 'أُغلق استبيانك تلقائيًا',
        body: `«${s.title}» — استُنفد مجمع النقاط التحفيزية.`,
        category: 'system',
        actionTo: `/surveys/${s.id}/admin`,
        actionLabel: 'عرض النتائج',
      })
      return false
    }
    responses.value.push({
      id: nextResponseId++,
      surveyId,
      source: meta.source,
      at: new Date().toISOString().slice(0, 10),
      durationSec: meta.durationSec,
      completed: meta.completed ?? true,
      mine: meta.mine,
      answers,
    })

    const reward = s.settings.rewardPoints
    const notifications = useNotificationsStore()
    if (s.owner === 'me') {
      // استجابة على استبياني: أُشعَر بها، وتُخصم مكافأة المشارك من محفظتي
      notifications.push({
        icon: 'mdi-poll',
        color: 'secondary',
        title: 'استجابة جديدة على استبيانك',
        body: `«${s.title}» — عبر ${meta.source === 'external' ? 'الرابط الخارجي' : 'المنصة'}`,
        category: 'system',
      })
      if (reward > 0 && !meta.mine) {
        const paid = useGamificationStore().spend(reward)
        if (paid)
          s.rewardsSpent += reward
        notifications.push({
          icon: 'mdi-wallet-outline',
          color: paid ? 'warning' : 'error',
          title: paid ? `خُصم ${reward} نقطة مكافأة مشارك` : 'رصيد نقاطك لا يغطي مكافأة المشارك',
          body: `«${s.title}»`,
          category: 'system',
        })
      }
    }
    else if (reward > 0 && meta.mine) {
      // شاركتُ في استبيان جهة أخرى: أكسب المكافأة من محفظة منشئه
      useGamificationStore().award(reward, `مشاركة في استبيان «${s.title}»`)
    }
    return true
  }

  /** محاكاة مستجيبين خارجيين — تُبقي حلقة العرض حيّة قبل ربط الباك-إند */
  function simulateResponses(surveyId: number, count = 5) {
    const s = byId(surveyId)
    if (!s)
      return
    const base = responsesFor(surveyId).length
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        submitResponse(surveyId, Object.fromEntries(s.questions.map(q => [q.id, sampleAnswer(q, base + i)])), {
          source: 'external',
          durationSec: 80 + (base + i) * 17,
        })
      }, 1200 * (i + 1))
    }
  }

  return {
    surveys, responses,
    byId, byToken, responsesFor, statsFor, adminFor,
    add, update, remove, duplicate, setStatus, syncLifecycle,
    importInvitees, removeInvitee, inviteAll,
    submitResponse, simulateResponses,
    plan, mySurveys, canCreate, upgradePlan,
    participatable, hasParticipated,
  }
})

// AI-style question generation by survey type — now spanning the 10 types
export function generateQuestions(surveyType: string): SurveyQuestion[] {
  const bank: Record<string, SurveyQuestion[]> = {
    'رضا المرشح': [
      { id: 1, text: 'كيف تقيّم تجربتك عمومًا؟', type: 'rating', required: true },
      { id: 2, text: 'ما مدى احتمال أن توصي بنا؟', type: 'nps', required: true },
      { id: 3, text: 'هل كانت عملية التوظيف واضحة؟', type: 'single', options: ['واضحة تمامًا', 'نوعًا ما', 'غير واضحة'] },
      { id: 4, text: 'قيّم الجوانب التالية', type: 'matrix', rows: ['سرعة الرد', 'وضوح الفرص', 'التواصل'] },
      { id: 5, text: 'ما الذي يمكن تحسينه؟', type: 'longtext' },
    ],
    'تقييم وظيفي': [
      { id: 1, text: 'كيف تقيّم أداء المرشح عمومًا؟', type: 'rating', required: true },
      { id: 2, text: 'رتّب كفاءاته حسب القوة', type: 'ranking', options: ['تقني', 'تواصل', 'قيادة', 'التزام'] },
      { id: 3, text: 'قيّم المهارات التالية', type: 'matrix', rows: ['الجودة', 'السرعة', 'التعاون'] },
      { id: 4, text: 'ما أبرز نقاط قوته؟', type: 'text' },
      { id: 5, text: 'هل توصي بتوظيفه؟', type: 'single', options: ['نعم بقوة', 'نعم', 'لا'] },
    ],
    'احتياجات السوق': [
      { id: 1, text: 'رتّب المهارات الأكثر طلبًا لديكم', type: 'ranking', options: ['تطوير', 'تصميم', 'بيانات', 'تسويق'] },
      { id: 2, text: 'ما متوسط الرواتب المتوقعة؟', type: 'dropdown', options: ['أقل من 8 آلاف', '8-15 ألفًا', '15-25 ألفًا', 'أكثر من 25'] },
      { id: 3, text: 'كيف تقيّم توفّر المواهب؟', type: 'scale', scaleMin: 'نادر', scaleMax: 'متوفر' },
      { id: 4, text: 'ما القطاعات التي توظّفون لها؟', type: 'multiple', options: ['تقنية', 'صحة', 'تعليم', 'تجزئة'] },
    ],
  }
  return bank[surveyType] ?? [
    { id: 1, text: 'ما مدى رضاك عن الخدمة؟', type: 'rating' },
    { id: 2, text: 'ما مدى احتمال أن توصي بنا؟', type: 'nps' },
    { id: 3, text: 'ما اقتراحاتك للتحسين؟', type: 'longtext' },
  ]
}

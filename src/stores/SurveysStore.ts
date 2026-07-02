import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
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
  responseLimit: number | null
  closesAt: string | null // ISO date
}

export const DEFAULT_SETTINGS: SurveySettings = {
  welcomeMessage: 'نقدّر مشاركتك — إجاباتك تساعدنا على التحسين.',
  thanksMessage: 'شكرًا لك! تم استلام إجاباتك بنجاح.',
  anonymous: true,
  showProgress: true,
  shuffleQuestions: false,
  oneQuestionPerPage: true,
  responseLimit: null,
  closesAt: null,
}

export type SurveyStatus = 'draft' | 'active' | 'closed'

export interface Survey {
  id: number
  title: string
  type: string
  audience: 'internal' | 'external' | 'both'
  token: string // external share link key
  questions: SurveyQuestion[]
  settings: SurveySettings
  status: SurveyStatus
  createdAt: string
}

export type AnswerValue = string | number | string[] | Record<string, number>

export interface SurveyResponse {
  id: number
  surveyId: number
  source: 'internal' | 'external'
  at: string
  durationSec: number
  completed: boolean
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
  { id: 1, title: 'رضا المرشحين - يونيو', type: 'رضا المرشح', audience: 'both', token: 'demo01sat', questions: seedQuestions, settings: { ...DEFAULT_SETTINGS }, status: 'active', createdAt: '2026-06-20' },
  { id: 2, title: 'احتياجات سوق التقنية', type: 'احتياجات السوق', audience: 'external', token: 'demo02mkt', questions: [
    { id: 1, text: 'ما المهارات الأكثر طلبًا لديكم؟', type: 'ranking', options: ['تطوير', 'تصميم', 'بيانات', 'تسويق'] },
    { id: 2, text: 'ما متوسط الرواتب المتوقعة؟', type: 'dropdown', options: ['أقل من 8 آلاف', '8-15 ألفًا', '15-25 ألفًا', 'أكثر من 25 ألفًا'] },
    { id: 3, text: 'كيف تقيّم توفّر المواهب؟', type: 'scale', scaleMin: 'نادر جدًا', scaleMax: 'متوفر بكثرة' },
  ], settings: { ...DEFAULT_SETTINGS, anonymous: false }, status: 'active', createdAt: '2026-06-12' },
]

function load(): Survey[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return seed.map(s => structuredClone(s))
  try {
    const list = JSON.parse(raw) as (Survey & { responses?: number })[]
    // Migration from the legacy flat shape (no token/settings/questions typing)
    return list.map(s => ({
      ...s,
      token: s.token ?? makeToken(),
      settings: { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) },
      questions: s.questions ?? [],
      audience: (['internal', 'external', 'both'].includes(s.audience as string) ? s.audience : 'both') as Survey['audience'],
      status: (s.status === 'draft' ? 'draft' : s.status) ?? 'draft',
      createdAt: s.createdAt ?? '2026-06-01',
    }))
  }
  catch {
    return seed.map(s => structuredClone(s))
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

  watch(surveys, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })
  watch(responses, val => localStorage.setItem(RESPONSES_KEY, JSON.stringify(val)), { deep: true })

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

  function add(survey: Omit<Survey, 'id' | 'token' | 'createdAt'>): Survey {
    const s: Survey = { ...survey, id: nextId++, token: makeToken(), createdAt: new Date().toISOString().slice(0, 10) }
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
    const plain = JSON.parse(JSON.stringify({ title: s.title, type: s.type, audience: s.audience, questions: s.questions, settings: s.settings }))
    return add({ ...plain, title: `${s.title} (نسخة)`, status: 'draft' })
  }

  function setStatus(id: number, status: SurveyStatus) {
    const s = byId(id)
    if (s)
      s.status = status
  }

  /** استلام استجابة حقيقية (من صفحة الإجابة الداخلية أو رابط المشاركة الخارجي) */
  function submitResponse(surveyId: number, answers: Record<number, AnswerValue>, meta: { source: 'internal' | 'external', durationSec: number, completed?: boolean }): boolean {
    const s = byId(surveyId)
    if (!s || s.status !== 'active')
      return false
    const limit = s.settings.responseLimit
    if (limit && responsesFor(surveyId).length >= limit)
      return false
    responses.value.push({
      id: nextResponseId++,
      surveyId,
      source: meta.source,
      at: new Date().toISOString().slice(0, 10),
      durationSec: meta.durationSec,
      completed: meta.completed ?? true,
      answers,
    })
    useNotificationsStore().push({
      icon: 'mdi-poll',
      color: 'secondary',
      title: 'استجابة جديدة على استبيانك',
      body: `«${s.title}» — عبر ${meta.source === 'external' ? 'الرابط الخارجي' : 'المنصة'}`,
      category: 'system',
    })
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
    byId, byToken, responsesFor, statsFor,
    add, update, remove, duplicate, setStatus,
    submitResponse, simulateResponses,
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

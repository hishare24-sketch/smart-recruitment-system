import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { ai } from '@/services/ai'

export type InterviewerType = 'technical' | 'leadership' | 'behavioral' | 'specialist'
export type MarketInterviewKind = 'skills' | 'level' | 'leadership' | 'behavioral' | 'comprehensive'
export type BookingStatus = 'requested' | 'scheduled' | 'completed' | 'cancelled'

export interface EvaluationReport {
  level: string
  overall: number // 0-100
  competencies: { name: string, score: number }[]
  strengths: string[]
  improvements: string[]
  recommendation: string
  trustGain: number
}

export interface Interviewer {
  id: number
  name: string
  initial: string
  type: InterviewerType
  title: string
  bio: string
  specialties: string[]
  field: string
  rating: number // 0-5
  reviewsCount: number
  sessionsCount: number
  priceMin: number
  priceMax: number
  availability: string[]
  languages: string[]
  verified: boolean
}

export interface Booking {
  id: number
  interviewerId: number
  interviewerName: string
  kind: MarketInterviewKind
  datetime: string
  price: number
  status: BookingStatus
  report?: EvaluationReport
  ratingGiven?: number
}

export const INTERVIEWER_TYPE_META: Record<InterviewerType, { label: string, icon: string, color: string }> = {
  technical: { label: 'خبير تقني', icon: 'mdi-code-tags', color: 'primary' },
  leadership: { label: 'خبير قيادي/إداري', icon: 'mdi-account-tie', color: 'accent' },
  behavioral: { label: 'خبير نفسي/سلوكي', icon: 'mdi-brain', color: 'secondary' },
  specialist: { label: 'خبير مجال محدد', icon: 'mdi-star-circle-outline', color: 'info' },
}

export const KIND_META: Record<MarketInterviewKind, { label: string, desc: string, minutes: string }> = {
  skills: { label: 'تقييم مهارات تقنية', desc: 'اختبار عملي ونظري في مجال محدد', minutes: '45–60 د' },
  level: { label: 'تحديد المستوى', desc: 'تقييم شامل لتحديد مستواك', minutes: '30–45 د' },
  leadership: { label: 'مقابلة قيادية', desc: 'دراسات حالة وسيناريوهات قيادية', minutes: '60–90 د' },
  behavioral: { label: 'مقابلة شخصية/سلوكية', desc: 'تحليل الشخصية والذكاء العاطفي', minutes: '30–45 د' },
  comprehensive: { label: 'مقابلة شاملة', desc: 'حزمة تقنية + سلوكية + قيادية', minutes: '90–120 د' },
}

export const BOOKING_STATUS_META: Record<BookingStatus, { label: string, color: string }> = {
  requested: { label: 'بانتظار القبول', color: 'warning' },
  scheduled: { label: 'مجدولة', color: 'info' },
  completed: { label: 'منفّذة', color: 'success' },
  cancelled: { label: 'ملغاة', color: 'medium-emphasis' },
}

const INTERVIEWERS_SEED: Interviewer[] = [
  {
    id: 1, name: 'م. خالد الشمري', initial: 'خ', type: 'technical', title: 'مهندس برمجيات أول · خبير Frontend',
    bio: 'خبرة 11 سنة في هندسة الواجهات وأنظمة قابلة للتوسّع. أجريت أكثر من 200 مقابلة تقييمية.',
    specialties: ['Vue.js', 'TypeScript', 'Architecture', 'تطوير الويب'], field: 'تطوير الويب',
    rating: 4.9, reviewsCount: 128, sessionsCount: 214, priceMin: 120, priceMax: 300,
    availability: ['الأحد', 'الثلاثاء', 'الخميس'], languages: ['العربية', 'English'], verified: true,
  },
  {
    id: 2, name: 'د. ريم القحطاني', initial: 'ر', type: 'leadership', title: 'مستشارة قيادة وموارد بشرية · PMP',
    bio: 'خبيرة قيادة وتطوير مؤسسي بخبرة 14 سنة في شركات كبرى، متخصصة في تقييم الكفاءات القيادية.',
    specialties: ['القيادة', 'الإدارة', 'التخطيط الاستراتيجي'], field: 'الإدارة',
    rating: 4.8, reviewsCount: 96, sessionsCount: 150, priceMin: 200, priceMax: 500,
    availability: ['الإثنين', 'الأربعاء'], languages: ['العربية', 'English'], verified: true,
  },
  {
    id: 3, name: 'أ. سلمى العنزي', initial: 'س', type: 'behavioral', title: 'أخصائية تقييم نفسي وذكاء عاطفي',
    bio: 'مرخّصة في التقييم النفسي المهني، متخصصة في تحليل الشخصية والتوافق الثقافي للفرق.',
    specialties: ['الذكاء العاطفي', 'تحليل الشخصية', 'التواصل'], field: 'السلوكي',
    rating: 4.7, reviewsCount: 74, sessionsCount: 110, priceMin: 60, priceMax: 200,
    availability: ['الأحد', 'الأربعاء', 'الخميس'], languages: ['العربية'], verified: true,
  },
  {
    id: 4, name: 'م. فهد الدوسري', initial: 'ف', type: 'technical', title: 'مهندس DevOps وأمن سيبراني',
    bio: 'خبرة 8 سنوات في البنية التحتية والأمن السيبراني، أجري مقابلات تقنية معمّقة.',
    specialties: ['DevOps', 'الأمن السيبراني', 'Cloud'], field: 'البنية التحتية',
    rating: 4.6, reviewsCount: 51, sessionsCount: 68, priceMin: 100, priceMax: 280,
    availability: ['الثلاثاء', 'الخميس'], languages: ['العربية', 'English'], verified: true,
  },
  {
    id: 5, name: 'أ. نورة المطيري', initial: 'ن', type: 'specialist', title: 'خبيرة تسويق رقمي ونمو',
    bio: 'متخصصة في التسويق الرقمي والنمو بخبرة 9 سنوات وحملات لعلامات كبرى.',
    specialties: ['التسويق الرقمي', 'النمو', 'المحتوى'], field: 'التسويق',
    rating: 4.8, reviewsCount: 63, sessionsCount: 89, priceMin: 80, priceMax: 260,
    availability: ['الأحد', 'الإثنين', 'الأربعاء'], languages: ['العربية', 'English'], verified: true,
  },
]

const BOOKINGS_STORAGE = 'interviewerBookings'

const BOOKINGS_SEED: Booking[] = [
  {
    id: 1, interviewerId: 3, interviewerName: 'أ. سلمى العنزي', kind: 'behavioral',
    datetime: '2026-06-20 · 18:00', price: 120, status: 'completed', ratingGiven: 5,
    report: {
      level: 'متقدم', overall: 84,
      competencies: [{ name: 'التواصل', score: 88 }, { name: 'الذكاء العاطفي', score: 82 }, { name: 'حل النزاعات', score: 80 }],
      strengths: ['تواصل واضح ومنظّم', 'وعي ذاتي عالٍ'],
      improvements: ['تعزيز الحزم في المواقف الصعبة'],
      recommendation: 'مرشح متوازن سلوكيًا — مناسب لأدوار تتطلب تعاونًا عاليًا.',
      trustGain: 8,
    },
  },
  {
    id: 2, interviewerId: 1, interviewerName: 'م. خالد الشمري', kind: 'skills',
    datetime: '2026-07-03 · 20:00', price: 180, status: 'scheduled',
  },
]

function loadBookings(): Booking[] {
  const raw = localStorage.getItem(BOOKINGS_STORAGE)
  if (!raw)
    return BOOKINGS_SEED.map(b => ({ ...b }))
  try {
    return JSON.parse(raw) as Booking[]
  }
  catch {
    return BOOKINGS_SEED.map(b => ({ ...b }))
  }
}

let nextBookingId = 700

export const useInterviewersStore = defineStore('interviewers', () => {
  const interviewers = ref<Interviewer[]>(INTERVIEWERS_SEED.map(i => ({ ...i })))
  const bookings = ref<Booking[]>(loadBookings())

  watch(bookings, val => localStorage.setItem(BOOKINGS_STORAGE, JSON.stringify(val)), { deep: true })

  const fields = computed(() => [...new Set(interviewers.value.map(i => i.field))])

  function getById(id: number) {
    return interviewers.value.find(i => i.id === id)
  }

  // AI-ranked top interviewers for a candidate profile
  function recommendedFor(candidate: { field: string, skills: string[] }) {
    const ranked = ai.recommendInterviewers(
      candidate,
      interviewers.value.map(i => ({ id: i.id, type: i.type, specialties: i.specialties })),
    )
    return ranked
      .map(r => ({ interviewer: getById(r.id)!, match: r.match, reason: r.reason }))
      .filter(x => x.interviewer)
  }
  function matchFor(candidate: { field: string, skills: string[] }, id: number) {
    const iv = getById(id)
    if (!iv)
      return 0
    return ai.interviewerMatch(candidate, { type: iv.type, specialties: iv.specialties })
  }

  function book(interviewer: Interviewer, kind: MarketInterviewKind, datetime: string, price: number): number {
    const id = nextBookingId++
    bookings.value.unshift({
      id, interviewerId: interviewer.id, interviewerName: interviewer.name,
      kind, datetime, price, status: 'requested',
    })
    return id
  }
  function rateBooking(id: number, stars: number) {
    const b = bookings.value.find(x => x.id === id)
    if (b)
      b.ratingGiven = stars
  }

  const completedReports = computed(() => bookings.value.filter(b => b.status === 'completed' && b.report))

  // Trust contribution from certified-interviewer reports (0-100)
  const trustValue = computed(() => {
    const reports = completedReports.value
    if (!reports.length)
      return 0
    return Math.round(reports.reduce((s, b) => s + (b.report?.overall ?? 0), 0) / reports.length)
  })

  return {
    interviewers, bookings, fields,
    getById, recommendedFor, matchFor, book, rateBooking,
    completedReports, trustValue,
  }
})

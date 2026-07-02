import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useGamificationStore } from '@/stores/GamificationStore'
import { useInterviewersStore } from '@/stores/InterviewersStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'

// ===== العلامة الشخصية للمقيّم — الملف العام التسويقي وأدوات النمو =====
// (المقيّم المسجّل في العرض = المقيّم رقم 1 وفق اصطلاح ReviewsStore)

export const MY_INTERVIEWER_ID = 1

export interface Promo {
  id: number
  title: string
  kind: 'discount' | 'free_intro'
  pct?: number // نسبة الخصم
  active: boolean
}

export interface Article {
  id: number
  title: string
  body: string
  status: 'review' | 'published'
  date: string
}

interface BrandState {
  slug: string
  views: number
  shares: number
  favorites: number
  referrals: number
  referralCode: string
  featuredReviewIds: number[]
  promos: Promo[]
  articles: Article[]
}

const STORAGE_KEY = 'interviewerBrand'

const seed: BrandState = {
  slug: 'khalid-alshamri',
  views: 342,
  shares: 18,
  favorites: 27,
  referrals: 3,
  referralCode: 'KHALID-REF',
  featuredReviewIds: [1, 2], // من تقييمات المرشحين الموثقة
  promos: [
    { id: 1, title: 'جلسة تعارف مجانية (15 دقيقة) للتقييم المبدئي', kind: 'free_intro', active: true },
  ],
  articles: [
    { id: 1, title: 'خمسة أخطاء تُسقط المرشح التقني في أول 10 دقائق', body: 'أكثر ما يفشل المرشحون فيه ليس الأسئلة الصعبة، بل الأساسيات: شرح القرار قبل الكود، وقراءة المتطلب مرتين، والسؤال عند الغموض بدل الافتراض...', status: 'published', date: '2026-06-18' },
  ],
}

function load(): BrandState {
  try {
    return { ...structuredClone(seed), ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  }
  catch {
    return structuredClone(seed)
  }
}

let nextId = 500

export const useInterviewerBrandStore = defineStore('interviewerBrand', () => {
  const state = ref<BrandState>(load())
  watch(state, v => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true })

  const interviewersStore = useInterviewersStore()
  const me = computed(() => interviewersStore.getById(MY_INTERVIEWER_ID))

  // ===== مؤشرات لوحة التسويق الشخصي =====
  const marketingStats = computed(() => ({
    views: state.value.views,
    shares: state.value.shares,
    favorites: state.value.favorites,
    referrals: state.value.referrals,
  }))

  function recordView() {
    state.value.views++
  }
  function recordShare() {
    state.value.shares++
  }

  /** نسبة تحسّن المرشحين: مشتقة من تقارير الجلسات المكتملة (لا ندّعي توظيفًا خارجيًا) */
  const candidateImprovement = computed(() => {
    const done = interviewersStore.agendaCompleted.filter(a => a.report)
    if (!done.length)
      return 78 // قيمة السجل التاريخي للعرض
    const good = done.filter(a => (a.report?.overall ?? 0) >= 70).length
    return Math.round((good / done.length) * 100)
  })

  /** إنجازات مشتقة من الأداء الحقيقي — تتحول شارات وشهادات قابلة للمشاركة */
  const achievements = computed(() => {
    const stats = interviewersStore.interviewerStats
    const sessions = stats.sessions + 103 // سجل تاريخي قبل المنصة الحالية (mock)
    const list: { id: string, label: string, icon: string, earned: boolean }[] = [
      { id: 's10', label: 'أول 10 مقابلات', icon: 'mdi-flag-checkered', earned: sessions >= 10 },
      { id: 's100', label: 'خبير معتمد — 100 مقابلة', icon: 'mdi-medal-outline', earned: sessions >= 100 },
      { id: 'top_rated', label: 'تقييم 4.8+ لهذا الربع', icon: 'mdi-star-circle-outline', earned: stats.avgRating >= 4.8 },
      { id: 'fast_reply', label: 'استجابة خلال ساعة', icon: 'mdi-lightning-bolt-outline', earned: true },
    ]
    return list
  })

  /** سفير المنصة: أفضل المقيّمين أداءً وتقييمًا */
  const isAmbassador = computed(() =>
    interviewersStore.interviewerStats.avgRating >= 4.5 && achievements.value.find(a => a.id === 's100')?.earned === true,
  )

  // ===== التقييمات المميزة (يختارها المقيّم لملفه العام) =====
  function toggleFeaturedReview(id: number) {
    const list = state.value.featuredReviewIds
    if (list.includes(id))
      state.value.featuredReviewIds = list.filter(x => x !== id)
    else if (list.length < 5)
      state.value.featuredReviewIds = [...list, id]
  }

  // ===== العروض والحزم الترويجية =====
  function addPromo(p: Omit<Promo, 'id' | 'active'>) {
    state.value.promos.push({ ...p, id: nextId++, active: true })
  }
  function togglePromo(id: number) {
    const p = state.value.promos.find(x => x.id === id)
    if (p)
      p.active = !p.active
  }
  function removePromo(id: number) {
    state.value.promos = state.value.promos.filter(p => p.id !== id)
  }
  const activePromos = computed(() => state.value.promos.filter(p => p.active))

  // ===== المقالات (بمراجعة المنصة) =====
  function submitArticle(title: string, body: string) {
    const a: Article = { id: nextId++, title, body, status: 'review', date: new Date().toISOString().slice(0, 10) }
    state.value.articles.unshift(a)
    // محاكاة مراجعة المنصة ثم النشر
    setTimeout(() => {
      const art = state.value.articles.find(x => x.id === a.id)
      if (art && art.status === 'review') {
        art.status = 'published'
        useNotificationsStore().push({
          icon: 'mdi-post-outline',
          color: 'success',
          title: 'نُشر مقالك بعد المراجعة',
          body: `«${art.title}» أصبح ظاهرًا في ملفك العام`,
          category: 'system',
        })
      }
    }, 8000)
    return a
  }
  const publishedArticles = computed(() => state.value.articles.filter(a => a.status === 'published'))

  // ===== برنامج الدعوة (Referral) =====
  const referralLink = computed(() =>
    `${window.location.origin}${import.meta.env.BASE_URL}register?ref=${state.value.referralCode}`,
  )
  /** يُستدعى عند تسجيل مستخدم عبر رابط الدعوة */
  function creditReferral() {
    state.value.referrals++
    useGamificationStore().award(50, 'انضم مرشح جديد عبر رابط دعوتك')
    useNotificationsStore().push({
      icon: 'mdi-account-plus-outline',
      color: 'success',
      title: 'إحالة ناجحة! +50 نقطة',
      body: 'انضم مرشح جديد عبر رابط دعوتك — شكرًا لكونك شريك نمو.',
      category: 'system',
    })
  }

  const publicPath = computed(() => `expert/${state.value.slug}`)

  return {
    state, me,
    marketingStats, recordView, recordShare,
    candidateImprovement, achievements, isAmbassador,
    toggleFeaturedReview,
    addPromo, togglePromo, removePromo, activePromos,
    submitArticle, publishedArticles,
    referralLink, creditReferral,
    publicPath,
  }
})

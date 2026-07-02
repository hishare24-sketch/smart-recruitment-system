import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/AuthStore'

// Real gamification engine: points are awarded on genuine actions across the app,
// unlocking badges, advancing weekly challenges, and keeping a daily streak.

export type GameAction
  = 'profileComplete' | 'skill' | 'aiInterview' | 'expertInterview'
    | 'recommendation' | 'receiveRecommendation' | 'rateInterviewer'
    | 'project' | 'assessment' | 'peerRequest'
    | 'postOpportunity' | 'reviewCandidate'
    | 'roleActivated'

const ACTION_POINTS: Record<GameAction, number> = {
  profileComplete: 50,
  skill: 20,
  aiInterview: 30,
  expertInterview: 50,
  recommendation: 40,
  receiveRecommendation: 30,
  rateInterviewer: 20,
  project: 60,
  assessment: 30,
  peerRequest: 10,
  postOpportunity: 40,
  reviewCandidate: 15,
  roleActivated: 50,
}
const DAILY_LOGIN_POINTS = 5

export interface Counters {
  skills: number
  interviews: number
  recommendations: number
  assessments: number
  peerRequests: number
  loginDays: number
}

export interface Challenge {
  id: string
  title: string
  metric: keyof Counters
  target: number
  progress: number
  reward: number
  done: boolean
}

export interface Badge {
  id: string
  name: string
  icon: string
  desc: string
}

export interface Tier {
  id: string
  name: string
  color: string
  min: number
}

export const TIERS: Tier[] = [
  { id: 'bronze', name: 'برونزي', color: '#cd7f32', min: 0 },
  { id: 'silver', name: 'فضي', color: '#9ca3af', min: 300 },
  { id: 'gold', name: 'ذهبي', color: '#f59e0b', min: 800 },
  { id: 'platinum', name: 'بلاتيني', color: '#7c3aed', min: 1500 },
]

// Badge catalogue — condition evaluated against live state (not persisted)
const BADGE_CATALOG: (Badge & { check: (s: { points: number, counters: Counters, streak: number, activeRoles: number }) => boolean })[] = [
  { id: 'newcomer', name: 'أول خطوة', icon: 'mdi-flag-outline', desc: 'ابدأ رحلتك بأول 50 نقطة', check: s => s.points >= 50 },
  { id: 'skill_builder', name: 'باني المهارات', icon: 'mdi-hammer-wrench', desc: 'أضف 5 مهارات موثّقة', check: s => s.counters.skills >= 5 },
  { id: 'interviewer_pro', name: 'محاور نشط', icon: 'mdi-account-tie-voice', desc: 'أنجز 3 مقابلات', check: s => s.counters.interviews >= 3 },
  { id: 'trusted_voice', name: 'موصٍ موثوق', icon: 'mdi-comment-check-outline', desc: 'اكتب 3 توصيات', check: s => s.counters.recommendations >= 3 },
  { id: 'week_streak', name: 'أسبوع متواصل', icon: 'mdi-fire', desc: 'حافظ على سلسلة 7 أيام', check: s => s.streak >= 7 },
  { id: 'point_master', name: 'سيّد النقاط', icon: 'mdi-crown-outline', desc: 'اجمع 500 نقطة', check: s => s.points >= 500 },
  { id: 'multi_expert', name: 'خبير متعدد', icon: 'mdi-account-group-outline', desc: 'فعّل دورين مهنيين أو أكثر', check: s => s.activeRoles >= 2 },
]
export const ALL_BADGES: Badge[] = BADGE_CATALOG.map(({ id, name, icon, desc }) => ({ id, name, icon, desc }))

const CHALLENGES_SEED: Challenge[] = [
  { id: 'c1', title: 'أضف 5 مهارات موثّقة', metric: 'skills', target: 5, progress: 2, reward: 80, done: false },
  { id: 'c2', title: 'أنجز مقابلتين هذا الأسبوع', metric: 'interviews', target: 2, progress: 1, reward: 120, done: false },
  { id: 'c3', title: 'اكتب توصية لزميل', metric: 'recommendations', target: 1, progress: 0, reward: 60, done: false },
]

const STORAGE = 'gamification'

interface Persisted {
  points: number
  streak: { count: number, last: string }
  counters: Counters
  earnedBadgeIds: string[]
  challenges: Challenge[]
}

const DEFAULT_STATE: Persisted = {
  points: 240,
  streak: { count: 3, last: '' },
  counters: { skills: 2, interviews: 1, recommendations: 1, assessments: 2, peerRequests: 1, loginDays: 5 },
  earnedBadgeIds: ['newcomer'],
  challenges: CHALLENGES_SEED.map(c => ({ ...c })),
}

function load(): Persisted {
  const raw = localStorage.getItem(STORAGE)
  if (!raw)
    return structuredClone(DEFAULT_STATE)
  try {
    return { ...structuredClone(DEFAULT_STATE), ...JSON.parse(raw) }
  }
  catch {
    return structuredClone(DEFAULT_STATE)
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function yesterdayISO() {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
}

export const useGamificationStore = defineStore('gamification', () => {
  const init = load()
  const points = ref(init.points)
  const streak = ref(init.streak)
  const counters = ref<Counters>(init.counters)
  const earnedBadgeIds = ref<string[]>(init.earnedBadgeIds)
  const challenges = ref<Challenge[]>(init.challenges)
  const lastReward = ref<{ points: number, label: string, at: number } | null>(null)
  const lastBadgeId = ref<string | null>(null)

  watch([points, streak, counters, earnedBadgeIds, challenges], () => {
    localStorage.setItem(STORAGE, JSON.stringify({
      points: points.value,
      streak: streak.value,
      counters: counters.value,
      earnedBadgeIds: earnedBadgeIds.value,
      challenges: challenges.value,
    }))
  }, { deep: true })

  // — Derived —
  const tier = computed(() => [...TIERS].reverse().find(t => points.value >= t.min) ?? TIERS[0])
  const nextTier = computed(() => TIERS.find(t => t.min > points.value) ?? null)
  const tierProgress = computed(() => {
    if (!nextTier.value)
      return 100
    const floor = tier.value.min
    return Math.round(((points.value - floor) / (nextTier.value.min - floor)) * 100)
  })
  const pointsToNext = computed(() => (nextTier.value ? nextTier.value.min - points.value : 0))

  const badges = computed(() =>
    ALL_BADGES.map(b => ({ ...b, earned: earnedBadgeIds.value.includes(b.id) })),
  )
  const earnedCount = computed(() => earnedBadgeIds.value.length)

  function recomputeBadges() {
    const snap = {
      points: points.value,
      counters: counters.value,
      streak: streak.value.count,
      activeRoles: useAuthStore().activeRoles.length,
    }
    for (const b of BADGE_CATALOG) {
      if (!earnedBadgeIds.value.includes(b.id) && b.check(snap)) {
        earnedBadgeIds.value.push(b.id)
        lastBadgeId.value = b.id // signals a celebration to the UI
      }
    }
  }

  const METRIC_OF: Partial<Record<GameAction, keyof Counters>> = {
    skill: 'skills',
    aiInterview: 'interviews',
    expertInterview: 'interviews',
    recommendation: 'recommendations',
    assessment: 'assessments',
    peerRequest: 'peerRequests',
  }

  function bumpChallenges(metric: keyof Counters) {
    for (const c of challenges.value) {
      if (c.metric === metric && !c.done) {
        c.progress = Math.min(c.target, c.progress + 1)
        if (c.progress >= c.target) {
          c.done = true
          points.value += c.reward
        }
      }
    }
  }

  // Award points for a genuine action; updates counters, challenges and badges
  function record(action: GameAction, label?: string) {
    points.value += ACTION_POINTS[action]
    lastReward.value = { points: ACTION_POINTS[action], label: label ?? '', at: Date.now() }
    const metric = METRIC_OF[action]
    if (metric) {
      counters.value[metric] += 1
      bumpChallenges(metric)
    }
    recomputeBadges()
  }

  // Wallet-style operations for dynamic amounts (e.g. survey participation rewards)
  function award(amount: number, label: string) {
    if (amount <= 0)
      return
    points.value += amount
    lastReward.value = { points: amount, label, at: Date.now() }
    recomputeBadges()
  }

  function spend(amount: number): boolean {
    if (amount <= 0)
      return true
    if (points.value < amount)
      return false
    points.value -= amount
    return true
  }

  // Daily streak check-in (call once per app open)
  function checkIn() {
    const today = todayISO()
    if (streak.value.last === today)
      return
    if (streak.value.last === yesterdayISO())
      streak.value.count += 1
    else if (streak.value.last !== '')
      streak.value.count = 1
    // '' (seed) keeps the seeded streak intact
    streak.value.last = today
    points.value += DAILY_LOGIN_POINTS
    counters.value.loginDays += 1
    recomputeBadges()
  }

  const activeChallenges = computed(() => challenges.value.filter(c => !c.done))
  const doneChallenges = computed(() => challenges.value.filter(c => c.done))

  // Shared live leaderboard — peers have fixed totals so earning points climbs
  // the user's rank. Single source of truth for every leaderboard in the app.
  const LEADER_PEERS = [
    { name: 'ليان الحربي', initial: 'ل', points: 460 },
    { name: 'محمد القرني', initial: 'م', points: 330 },
    { name: 'سارة الزهراني', initial: 'س', points: 165 },
    { name: 'عبدالله المالكي', initial: 'ع', points: 90 },
    { name: 'نورة المطيري', initial: 'ن', points: 40 },
  ]
  const leaderboard = computed(() =>
    [
      { name: 'أنت', initial: 'أ', points: points.value, you: true },
      ...LEADER_PEERS.map(p => ({ ...p, you: false })),
    ]
      .sort((a, b) => b.points - a.points)
      .map((r, i) => ({ ...r, rank: i + 1 })),
  )
  const myRank = computed(() => leaderboard.value.find(r => r.you)?.rank ?? 0)

  function badgeById(id: string) {
    return ALL_BADGES.find(b => b.id === id) ?? null
  }

  return {
    points, streak, counters, challenges, lastReward, lastBadgeId,
    tier, nextTier, tierProgress, pointsToNext,
    badges, earnedCount, activeChallenges, doneChallenges,
    leaderboard, myRank,
    record, checkIn, badgeById, award, spend,
  }
})

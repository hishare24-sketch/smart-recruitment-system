import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_SETTINGS, DEFAULT_TARGETING, STATUS_TRANSITIONS, generateQuestions, useSurveysStore } from './SurveysStore'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})
afterEach(() => {
  vi.useRealTimers()
})

describe('SurveysStore model', () => {
  it('seeds surveys with tokens, settings and live responses', () => {
    const s = useSurveysStore()
    expect(s.surveys.length).toBeGreaterThanOrEqual(2)
    for (const sv of s.surveys) {
      expect(sv.token).toBeTruthy()
      expect(sv.settings.welcomeMessage).toBeTruthy()
    }
    expect(s.responsesFor(1).length).toBeGreaterThan(0)
    expect(s.byToken(s.surveys[0].token)?.id).toBe(s.surveys[0].id)
  })

  it('computes live stats (responses/completion/avg time/sources)', () => {
    const s = useSurveysStore()
    const st = s.statsFor(1)
    expect(st.responses).toBeGreaterThan(0)
    expect(st.completion).toBeGreaterThan(0)
    expect(st.completion).toBeLessThanOrEqual(100)
    expect(st.internal + st.external).toBe(st.responses)
    expect(st.avgTime).toMatch(/^\d+:\d{2}$/)
  })

  it('adds, duplicates, closes and removes surveys', () => {
    const s = useSurveysStore()
    const created = s.add({ title: 'اختبار', type: 'رضا المرشح', audience: 'both', questions: generateQuestions('رضا المرشح'), settings: { ...DEFAULT_SETTINGS }, status: 'draft', owner: 'me' })
    expect(created.token).toBeTruthy()
    const copy = s.duplicate(created.id)!
    expect(copy.title).toContain('نسخة')
    expect(copy.token).not.toBe(created.token)
    // الإغلاق يمر عبر التفعيل — القفز من المسودة مباشرة ممنوع في دورة الحياة
    s.setStatus(created.id, 'active')
    s.setStatus(created.id, 'closed')
    expect(s.byId(created.id)!.status).toBe('closed')
    s.remove(created.id)
    expect(s.byId(created.id)).toBeUndefined()
  })
})

describe('SurveysStore responses', () => {
  it('accepts a response for an active survey and rejects closed/limited ones', () => {
    const s = useSurveysStore()
    const before = s.responsesFor(1).length
    expect(s.submitResponse(1, { 1: 5 }, { source: 'external', durationSec: 60 })).toBe(true)
    expect(s.responsesFor(1).length).toBe(before + 1)

    s.setStatus(1, 'closed')
    expect(s.submitResponse(1, { 1: 4 }, { source: 'external', durationSec: 60 })).toBe(false)

    s.setStatus(1, 'active')
    s.byId(1)!.settings.responseLimit = s.responsesFor(1).length
    expect(s.submitResponse(1, { 1: 4 }, { source: 'external', durationSec: 60 })).toBe(false)
  })

  it('simulates external respondents over time', () => {
    vi.useFakeTimers()
    const s = useSurveysStore()
    const before = s.responsesFor(2).length
    s.simulateResponses(2, 3)
    vi.advanceTimersByTime(5000)
    expect(s.responsesFor(2).length).toBe(before + 3)
    expect(s.responsesFor(2).slice(-1)[0].source).toBe('external')
  })
})

describe('SurveysStore participation & rewards', () => {
  it('persists migration tokens immediately so share links survive reloads', () => {
    localStorage.setItem('surveys', JSON.stringify([
      { id: 9, title: 'قديم', type: 'رضا المرشح', audience: 'داخل المنصة', questions: [], status: 'active' },
    ]))
    setActivePinia(createPinia())
    useSurveysStore()
    const stored = JSON.parse(localStorage.getItem('surveys')!)
    const legacy = stored.find((s: { id: number }) => s.id === 9)
    expect(legacy.token).toBeTruthy()
    // A "reload" (fresh pinia) must resolve the SAME token
    setActivePinia(createPinia())
    const s2 = useSurveysStore()
    expect(s2.byToken(legacy.token)?.id).toBe(9)
  })

  it('appends platform surveys for participation and lists them', () => {
    const s = useSurveysStore()
    expect(s.participatable.length).toBeGreaterThanOrEqual(2)
    expect(s.participatable.every(x => x.owner === 'platform')).toBe(true)
    expect(s.mySurveys.every(x => x.owner === 'me')).toBe(true)
  })

  it('awards reward points on my participation and blocks double participation', async () => {
    const { useGamificationStore } = await import('./GamificationStore')
    const s = useSurveysStore()
    const g = useGamificationStore()
    const target = s.participatable.find(x => x.settings.rewardPoints > 0)!
    const before = g.points
    expect(s.submitResponse(target.id, { 1: 5 }, { source: 'internal', durationSec: 30, mine: true })).toBe(true)
    expect(g.points).toBe(before + target.settings.rewardPoints)
    expect(s.hasParticipated(target.id)).toBe(true)
    // second attempt is rejected and pays nothing
    expect(s.submitResponse(target.id, { 1: 4 }, { source: 'internal', durationSec: 30, mine: true })).toBe(false)
    expect(g.points).toBe(before + target.settings.rewardPoints)
  })

  it('deducts reward points from my wallet when others answer my survey', async () => {
    const { useGamificationStore } = await import('./GamificationStore')
    const s = useSurveysStore()
    const g = useGamificationStore()
    const mine = s.add({ title: 'استبياني', type: 'مخصص', audience: 'both', questions: [{ id: 1, text: 'س', type: 'rating' }], settings: { ...DEFAULT_SETTINGS, rewardPoints: 20 }, status: 'active', owner: 'me' })
    const before = g.points
    s.submitResponse(mine.id, { 1: 4 }, { source: 'external', durationSec: 30 })
    expect(g.points).toBe(before - 20)
  })

  it('gates creation by the unified account plan (free = 3) and upgrades through it', async () => {
    const { useAccountPlanStore } = await import('./AccountPlanStore')
    const s = useSurveysStore()
    const plan = useAccountPlanStore()
    plan.tier = 'free'
    // seed has 2 my-surveys → add one more reaches the free limit
    s.add({ title: 'ثالث', type: 'مخصص', audience: 'both', questions: [], settings: { ...DEFAULT_SETTINGS }, status: 'draft', owner: 'me' })
    expect(s.canCreate).toBe(false)
    expect(s.upgradePlan()).toBe(true) // مدفوعة من محفظة الـ seed
    expect(plan.tier).toBe('pro')
    expect(s.plan).toBe('pro')
    expect(s.canCreate).toBe(true)
    // حد الاحترافية 10: بعد بلوغه يلزم النخبة
    for (let i = 0; i < 7; i++)
      s.add({ title: `إضافي ${i}`, type: 'مخصص', audience: 'both', questions: [], settings: { ...DEFAULT_SETTINGS }, status: 'draft', owner: 'me' })
    expect(s.mySurveys.length).toBe(10)
    expect(s.canCreate).toBe(false)
    plan.tier = 'elite'
    expect(s.canCreate).toBe(true)
  })
})

describe('SurveysStore admin lifecycle', () => {
  it('enforces valid lifecycle transitions only', () => {
    const s = useSurveysStore()
    const sv = s.add({ title: 'دورة', type: 'مخصص', audience: 'both', questions: [], settings: { ...DEFAULT_SETTINGS }, status: 'draft', owner: 'me' })
    expect(s.setStatus(sv.id, 'paused')).toBe(false) // مسودة لا توقف
    expect(s.setStatus(sv.id, 'scheduled')).toBe(true)
    expect(s.setStatus(sv.id, 'active')).toBe(true)
    expect(s.setStatus(sv.id, 'paused')).toBe(true)
    expect(s.setStatus(sv.id, 'archived')).toBe(false) // الموقوف لا يؤرشف مباشرة
    expect(s.setStatus(sv.id, 'closed')).toBe(true)
    expect(s.setStatus(sv.id, 'archived')).toBe(true)
    expect(STATUS_TRANSITIONS.archived).toHaveLength(0)
  })

  it('auto-activates scheduled surveys whose start date arrived and auto-closes expired ones', () => {
    const s = useSurveysStore()
    const today = new Date().toISOString().slice(0, 10)
    const startable = s.add({ title: 'مجدول', type: 'مخصص', audience: 'both', questions: [], settings: { ...DEFAULT_SETTINGS, startsAt: today }, status: 'scheduled', owner: 'me' })
    const expired = s.add({ title: 'منتهٍ', type: 'مخصص', audience: 'both', questions: [], settings: { ...DEFAULT_SETTINGS, closesAt: '2026-01-01' }, status: 'active', owner: 'me' })
    s.syncLifecycle()
    expect(s.byId(startable.id)!.status).toBe('active')
    expect(s.byId(expired.id)!.status).toBe('closed')
  })

  it('closes the survey when the reward budget cannot cover the next participant', () => {
    const s = useSurveysStore()
    const sv = s.add({ title: 'محدود المجمع', type: 'مخصص', audience: 'both', questions: [{ id: 1, text: 'س', type: 'rating' }], settings: { ...DEFAULT_SETTINGS, rewardPoints: 30, rewardBudget: 50 }, status: 'active', owner: 'me' })
    // الاستجابة الأولى تُقبل وتصرف 30 من مجمع 50
    expect(s.submitResponse(sv.id, { 1: 5 }, { source: 'external', durationSec: 40 })).toBe(true)
    expect(s.byId(sv.id)!.rewardsSpent).toBe(30)
    // الثانية تتجاوز المجمع → تُرفض ويُغلق تلقائيًا
    expect(s.submitResponse(sv.id, { 1: 4 }, { source: 'external', durationSec: 40 })).toBe(false)
    expect(s.byId(sv.id)!.status).toBe('closed')
  })

  it('imports invitees from sheet rows, skips duplicates and empty rows', () => {
    const s = useSurveysStore()
    const sv = s.add({ title: 'مدعوون', type: 'مخصص', audience: 'both', questions: [], settings: { ...DEFAULT_SETTINGS }, status: 'active', owner: 'me' })
    const added = s.importInvitees(sv.id, [
      { name: 'سارة', contact: 'sara@x.com' },
      { name: 'محمد', contact: '0550000001' },
      { name: 'سارة مكررة', contact: 'sara@x.com' }, // مكرر
      { name: '', contact: 'x@x.com' }, // فارغ
    ], 'external')
    expect(added).toBe(2)
    expect(s.byId(sv.id)!.invitees).toHaveLength(2)
    s.removeInvitee(sv.id, s.byId(sv.id)!.invitees[0].id)
    expect(s.byId(sv.id)!.invitees).toHaveLength(1)
  })

  it('invites pending invitees and simulated responders update the funnel', () => {
    vi.useFakeTimers()
    const s = useSurveysStore()
    const sv = s.add({ title: 'قُمع', type: 'مخصص', audience: 'both', questions: [{ id: 1, text: 'س', type: 'rating' }], settings: { ...DEFAULT_SETTINGS }, status: 'active', owner: 'me' })
    s.importInvitees(sv.id, [
      { name: 'أ', contact: 'a@x.com' },
      { name: 'ب', contact: 'b@x.com' },
      { name: 'ج', contact: 'c@x.com' },
    ], 'internal')
    const invited = s.inviteAll(sv.id)
    expect(invited).toBe(3)
    expect(s.adminFor(sv.id)!.invitees.invited).toBe(3)
    vi.advanceTimersByTime(6000)
    const funnel = s.adminFor(sv.id)!.invitees
    expect(funnel.responded).toBe(2) // ثلثا المدعوين يستجيبون في المحاكاة
    expect(s.responsesFor(sv.id).length).toBe(2)
  })

  it('exposes admin metrics (quota, budget, deadline) and migrates legacy storage', () => {
    localStorage.setItem('surveys', JSON.stringify([
      { id: 9, title: 'قديم', type: 'رضا المرشح', audience: 'both', questions: [], status: 'active' },
    ]))
    setActivePinia(createPinia())
    const s = useSurveysStore()
    const legacy = s.byId(9)!
    expect(legacy.targeting).toEqual(DEFAULT_TARGETING)
    expect(legacy.invitees).toEqual([])
    expect(legacy.rewardsSpent).toBe(0)
    expect(legacy.settings.rewardBudget).toBeNull()

    legacy.settings.responseLimit = 10
    legacy.settings.rewardBudget = 100
    legacy.rewardsSpent = 25
    const a = s.adminFor(9)!
    expect(a.quota.limit).toBe(10)
    expect(a.budget.pct).toBe(25)
    expect(a.daysLeft).toBeNull()
  })
})

describe('generateQuestions', () => {
  it('spans the rich question types per survey type', () => {
    const qs = generateQuestions('رضا المرشح')
    const types = new Set(qs.map(q => q.type))
    expect(types.has('rating')).toBe(true)
    expect(types.has('nps')).toBe(true)
    expect(types.has('matrix')).toBe(true)
  })
})

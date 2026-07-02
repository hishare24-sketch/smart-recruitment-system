import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_SETTINGS, generateQuestions, useSurveysStore } from './SurveysStore'

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

  it('gates creation by subscription plan (free = 3) and upgrades', () => {
    const s = useSurveysStore()
    // seed has 2 my-surveys → add one more reaches the free limit
    s.add({ title: 'ثالث', type: 'مخصص', audience: 'both', questions: [], settings: { ...DEFAULT_SETTINGS }, status: 'draft', owner: 'me' })
    expect(s.canCreate).toBe(false)
    s.upgradePlan()
    expect(s.plan).toBe('pro')
    expect(s.canCreate).toBe(true)
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

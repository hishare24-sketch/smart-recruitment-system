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
    const created = s.add({ title: 'اختبار', type: 'رضا المرشح', audience: 'both', questions: generateQuestions('رضا المرشح'), settings: { ...DEFAULT_SETTINGS }, status: 'draft' })
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

describe('generateQuestions', () => {
  it('spans the rich question types per survey type', () => {
    const qs = generateQuestions('رضا المرشح')
    const types = new Set(qs.map(q => q.type))
    expect(types.has('rating')).toBe(true)
    expect(types.has('nps')).toBe(true)
    expect(types.has('matrix')).toBe(true)
  })
})

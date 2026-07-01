import { describe, expect, it } from 'vitest'
import { mockAi } from './mockAi'

describe('mockAi.skillLevel', () => {
  it('maps proof score to level by thresholds', () => {
    expect(mockAi.skillLevel(0).level).toBe('entry')
    expect(mockAi.skillLevel(30).level).toBe('mid')
    expect(mockAi.skillLevel(55).level).toBe('advanced')
    expect(mockAi.skillLevel(80).level).toBe('expert')
  })
  it('clamps confidence to 0-100 and returns a rationale', () => {
    const r = mockAi.skillLevel(140)
    expect(r.confidence).toBe(100)
    expect(r.rationale.length).toBeGreaterThan(0)
  })
})

describe('mockAi.suggestEvalElements', () => {
  it('suggests priced elements tailored to the interviewer type', () => {
    const tech = mockAi.suggestEvalElements('technical', ['Vue.js'])
    expect(tech.length).toBeGreaterThan(0)
    expect(tech[0].price).toBeGreaterThan(0)
    expect(tech[0].description).toContain('Vue.js')
    // unknown type falls back to a valid set
    expect(mockAi.suggestEvalElements('unknown', []).length).toBeGreaterThan(0)
  })
})

describe('mockAi.attachmentsInsight', () => {
  it('summarizes materials and tailors tips to their content', () => {
    const insight = mockAi.attachmentsInsight([
      { name: 'repo', kind: 'link', fileType: undefined },
      { name: 'cv.pdf', kind: 'file', fileType: 'application/pdf' },
    ])
    expect(insight.summary.length).toBeGreaterThan(0)
    expect(insight.tips.length).toBeGreaterThan(0)
    expect(mockAi.attachmentsInsight([]).tips).toEqual([])
  })
})

describe('mockAi resume helpers', () => {
  it('reviews a resume with strengths, weaknesses, ATS keywords and a score', () => {
    const strong = mockAi.resumeReview('مطوّر بخبرة 5 سنوات حسّن الأداء بنسبة 40% في تطبيقات عالية الجودة والقياس.', ['Vue.js', 'TypeScript', 'Node.js', 'UI/UX'])
    expect(strong.strengths.length).toBeGreaterThan(0)
    expect(strong.atsKeywords.length).toBeGreaterThan(0)
    expect(strong.score).toBeGreaterThan(0)
    expect(strong.score).toBeLessThanOrEqual(96)
    const weak = mockAi.resumeReview('مطوّر.', [])
    expect(weak.weaknesses.length).toBeGreaterThan(0)
    expect(weak.score).toBeLessThan(strong.score)
  })

  it('suggests tweaks against a target opportunity', () => {
    const s = mockAi.resumeVsOpportunity('ملخص قصير', 'مطوّر واجهات أول')
    expect(s.length).toBeGreaterThan(0)
    expect(s.join(' ')).toContain('مطوّر واجهات أول')
  })

  it('translates non-empty text and keeps empty empty', () => {
    expect(mockAi.translateText('', 'en')).toBe('')
    expect(mockAi.translateText('نص', 'en').length).toBeGreaterThan(0)
  })
})

describe('mockAi global search helpers', () => {
  it('infers search scope from the query wording', () => {
    expect(mockAi.searchIntent('أبحث عن مقيّم React').scope).toBe('interviewers')
    expect(mockAi.searchIntent('وظيفة مطوّر').scope).toBe('opportunities')
    expect(mockAi.searchIntent('مشروع Laravel').scope).toBe('requests')
    expect(mockAi.searchIntent('').scope).toBe('all')
  })

  it('suggests keyword alternatives via synonyms', () => {
    expect(mockAi.keywordAlternatives('برمجة جوال')).toContain('تطوير تطبيقات')
    expect(mockAi.keywordAlternatives('شيء غير معروف')).toEqual([])
  })

  it('proposes smart filter chips tuned to the user skills', () => {
    const chips = mockAi.smartFilterChips({ section: 'requests', skills: ['Laravel'] })
    expect(chips.length).toBeGreaterThan(0)
    expect(chips[0].label).toContain('Laravel')
    expect(chips.some(c => c.key === 'lowComp')).toBe(true)
    // interviewers section drops request-only chips
    expect(mockAi.smartFilterChips({ section: 'interviewers', skills: [] }).some(c => c.key === 'lowComp')).toBe(false)
  })

  it('auto-classifies posted text into a taxonomy category with skills', () => {
    const c = mockAi.autoClassify('مطلوب مطوّر Vue.js و TypeScript لبناء واجهات')
    expect(c.category).toBe('technology')
    expect(c.suggestedSkills.length).toBeGreaterThan(0)
    expect(mockAi.autoClassify('').suggestedSkills).toEqual([])
  })
})

describe('mockAi.trustAnalysis', () => {
  it('suggests tips for weak factors', () => {
    const tips = mockAi.trustAnalysis([{ key: 'endorsements', label: 'التوصيات', value: 40 }])
    expect(tips.length).toBeGreaterThan(0)
    expect(tips[0].gain).toBeGreaterThan(0)
  })
  it('returns a positive message when everything is strong', () => {
    const strong = ['endorsements', 'assessments', 'skills', 'interviews', 'completeness']
      .map(key => ({ key, label: key, value: 100 }))
    const tips = mockAi.trustAnalysis(strong)
    expect(tips).toHaveLength(1)
    expect(tips[0].gain).toBe(0)
  })
})

describe('mockAi.interviewerEligibility', () => {
  it('recommends acceptance for strong qualifications', () => {
    const r = mockAi.interviewerEligibility({ years: 10, certs: 3, endorsements: 3, hasLicense: true })
    expect(r.score).toBeGreaterThanOrEqual(70)
    expect(r.recommendation).toBe('accept')
    expect(r.strengths.length).toBeGreaterThan(0)
  })
  it('rejects weak qualifications and lists gaps', () => {
    const r = mockAi.interviewerEligibility({ years: 0, certs: 0, endorsements: 0 })
    expect(r.recommendation).toBe('reject')
    expect(r.gaps.length).toBeGreaterThan(0)
  })
})

describe('mockAi.suggestInterviewerPricing', () => {
  it('returns a min < max range within the kind band', () => {
    const p = mockAi.suggestInterviewerPricing('leadership', 8)
    expect(p.min).toBeLessThan(p.max)
    expect(p.min).toBeGreaterThan(0)
  })
})

describe('mockAi.interviewerMatch + recommendInterviewers', () => {
  const candidate = { field: 'تطوير الويب', skills: ['Vue.js', 'TypeScript'] }
  it('scores higher when specialties overlap skills', () => {
    const overlap = mockAi.interviewerMatch(candidate, { type: 'technical', specialties: ['Vue.js', 'TypeScript'] })
    const none = mockAi.interviewerMatch(candidate, { type: 'behavioral', specialties: ['التواصل'] })
    expect(overlap).toBeGreaterThan(none)
    expect(overlap).toBeLessThanOrEqual(98)
  })
  it('returns at most 3 ranked interviewers, sorted desc', () => {
    const ranked = mockAi.recommendInterviewers(candidate, [
      { id: 1, type: 'technical', specialties: ['Vue.js', 'TypeScript'] },
      { id: 2, type: 'behavioral', specialties: ['التواصل'] },
      { id: 3, type: 'technical', specialties: ['Vue.js'] },
      { id: 4, type: 'specialist', specialties: ['التسويق'] },
    ])
    expect(ranked.length).toBeLessThanOrEqual(3)
    expect(ranked[0].match).toBeGreaterThanOrEqual(ranked[ranked.length - 1].match)
  })
})

describe('mockAi.suggestEvaluationQuestions', () => {
  it('returns questions for a known kind and falls back gracefully', () => {
    expect(mockAi.suggestEvaluationQuestions('leadership').length).toBeGreaterThan(0)
    expect(mockAi.suggestEvaluationQuestions('unknown-kind').length).toBeGreaterThan(0)
  })
})

describe('mockAi.trustMotivation', () => {
  it('varies message by delta sign', () => {
    expect(mockAi.trustMotivation(5, 80)).toContain('ارتفعت')
    expect(mockAi.trustMotivation(-5, 60)).toContain('انخفضت')
    expect(mockAi.trustMotivation(0, 70)).toContain('70')
  })
})

describe('mockAi.suggestOptimalTimes', () => {
  it('returns 3 slots ranked with the preferred period first', () => {
    const res = mockAi.suggestOptimalTimes({ availability: ['الأحد', 'الثلاثاء', 'الخميس'], candidatePref: 'evening' })
    expect(res.suggestions).toHaveLength(3)
    expect(res.suggestions[0].period).toBe('evening')
    // compatibility is strictly descending
    expect(res.suggestions[0].compatibility).toBeGreaterThan(res.suggestions[1].compatibility)
    expect(res.suggestions[1].compatibility).toBeGreaterThan(res.suggestions[2].compatibility)
    // every slot lands on one of the interviewer's available weekdays
    const allowed = new Set([0, 2, 4]) // الأحد/الثلاثاء/الخميس
    for (const s of res.suggestions)
      expect(allowed.has(new Date(`${s.iso}T00:00:00`).getDay())).toBe(true)
    expect(res.explanation.length).toBeGreaterThan(0)
  })

  it('falls back gracefully when no availability is given', () => {
    const res = mockAi.suggestOptimalTimes({ availability: [] })
    expect(res.suggestions).toHaveLength(3)
  })
})

describe('mockAi.peerRequestTip', () => {
  it('gives a type-specific tip and a default for unknown types', () => {
    expect(mockAi.peerRequestTip('recommendation')).toContain('توصية')
    expect(mockAi.peerRequestTip('training')).toContain('تدريب')
    expect(mockAi.peerRequestTip('unknown').length).toBeGreaterThan(0)
  })
})

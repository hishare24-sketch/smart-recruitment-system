import { describe, expect, it } from 'vitest'
import { matchScore } from './matching'

describe('matching engine', () => {
  it('scores a perfect match at 100 with full breakdown', () => {
    const r = matchScore(
      { sector: 'technology', sub: 'software_development', skills: ['Vue.js', 'TypeScript'], city: 'الرياض', opportunityType: 'full_time' },
      { sector: 'S01', sub: 'software_development', skills: ['Vue.js', 'TypeScript'], city: 'الرياض', opportunityType: 'full_time' },
    )
    expect(r.score).toBe(100)
    expect(r.breakdown.sector).toBe(100)
    expect(r.breakdown.skills).toBe(100)
    expect(r.sharedSkills.sort()).toEqual(['TypeScript', 'Vue.js'])
  })

  it('resolves the sector across code/slug/legacy id before comparing', () => {
    // management (legacy) → administration; both must be treated as the same sector
    const r = matchScore({ sector: 'management' }, { sector: 'administration' })
    expect(r.breakdown.sector).toBe(100)
    expect(r.score).toBe(100)
  })

  it('penalizes a total mismatch', () => {
    const r = matchScore(
      { sector: 'technology', skills: ['Vue.js'], opportunityType: 'full_time' },
      { sector: 'health', skills: ['Pharmacy'], opportunityType: 'internship' },
    )
    expect(r.score).toBe(0)
    expect(r.sharedSkills).toEqual([])
  })

  it('ignores keys absent on either side (renormalizes on shared keys)', () => {
    // only skills present on both → score is purely the skills overlap
    const r = matchScore({ skills: ['Vue.js', 'React'] }, { skills: ['Vue.js'] })
    // Jaccard = 1/2 = 50
    expect(r.breakdown.skills).toBe(50)
    expect(r.score).toBe(50)
    expect(r.breakdown.sector).toBeUndefined()
  })

  it('gives partial location credit when one side is remote-flexible', () => {
    const r = matchScore({ city: 'جدة' }, { remote: true })
    expect(r.breakdown.location).toBe(50)
  })

  it('returns 0 when the two profiles share no comparable key', () => {
    const r = matchScore({ sector: 'technology' }, { skills: ['Vue.js'] })
    expect(r.score).toBe(0)
    expect(r.breakdown).toEqual({})
  })

  it('is case-insensitive for skills', () => {
    const r = matchScore({ skills: ['vue.js'] }, { skills: ['Vue.js'] })
    expect(r.breakdown.skills).toBe(100)
    expect(r.sharedSkills).toEqual(['vue.js'])
  })
})

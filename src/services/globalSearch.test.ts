import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGlobalSearch } from './globalSearch'
import { usePersonaStore } from '@/stores/PersonaStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { sectorForField } from '@/services/sectors'
import { mockOpportunities } from '@/modules/opportunities/services/mockOpportunities'

describe('globalSearch', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('returns categorized results across sections', () => {
    const { search } = useGlobalSearch()
    const cats = search('Vue')
    const keys = cats.map(c => c.key)
    expect(keys).toContain('requests')
    expect(keys).toContain('opportunities')
    expect(keys).toContain('interviewers')
    const total = cats.reduce((s, c) => s + c.items.length, 0)
    expect(total).toBeGreaterThan(0)
  })

  it('limits results to a single scope', () => {
    const { search } = useGlobalSearch()
    const cats = search('خالد', 'interviewers')
    expect(cats.every(c => c.key === 'interviewers')).toBe(true)
  })

  it('filters by taxonomy category', () => {
    const { search } = useGlobalSearch()
    const tech = search('', 'requests', 'technology')
    const design = search('', 'requests', 'design')
    // technology should surface Vue/TS requests; design a different (smaller) set
    expect(tech[0].items.length).toBeGreaterThan(0)
    expect(tech[0].items.length).not.toBe(design[0].items.length)
  })

  it('بلا سياق قطاعيّ (لا تفضيل ولا مهارات): onlyMine لا يقيّد', () => {
    // الملف المبذور فيه مهارات (سياق مشتقّ) — نُفرغها لاختبار حالة اللاسياق الحقيقية
    const profile = useProfileStore()
    profile.skills.splice(0, profile.skills.length)
    const { search } = useGlobalSearch()
    const all = search('', 'opportunities')[0].items.length
    const mine = search('', 'opportunities', undefined, { onlyMine: true })[0].items.length
    expect(mine).toBe(all)
  })

  it('onlyMine يقيّد الأقسام القطاعيّة على قطاعات المستخدم', () => {
    usePersonaStore().setInterestedSectors(['technology'])
    const { search } = useGlobalSearch()
    const all = search('', 'opportunities')[0].items
    const mine = search('', 'opportunities', undefined, { onlyMine: true })[0].items
    expect(mine.length).toBeLessThan(all.length)
    expect(mine.length).toBeGreaterThan(0)
  })

  it('الترتيب الواعي بالقطاع يرفع عناصر قطاعات المستخدم للأعلى (غير هادم)', () => {
    const { search } = useGlobalSearch()
    const neutral = search('', 'opportunities')[0].items // بلا سياق
    usePersonaStore().setInterestedSectors(['technology'])
    const ranked = search('', 'opportunities')[0].items // بسياق technology
    // غير هادم: نفس المجموعة تمامًا
    expect(new Set(ranked.map(i => i.id))).toEqual(new Set(neutral.map(i => i.id)))
    // أوّل عنصر بعد الترتيب ينتمي لقطاع المستخدم (technology)
    const topOpp = mockOpportunities.find(o => o.id === ranked[0].id)
    expect(sectorForField(topOpp?.department)?.id).toBe('technology')
  })
})

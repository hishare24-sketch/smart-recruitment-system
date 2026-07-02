import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useInterviewerBrandStore } from './InterviewerBrandStore'
import { useGamificationStore } from './GamificationStore'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('interviewerBrandStore', () => {
  it('tracks marketing reach counters and persists them', async () => {
    const b = useInterviewerBrandStore()
    const v = b.marketingStats.views
    b.recordView()
    b.recordShare()
    expect(b.marketingStats.views).toBe(v + 1)
    await Promise.resolve() // let the persistence watcher flush
    await Promise.resolve()
    expect(JSON.parse(localStorage.getItem('interviewerBrand')!).views).toBe(v + 1)
  })

  it('pins featured reviews with a cap of five', () => {
    const b = useInterviewerBrandStore()
    b.state.featuredReviewIds = []
    for (let i = 1; i <= 7; i++)
      b.toggleFeaturedReview(i)
    expect(b.state.featuredReviewIds.length).toBe(5)
    b.toggleFeaturedReview(1) // unpin
    expect(b.state.featuredReviewIds.includes(1)).toBe(false)
  })

  it('manages promos and exposes only active ones publicly', () => {
    const b = useInterviewerBrandStore()
    b.addPromo({ title: 'خصم تجريبي', kind: 'discount', pct: 20 })
    const p = b.state.promos[b.state.promos.length - 1]
    expect(b.activePromos.some(x => x.id === p.id)).toBe(true)
    b.togglePromo(p.id)
    expect(b.activePromos.some(x => x.id === p.id)).toBe(false)
  })

  it('publishes articles after the platform review window', () => {
    const b = useInterviewerBrandStore()
    const a = b.submitArticle('عنوان', 'محتوى تجريبي')
    expect(a.status).toBe('review')
    expect(b.publishedArticles.some(x => x.id === a.id)).toBe(false)
    vi.advanceTimersByTime(9000)
    expect(b.publishedArticles.some(x => x.id === a.id)).toBe(true)
  })

  it('credits referrals with wallet points', () => {
    const b = useInterviewerBrandStore()
    const g = useGamificationStore()
    const points = g.points
    const refs = b.marketingStats.referrals
    b.creditReferral()
    expect(b.marketingStats.referrals).toBe(refs + 1)
    expect(g.points).toBe(points + 50)
  })
})

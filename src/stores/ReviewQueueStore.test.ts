import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useReviewQueueStore } from './ReviewQueueStore'

describe('ReviewQueueStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('starts empty and flags items into the pending queue', () => {
    const store = useReviewQueueStore()
    expect(store.pendingCount).toBe(0)
    store.flag({ kind: 'opportunity', title: 'فرصة غامضة', reason: 'كلمة عامة' })
    expect(store.pendingCount).toBe(1)
    expect(store.items[0].resolved).toBe(false)
  })

  it('de-duplicates the same unresolved kind+title', () => {
    const store = useReviewQueueStore()
    store.flag({ kind: 'opportunity', title: 'عمال', reason: 'كلمة عامة' })
    store.flag({ kind: 'opportunity', title: 'عمال', reason: 'كلمة عامة' })
    expect(store.pendingCount).toBe(1)
  })

  it('resolving drops an item from pending but keeps it in items', () => {
    const store = useReviewQueueStore()
    const it = store.flag({ kind: 'skill', title: 'تقني', reason: 'كلمة عامة' })!
    store.resolve(it.id)
    expect(store.pendingCount).toBe(0)
    expect(store.items.length).toBe(1)
  })

  it('persists to localStorage', async () => {
    const store = useReviewQueueStore()
    store.flag({ kind: 'request', title: 'متفرقات', reason: 'أخرى' })
    await nextTick()
    expect(JSON.parse(localStorage.getItem('reviewQueue')!).length).toBe(1)
  })
})

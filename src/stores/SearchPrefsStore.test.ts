import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSearchPrefsStore } from './SearchPrefsStore'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('SearchPrefsStore recent history', () => {
  it('records queries most-recent-first and de-duplicates', () => {
    const s = useSearchPrefsStore()
    s.recordSearch('Vue')
    s.recordSearch('React')
    s.recordSearch('Vue') // moves Vue back to front, no dupe
    expect(s.recent).toEqual(['Vue', 'React'])
  })

  it('ignores blank queries and caps history at 8', () => {
    const s = useSearchPrefsStore()
    s.recordSearch('   ')
    expect(s.recent.length).toBe(0)
    for (let i = 0; i < 12; i++)
      s.recordSearch(`q${i}`)
    expect(s.recent.length).toBe(8)
    expect(s.recent[0]).toBe('q11') // newest first
  })
})

describe('SearchPrefsStore saved searches', () => {
  it('saves, detects and removes a saved search', () => {
    const s = useSearchPrefsStore()
    s.saveSearch('Laravel', 'requests')
    expect(s.isSaved('Laravel', 'requests')).toBe(true)
    s.saveSearch('Laravel', 'requests') // no duplicate
    expect(s.saved.length).toBe(1)
    s.removeSaved(s.saved[0].id)
    expect(s.saved.length).toBe(0)
  })
})

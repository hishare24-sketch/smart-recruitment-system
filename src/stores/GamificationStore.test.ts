import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGamificationStore } from './GamificationStore'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('GamificationStore.record', () => {
  it('awards the action points and increments the matching counter', () => {
    const g = useGamificationStore()
    const before = g.points
    g.record('skill')
    expect(g.points).toBe(before + 20)
    expect(g.counters.skills).toBe(3) // seed 2 + 1
    expect(g.lastReward?.points).toBe(20)
  })

  it('advances a challenge and pays its reward + unlocks a badge on completion', () => {
    const g = useGamificationStore()
    // c1: add-5-skills, seed progress 2 → three more completes it (reward 80)
    g.record('skill')
    g.record('skill')
    g.record('skill')
    const c1 = g.challenges.find(c => c.id === 'c1')!
    expect(c1.done).toBe(true)
    expect(g.counters.skills).toBe(5)
    // 240 seed + 3*20 skill + 80 challenge reward
    expect(g.points).toBe(240 + 60 + 80)
    // skill_builder badge (skills >= 5) unlocked
    expect(g.lastBadgeId).toBe('skill_builder')
    expect(g.badges.find(b => b.id === 'skill_builder')!.earned).toBe(true)
  })
})

describe('GamificationStore.checkIn', () => {
  it('awards daily points once per day and is idempotent', () => {
    const g = useGamificationStore()
    const before = g.points
    g.checkIn()
    expect(g.points).toBe(before + 5)
    const after = g.points
    g.checkIn() // same day → no-op
    expect(g.points).toBe(after)
  })
})

describe('GamificationStore.tier & leaderboard', () => {
  it('derives the tier from points thresholds', () => {
    const g = useGamificationStore()
    expect(g.tier.id).toBe('bronze') // 240
    g.record('project') // +60 → 300
    expect(g.tier.id).toBe('silver')
  })

  it('climbs the leaderboard rank as points grow past fixed peers', () => {
    const g = useGamificationStore()
    expect(g.myRank).toBe(3) // 240, below peers 460 & 330
    // push above the top peer (460)
    for (let i = 0; i < 5; i++)
      g.record('project') // +300 → 540
    expect(g.myRank).toBe(1)
  })
})

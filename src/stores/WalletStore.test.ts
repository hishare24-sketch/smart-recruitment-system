import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { POINTS_PER_RIYAL, useWalletStore } from './WalletStore'
import { useGamificationStore } from './GamificationStore'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('WalletStore balances', () => {
  it('computes available from completed txns and pending from unsettled earnings', () => {
    const w = useWalletStore()
    // seed: 500-45+180-300+220+15+250+45-80 = 785 completed
    expect(w.available).toBe(785)
    expect(w.pending).toBe(280) // pending earning
    expect(w.processingWithdrawals).toBe(150) // pending withdrawal
  })
})

describe('WalletStore deposit & withdraw', () => {
  it('deposits instantly and rejects invalid amounts', () => {
    const w = useWalletStore()
    const before = w.available
    expect(w.deposit(200)).toBe(true)
    expect(w.available).toBe(before + 200)
    expect(w.deposit(0)).toBe(false)
    expect(w.deposit(-5)).toBe(false)
  })

  it('withdraws with a fee, holds it pending, then settles via the bank simulation', () => {
    const w = useWalletStore()
    const before = w.available
    expect(w.withdraw(100)).toBe(true)
    // fee (2% → 2) is completed immediately; the 100 stays pending
    expect(w.available).toBe(before - 2)
    expect(w.processingWithdrawals).toBe(150 + 100)
    vi.advanceTimersByTime(8000)
    expect(w.available).toBe(before - 2 - 100)
    expect(w.txns[0].status === 'completed' || w.txns[1].status === 'completed').toBe(true)
  })

  it('rejects withdrawing more than the available balance', () => {
    const w = useWalletStore()
    expect(w.withdraw(w.available + 1)).toBe(false)
  })
})

describe('WalletStore earnings & points conversion', () => {
  it('credits pending earnings that settle after the payout window', () => {
    const w = useWalletStore()
    const before = w.available
    w.credit(90, 'أرباح اختبارية', { pending: true })
    expect(w.available).toBe(before)
    expect(w.pending).toBe(280 + 90)
    vi.advanceTimersByTime(10000)
    expect(w.available).toBe(before + 90)
  })

  it('converts gamification points to balance at the fixed rate', () => {
    const w = useWalletStore()
    const g = useGamificationStore()
    const points = g.points
    const usable = Math.floor(points / POINTS_PER_RIYAL) * POINTS_PER_RIYAL
    const before = w.available
    expect(w.convertPoints(points)).toBe(true)
    expect(g.points).toBe(points - usable)
    expect(w.available).toBe(before + usable / POINTS_PER_RIYAL)
    expect(w.convertPoints(POINTS_PER_RIYAL - 1)).toBe(false)
  })
})

describe('WalletStore payment methods', () => {
  it('adds masked cards and banks, sets default and removes safely', () => {
    const w = useWalletStore()
    w.addCard('فيزا', '4111 1111 1111 1290', 'مستخدم')
    const card = w.methods[w.methods.length - 1]
    expect(card.masked).toBe('•••• 1290')
    w.addBank('الأهلي', 'SA0380000000608010167519', 'مستخدم')
    const bank = w.methods[w.methods.length - 1]
    expect(bank.masked.endsWith('7519')).toBe(true)
    w.setDefault(bank.id)
    expect(w.methods.filter(m => m.isDefault).length).toBe(1)
    expect(w.defaultMethod?.id).toBe(bank.id)
    w.removeMethod(bank.id)
    // a default survives removal (falls back to the first method)
    expect(w.methods.some(m => m.isDefault)).toBe(true)
  })
})

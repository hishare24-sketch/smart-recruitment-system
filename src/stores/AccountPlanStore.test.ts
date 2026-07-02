import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAccountPlanStore } from './AccountPlanStore'
import { useWalletStore } from './WalletStore'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('accountPlanStore', () => {
  it('migrates the highest tier from the two legacy plan systems', () => {
    localStorage.setItem('surveyPlan', 'pro')
    localStorage.setItem('publicProfile', JSON.stringify({ tier: 'free' }))
    setActivePinia(createPinia())
    expect(useAccountPlanStore().tier).toBe('pro')

    localStorage.clear()
    localStorage.setItem('publicProfile', JSON.stringify({ tier: 'elite' }))
    setActivePinia(createPinia())
    expect(useAccountPlanStore().tier).toBe('elite')

    // بعد الترحيل تُثبَّت القيمة ولا يعاد اشتقاقها
    localStorage.setItem('publicProfile', JSON.stringify({ tier: 'free' }))
    setActivePinia(createPinia())
    expect(useAccountPlanStore().tier).toBe('elite')
  })

  it('exposes tier gates: survey limits and delegation', () => {
    const p = useAccountPlanStore()
    p.tier = 'free'
    expect(p.surveyLimit).toBe(3)
    expect(p.canDelegate).toBe(false)
    expect(p.atLeast('free')).toBe(true)
    expect(p.atLeast('pro')).toBe(false)
    p.tier = 'pro'
    expect(p.surveyLimit).toBe(10)
    expect(p.canDelegate).toBe(true)
    p.tier = 'elite'
    expect(p.surveyLimit).toBeNull()
    expect(p.atLeast('elite')).toBe(true)
  })

  it('charges the wallet on upgrade, blocks when balance is low, and downgrades free', () => {
    const p = useAccountPlanStore()
    const wallet = useWalletStore()
    p.tier = 'free'
    const before = wallet.available
    expect(p.setTier('pro')).toBe(true)
    expect(wallet.available).toBe(before - 49)
    expect(p.setTier('free')).toBe(true) // تخفيض بلا رسوم
    expect(wallet.available).toBe(before - 49)
    wallet.pay(wallet.available, 'تصفير الرصيد للاختبار')
    expect(p.setTier('elite')).toBe(false)
    expect(p.tier).toBe('free')
  })
})

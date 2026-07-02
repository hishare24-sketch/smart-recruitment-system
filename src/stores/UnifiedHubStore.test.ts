import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { User } from '@/interfaces/Auth'
import { landingFor } from '@/services/roles'
import { useAuthStore } from './AuthStore'
import { filterItems, groupItems, parseAmount, sortItems, useUnifiedHubStore } from './UnifiedHubStore'
import type { WorkItem } from './UnifiedHubStore'

function loginWithRoles(roles: ('seeker' | 'interviewer' | 'company' | 'coach' | 'trainer' | 'consultant' | 'admin')[]) {
  const auth = useAuthStore()
  const now = new Date().toISOString()
  auth.setAuthUser({
    id: 1,
    name: 'مستخدم اختبار',
    email: 'test@demo.sa',
    role: roles[0],
    roles: roles.map(r => ({ role: r, status: 'active', created_at: now, activated_at: now })),
    token: 't',
  } as unknown as User)
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('unifiedHubStore adapters', () => {
  it('aggregates nothing for a signed-out user except role-agnostic peer requests', () => {
    const hub = useUnifiedHubStore()
    // بلا مستخدم: كل الـ adapters المشروطة بالدور تعود فارغة
    expect(hub.allItems.filter(i => i.kind !== 'peer_request').length).toBe(0)
  })

  it('gates adapters by owned roles', () => {
    loginWithRoles(['seeker'])
    const hub = useUnifiedHubStore()
    expect(hub.allItems.some(i => i.kind === 'wish_incoming')).toBe(true)
    expect(hub.allItems.some(i => i.kind === 'interview_request')).toBe(false)
    expect(hub.allItems.some(i => i.kind === 'consulting_request')).toBe(false)
  })

  it('aggregates across all owned roles with unique composite ids', () => {
    loginWithRoles(['interviewer', 'seeker', 'consultant', 'trainer'])
    const hub = useUnifiedHubStore()
    expect(hub.allItems.some(i => i.kind === 'interview_request')).toBe(true)
    expect(hub.allItems.some(i => i.kind === 'consulting_request')).toBe(true)
    expect(hub.allItems.some(i => i.kind === 'trainee_referral')).toBe(true)
    const ids = hub.allItems.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('computes cross-role kpis (earnings, pending money, action count)', () => {
    loginWithRoles(['interviewer', 'trainer', 'coach'])
    const hub = useUnifiedHubStore()
    expect(hub.kpis.actionCount).toBe(hub.actionItems.length)
    expect(hub.kpis.earnings).toBeGreaterThan(0) // أرباح المقيّم + إيراد المدرب + اشتراكات المرشد
    expect(hub.kpis.activeRoles).toBe(3)
    const manualPending = hub.actionItems.reduce((s, i) => s + (i.amount ?? 0), 0)
    expect(hub.kpis.pendingMoney).toBe(manualPending)
  })

  it('resolves inbox decisions through the owning store', () => {
    loginWithRoles(['interviewer', 'seeker'])
    const hub = useUnifiedHubStore()
    const req = hub.allItems.find(i => i.kind === 'interview_request')!
    expect(hub.resolveItem(req, true)).toBe(true)
    // بعد القبول يخرج الطلب من الصندوق ويتحول لمقابلة قادمة
    expect(hub.allItems.some(i => i.id === req.id)).toBe(false)
    expect(hub.allItems.some(i => i.kind === 'interview_upcoming' && i.sourceId === req.sourceId)).toBe(true)

    const wish = hub.allItems.find(i => i.kind === 'wish_incoming')!
    expect(hub.resolveItem(wish, false)).toBe(true)
    expect(hub.allItems.some(i => i.id === wish.id)).toBe(false)

    const booking = hub.allItems.find(i => i.kind === 'my_booking')
    if (booking)
      expect(hub.resolveItem(booking, true)).toBe(false) // يحتاج صفحته
  })

  it('builds a summary card per owned role', () => {
    loginWithRoles(['seeker', 'interviewer', 'consultant'])
    const hub = useUnifiedHubStore()
    const roles = hub.roleSummaries.map(r => r.role)
    expect(roles).toEqual(['seeker', 'interviewer', 'consultant'])
    hub.roleSummaries.forEach(r => expect(r.facts.length).toBeGreaterThanOrEqual(2))
  })
})

describe('landingFor', () => {
  it('routes multi-role owners to the hub and single-role users to their board', () => {
    expect(landingFor('seeker', 1)).toBe('dashboard')
    expect(landingFor('interviewer', 1)).toBe('interviewer-dashboard')
    expect(landingFor('seeker', 2)).toBe('unified-hub')
    expect(landingFor('consultant', 4)).toBe('unified-hub')
    expect(landingFor(undefined, 0)).toBe('dashboard')
  })
})

describe('hub pure helpers', () => {
  const mk = (over: Partial<WorkItem>): WorkItem => ({
    id: over.id ?? 'x-1',
    sourceId: 1,
    role: 'seeker',
    kind: 'wish_incoming',
    title: 'عنوان',
    party: 'طرف',
    partyInitial: 'ط',
    dateLabel: 'اليوم',
    status: 'جديد',
    statusColor: 'accent',
    urgency: 'action',
    priority: 2,
    actionTo: '/x',
    icon: 'mdi-star',
    color: 'primary',
    ...over,
  })

  it('parses arabic money labels', () => {
    expect(parseAmount('18,000 ر.س')).toBe(18000)
    expect(parseAmount('600 ر.س/ساعة')).toBe(600)
    expect(parseAmount('بلا مقابل')).toBeUndefined()
    expect(parseAmount(undefined)).toBeUndefined()
  })

  it('filters by roles, urgencies, kinds and text query combined', () => {
    const items = [
      mk({ id: 'a', role: 'seeker', urgency: 'action', title: 'رغبة من شركة النور' }),
      mk({ id: 'b', role: 'interviewer', kind: 'interview_request', urgency: 'action', party: 'محمد' }),
      mk({ id: 'c', role: 'interviewer', kind: 'interview_upcoming', urgency: 'upcoming' }),
    ]
    expect(filterItems(items, { roles: ['interviewer'] }).map(i => i.id)).toEqual(['b', 'c'])
    expect(filterItems(items, { urgencies: ['action'] }).length).toBe(2)
    expect(filterItems(items, { kinds: ['interview_upcoming'] }).map(i => i.id)).toEqual(['c'])
    expect(filterItems(items, { query: 'النور' }).map(i => i.id)).toEqual(['a'])
    expect(filterItems(items, { roles: ['interviewer'], urgencies: ['action'], query: 'محمد' }).map(i => i.id)).toEqual(['b'])
    expect(filterItems(items, {})).toHaveLength(3)
  })

  it('sorts by priority, amount, and keeps source order for recent', () => {
    const items = [
      mk({ id: 'a', priority: 3, amount: 100 }),
      mk({ id: 'b', priority: 1 }),
      mk({ id: 'c', priority: 2, amount: 900 }),
    ]
    expect(sortItems(items, 'priority').map(i => i.id)).toEqual(['b', 'c', 'a'])
    expect(sortItems(items, 'amount').map(i => i.id)).toEqual(['c', 'a', 'b'])
    expect(sortItems(items, 'recent').map(i => i.id)).toEqual(['a', 'b', 'c'])
    // الفرز لا يعدّل المصفوفة الأصلية
    expect(items.map(i => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('groups by role/kind/urgency and returns one bucket for none', () => {
    const items = [
      mk({ id: 'a', role: 'seeker', urgency: 'action' }),
      mk({ id: 'b', role: 'interviewer', kind: 'interview_request', urgency: 'action' }),
      mk({ id: 'c', role: 'interviewer', kind: 'interview_upcoming', urgency: 'upcoming' }),
    ]
    const byRole = groupItems(items, 'role')
    expect(byRole.map(g => g.key)).toEqual(['seeker', 'interviewer'])
    expect(byRole[1].items.length).toBe(2)
    expect(groupItems(items, 'urgency').map(g => g.key)).toEqual(['action', 'upcoming'])
    expect(groupItems(items, 'none')).toHaveLength(1)
    expect(groupItems([], 'none')).toHaveLength(0)
  })
})

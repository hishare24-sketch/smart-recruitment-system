import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRoleRequestsStore } from './RoleRequestsStore'
import { useAuthStore } from './AuthStore'
import { ROLE_META, ROLE_PERMISSIONS, defaultRoleEntries } from '@/services/roles'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('role approval pipeline', () => {
  it('policy: every professional role is instant — only admin keeps the approval gate', () => {
    for (const r of ['seeker', 'company', 'interviewer', 'endorser', 'coach', 'trainer', 'consultant'] as const)
      expect(ROLE_META[r].activation).toBe('instant')
    expect(ROLE_META.admin.activation).toBe('approval')
  })

  // آلية الطابور تبقى جاهزة: نحاكي دورًا معلّقًا يدويًا (كما لو أُعيدت بوابة الموافقة)
  function loginWithPendingInterviewer() {
    const auth = useAuthStore()
    auth.setAuthUser({ id: 1, uuid: 'u', name: 'أنا', email: 'x@x.com', token: 't', role: 'seeker', roles: defaultRoleEntries('seeker'), permissions: ROLE_PERMISSIONS.seeker })
    auth.authUser!.roles = [...auth.roleEntries, { role: 'interviewer', status: 'pending' }]
    return auth
  }

  it('queues a pending request and activates my role on admin approval (mechanism stays ready)', () => {
    const auth = loginWithPendingInterviewer()
    expect(auth.hasRole('interviewer')).toBe(false)

    const q = useRoleRequestsStore()
    const req = q.add('interviewer', 'اختبار', true)
    expect(q.pending.some(r => r.id === req.id)).toBe(true)
    q.decide(req.id, true)
    expect(q.pending.some(r => r.id === req.id)).toBe(false)
    expect(auth.hasRole('interviewer')).toBe(true) // الاعتماد فعّل الدور
  })

  it('rejection keeps the role inactive', () => {
    const auth = loginWithPendingInterviewer()
    const q = useRoleRequestsStore()
    const req = q.add('interviewer', 'اختبار', true)
    q.decide(req.id, false)
    expect(auth.hasRole('interviewer')).toBe(false)
    expect(auth.ownsRole('interviewer')).toBe(true) // يبقى معلقًا قابلًا لإعادة الطلب
  })

  it('simulated platform review approves after the delay', () => {
    const auth = loginWithPendingInterviewer()
    const q = useRoleRequestsStore()
    const req = q.add('interviewer', 'اختبار', true)
    q.simulatePlatformReview(req.id)
    vi.advanceTimersByTime(11000)
    expect(auth.hasRole('interviewer')).toBe(true)
  })
})

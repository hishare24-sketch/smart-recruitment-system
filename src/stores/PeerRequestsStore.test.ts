import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePeerRequestsStore } from './PeerRequestsStore'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('PeerRequestsStore', () => {
  it('adds a new outgoing request as pending', () => {
    const s = usePeerRequestsStore()
    const before = s.outgoing.length
    s.create({ type: 'recommendation', personName: 'خالد', personRole: 'زميل', reason: 'اختبار', skills: [], attachments: [] })
    expect(s.outgoing.length).toBe(before + 1)
    expect(s.outgoing[0].status).toBe('pending')
    expect(s.outgoing[0].type).toBe('recommendation')
  })

  it('accepts and rejects incoming requests', () => {
    const s = usePeerRequestsStore()
    const pending = s.incoming.find(r => r.status === 'pending')!
    s.accept(pending.id)
    expect(s.incoming.find(r => r.id === pending.id)!.status).toBe('accepted')
    const other = s.incoming.find(r => r.status === 'accepted' && r.id !== pending.id)
    if (other) {
      s.reject(other.id)
      expect(s.incoming.find(r => r.id === other.id)!.status).toBe('rejected')
    }
  })

  it('tracks the pending-incoming count', () => {
    const s = usePeerRequestsStore()
    const initial = s.pendingIncoming
    const p = s.incoming.find(r => r.status === 'pending')!
    s.accept(p.id)
    expect(s.pendingIncoming).toBe(initial - 1)
  })

  it('cancels an outgoing request', () => {
    const s = usePeerRequestsStore()
    const id = s.outgoing[0].id
    s.cancelOutgoing(id)
    expect(s.outgoing.some(r => r.id === id)).toBe(false)
  })
})

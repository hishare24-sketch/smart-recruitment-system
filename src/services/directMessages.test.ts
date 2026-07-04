import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { fetchMyMessages, resolveProfileOwner, sendDirectMessage, subscribeInbound } from './directMessages'

// ===== عميل Supabase زائف للرسائل المباشرة — بلا شبكة =====
function fakeClient(opts: { rows?: unknown[], ownerRow?: unknown, insertError?: boolean } = {}) {
  const calls = { inserts: [] as Record<string, unknown>[], channels: [] as string[], removed: 0 }
  let rtHandler: ((p: { new?: unknown }) => void) | null = null

  const builder = () => {
    const b: Record<string, unknown> = {
      insert: (payload: Record<string, unknown>) => {
        calls.inserts.push(payload)
        return {
          select: () => ({
            single: async () =>
              opts.insertError
                ? { data: null, error: { message: 'x' } }
                : { data: { id: 1, ...payload, created_at: '2026-07-05T10:00:00Z', read_at: null }, error: null },
          }),
        }
      },
      select: () => b,
      eq: () => b,
      or: () => b,
      is: () => b,
      order: async () => ({ data: opts.rows ?? [], error: null }),
      maybeSingle: async () => ({ data: opts.ownerRow ?? null, error: null }),
      update: () => b,
    }
    return b
  }

  const client = {
    from: builder,
    channel: (name: string) => {
      calls.channels.push(name)
      const ch = {
        on: (_e: string, _c: unknown, h: (p: { new?: unknown }) => void) => {
          rtHandler = h
          return ch
        },
        subscribe: () => ch,
      }
      return ch
    },
    removeChannel: () => {
      calls.removed++
    },
  }
  return {
    client: client as unknown as SupabaseClient,
    calls,
    fireInbound: (row: unknown) => rtHandler?.({ new: row }),
  }
}

describe('directMessages', () => {
  it('sendDirectMessage يُدرج صفًّا باسم المرسِل ويعيده', async () => {
    const { client, calls } = fakeClient()
    const row = await sendDirectMessage(
      { senderId: 'A', senderName: 'أحمد', recipientId: 'B', recipientName: 'سارة', body: 'مرحبًا' },
      client,
    )
    expect(calls.inserts).toHaveLength(1)
    expect(calls.inserts[0]).toMatchObject({ sender_id: 'A', recipient_id: 'B', body: 'مرحبًا' })
    expect(row?.id).toBe(1)
  })

  it('بلا عميل: الإرسال يعيد null ولا ينهار', async () => {
    const row = await sendDirectMessage(
      { senderId: 'A', senderName: 'أحمد', recipientId: 'B', recipientName: 'سارة', body: 'x' },
      null,
    )
    expect(row).toBeNull()
  })

  it('fetchMyMessages يعيد صفوف المستخدم', async () => {
    const rows = [{ id: 1, sender_id: 'A', recipient_id: 'B', body: 'x' }]
    const { client } = fakeClient({ rows })
    expect(await fetchMyMessages('A', client)).toEqual(rows)
  })

  it('resolveProfileOwner يحلّ المالك والاسم من الـslug', async () => {
    const { client } = fakeClient({ ownerRow: { owner_id: 'owner-9', data: { displayName: 'خالد' } } })
    const res = await resolveProfileOwner('khaled', client)
    expect(res).toEqual({ ownerId: 'owner-9', name: 'خالد' })
  })

  it('resolveProfileOwner يعيد null لصفحة غير مُدّعاة', async () => {
    const { client } = fakeClient({ ownerRow: { owner_id: null, data: {} } })
    expect(await resolveProfileOwner('demo', client)).toBeNull()
  })

  it('subscribeInbound يوصّل الرسائل الواردة ويعيد دالة إلغاء', async () => {
    const { client, calls, fireInbound } = fakeClient()
    const got: unknown[] = []
    const detach = subscribeInbound('B', r => got.push(r), client)
    expect(calls.channels[0]).toBe('dm-inbound:B')
    fireInbound({ id: 5, sender_id: 'A', recipient_id: 'B', body: 'وارد' })
    expect(got).toHaveLength(1)
    detach()
    expect(calls.removed).toBe(1)
  })
})

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '@/services/supabase'

/**
 * ===== خدمة الرسائل المباشرة — التسليم الحقيقي بين المستخدمين =====
 *
 * بخلاف محرك cloudSync (مزامنة مستند خاص لكل مستخدم)، هذه طبقة علائقية:
 * المرسِل يُدرج صفًّا في direct_messages موجّهًا للمستقبِل، فيصله لحظيًا عبر
 * Realtime. الخدمة نقية وقابلة للحقن (client) — منطق العرض في MessagesStore.
 *
 * جدول direct_messages: (sender_id, recipient_id, sender_name, recipient_name,
 * body, created_at, read_at). سياسات RLS: القراءة لطرفَي الرسالة، والكتابة
 * باسم صاحب الجلسة فقط، والتعليم مقروءًا للمستقبِل.
 */

export interface DirectMessageRow {
  id: number
  sender_id: string
  recipient_id: string
  sender_name: string
  recipient_name: string
  body: string
  created_at: string
  read_at: string | null
}

export interface SendArgs {
  senderId: string
  senderName: string
  recipientId: string
  recipientName: string
  body: string
}

/** يُدرج رسالة موجّهة — يعيد الصف المُدرَج أو null عند الفشل/التعطّل */
export async function sendDirectMessage(
  args: SendArgs,
  client: SupabaseClient | null = getSupabase(),
): Promise<DirectMessageRow | null> {
  if (!client)
    return null
  const { data, error } = await client
    .from('direct_messages')
    .insert({
      sender_id: args.senderId,
      recipient_id: args.recipientId,
      sender_name: args.senderName,
      recipient_name: args.recipientName,
      body: args.body,
    })
    .select()
    .single()
  return error ? null : (data as DirectMessageRow)
}

/** يحلّ مالك صفحة تعريفية من الـslug — أساس التسليم الحقيقي عبر «تواصل معي» */
export async function resolveProfileOwner(
  slug: string,
  client: SupabaseClient | null = getSupabase(),
): Promise<{ ownerId: string, name: string } | null> {
  if (!client)
    return null
  const { data, error } = await client
    .from('public_profiles')
    .select('owner_id, data')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data?.owner_id)
    return null
  const name = (data.data as { displayName?: string })?.displayName ?? slug
  return { ownerId: data.owner_id as string, name }
}

/** كل رسائل المستخدم (مُرسَلة ووارِدة) مرتّبة زمنيًا — لإعادة بناء المحادثات */
export async function fetchMyMessages(
  uid: string,
  client: SupabaseClient | null = getSupabase(),
): Promise<DirectMessageRow[]> {
  if (!client)
    return []
  const { data, error } = await client
    .from('direct_messages')
    .select('*')
    .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
    .order('created_at', { ascending: true })
  return error ? [] : (data as DirectMessageRow[])
}

/** يعلّم كل الرسائل الواردة من طرف معيّن مقروءة */
export async function markThreadRead(
  uid: string,
  peerId: string,
  client: SupabaseClient | null = getSupabase(),
): Promise<void> {
  if (!client)
    return
  await client
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', uid)
    .eq('sender_id', peerId)
    .is('read_at', null)
}

/**
 * يشترك في الرسائل الوارِدة للمستخدم لحظيًا — يعيد دالة إلغاء.
 * onMessage يُستدعى بكل رسالة جديدة موجَّهة إلى uid.
 */
export function subscribeInbound(
  uid: string,
  onMessage: (row: DirectMessageRow) => void,
  client: SupabaseClient | null = getSupabase(),
): () => void {
  if (!client)
    return () => {}
  const channel: RealtimeChannel = client
    .channel(`dm-inbound:${uid}`)
    .on(
      'postgres_changes' as 'system',
      { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${uid}` } as never,
      (payload: { new?: DirectMessageRow }) => {
        if (payload.new)
          onMessage(payload.new)
      },
    )
    .subscribe()
  return () => {
    client.removeChannel(channel)
  }
}

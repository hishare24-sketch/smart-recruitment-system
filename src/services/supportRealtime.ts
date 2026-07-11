import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { USE_REAL_API } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

/**
 * ===== البثّ اللحظيّ لردود الدعم (Reverb) =====
 *
 * الردّ يُدرَج عبر REST فيبثّ الخادم حدث `ticket.reply`:
 * - ردّ الدعم → قناة صاحب التذكرة الخاصّة `user.{uuid}` (مركز المساعدة عند المستخدم).
 * - ردّ المستخدم → قناة الأدمن `support.admin` (كنسول الدعم).
 * القنوات خاصّة توثَّق بتوكن Bearer على `/broadcasting/auth`.
 * في وضع المحاكاة كلّ الدوال محايدة.
 */

export interface TicketReplyEvent {
  ticketId: number
  subject: string
  status: string
  reply: { id: number, author: string, isStaff: boolean, body: string, at: string | null }
}

/** أصل الخادم (بلا لاحقة /api) — قاعدة `/broadcasting/auth`. */
function serverBase(): string {
  const raw = (import.meta.env.VITE_BASE_API_URL as string) || ''
  return raw.replace(/\/api\/?$/, '') || window.location.origin
}

/** ينشئ عميل Echo موصّل بـReverb موثّقًا بتوكن الجلسة. */
function makeEcho(): Echo<'reverb'> {
  const token = useAuthStore().getToken
  ;(window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher

  const scheme = (import.meta.env.VITE_REVERB_SCHEME as string) || 'http'
  const port = Number(import.meta.env.VITE_REVERB_PORT || 8091)

  return new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY as string,
    wsHost: (import.meta.env.VITE_REVERB_HOST as string) || 'localhost',
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${serverBase()}/broadcasting/auth`,
    auth: { headers: { Authorization: `Bearer ${token}` } },
  })
}

/** يشترك في ردود تذاكر المستخدم لحظيًّا على قناته — يعيد دالة إلغاء. */
export function subscribeUserTickets(uuid: string, onReply: (e: TicketReplyEvent) => void): () => void {
  if (!USE_REAL_API || !uuid)
    return () => {}

  const echo = makeEcho()
  echo.private(`user.${uuid}`).listen('.ticket.reply', (e: TicketReplyEvent) => onReply(e))

  return () => {
    try { echo.leave(`user.${uuid}`) }
    finally { echo.disconnect() }
  }
}

/** يشترك في طابور ردود الأدمن لحظيًّا (كنسول الدعم) — يعيد دالة إلغاء. */
export function subscribeAdminSupport(onReply: (e: TicketReplyEvent) => void): () => void {
  if (!USE_REAL_API)
    return () => {}

  const echo = makeEcho()
  echo.private('support.admin').listen('.ticket.reply', (e: TicketReplyEvent) => onReply(e))

  return () => {
    try { echo.leave('support.admin') }
    finally { echo.disconnect() }
  }
}

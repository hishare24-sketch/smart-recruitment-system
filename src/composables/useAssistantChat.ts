import type { AssistantContext, AssistantContextResponse, AssistantConversationRow, AssistantGovernanceState, AssistantMeta, AssistantNudge, AssistantQuota, SupportTicketDetail, SupportTicketRow } from '@/services/api'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { subscribeUserTickets } from '@/services/supportRealtime'
import { useAuthStore } from '@/stores/AuthStore'
import { useChatWidgetStore } from '@/stores/ChatWidgetStore'

export interface ChatBubble { role: 'user' | 'assistant', body: string, meta?: AssistantMeta | null }
export type ChatMode = 'assistant' | 'support'
type ChipColor = 'brand' | 'accent' | 'emerald' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

/**
 * منطق الشات الموحّد (المساعد الذكيّ + الدعم البشريّ + التصعيد + البثّ اللحظيّ) كعقدٍ واحد
 * قابل لإعادة الاستخدام في الويدجت العائم وفي الصفحة الكاملة. مأخوذ من AssistantPage
 * ليكون مصدرًا واحدًا للحقيقة. يبثّ عدّاد «غير-مقروء» للويدجت عند وصول ردّ دعم وهو مغلق.
 */
export function useAssistantChat() {
  const { t } = useI18n()
  const widget = useChatWidgetStore()

  const mode = ref<ChatMode>('assistant')

  // ── سياق + حوكمة ──
  const governance = ref<AssistantGovernanceState | null>(null)
  const context = ref<AssistantContext | null>(null)
  const suggestions = ref<string[]>([])
  const nudges = ref<AssistantNudge[]>([])
  const quota = ref<AssistantQuota | null>(null)

  const quotaRemaining = computed(() => {
    const q = quota.value
    if (!q)
      return null
    const windows: { key: 'daily' | 'weekly' | 'monthly', label: string }[] = [
      { key: 'daily', label: t('assistant.quotaDaily') },
      { key: 'weekly', label: t('assistant.quotaWeekly') },
      { key: 'monthly', label: t('assistant.quotaMonthly') },
    ]
    const capped = windows
      .map(w => ({ ...w, remaining: q.remaining[w.key], limit: q.limits[w.key] }))
      .filter(w => w.remaining !== null && w.limit > 0)
    if (!capped.length)
      return null
    return capped.reduce((a, b) => ((b.remaining as number) < (a.remaining as number) ? b : a))
  })

  const snack = ref({ show: false, text: '', color: 'success' })
  function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
  function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('assistant.failed'), 'error') }

  async function loadContext() {
    try {
      const r: AssistantContextResponse = await api.assistant.context()
      governance.value = r.governance
      context.value = r.context
      suggestions.value = r.suggestions
      nudges.value = r.nudges
      quota.value = r.quota ?? null
    }
    catch (e) { fail(e) }
  }

  // ── المساعد ──
  const conversations = ref<AssistantConversationRow[]>([])
  const activeConvId = ref<number | null>(null)
  const messages = ref<ChatBubble[]>([])
  const input = ref('')
  const sending = ref(false)
  const listRef = ref<HTMLElement | null>(null)
  const lastBlocked = ref(false)

  async function scrollDown() { await nextTick(); if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight }

  async function loadConversations() {
    try { conversations.value = await api.assistant.conversations() }
    catch { /* تجاهل */ }
  }
  function greet() {
    const name = context.value?.name ? ` ${context.value.name}` : ''
    messages.value = [{ role: 'assistant', body: t('assistant.greeting', { name }) }]
    lastBlocked.value = false
  }
  function newConversation() { activeConvId.value = null; greet() }
  async function openConversation(id: number) {
    try {
      const d = await api.assistant.conversation(id)
      activeConvId.value = d.id
      messages.value = d.messages.map(m => ({ role: m.role, body: m.body, meta: m.meta }))
      mode.value = 'assistant'
      await scrollDown()
    }
    catch (e) { fail(e) }
  }
  async function send(text?: string) {
    const content = (text ?? input.value).trim()
    if (!content || sending.value)
      return
    messages.value.push({ role: 'user', body: content })
    input.value = ''
    sending.value = true
    await scrollDown()
    try {
      const r = await api.assistant.message(content, activeConvId.value ?? undefined)
      activeConvId.value = r.conversationId
      lastBlocked.value = r.blocked
      messages.value.push({ role: 'assistant', body: r.reply, meta: r.meta })
      if (r.nudges?.length)
        nudges.value = r.nudges
      if (r.quota)
        quota.value = r.quota
      loadConversations()
    }
    catch (e) { fail(e) }
    finally { sending.value = false; await scrollDown() }
  }

  // ── التصعيد للدعم البشريّ ──
  async function escalate() {
    try {
      const title = conversations.value.find(c => c.id === activeConvId.value)?.title
      const tk = await api.assistant.escalate({ conversationId: activeConvId.value ?? undefined, subject: title, category: 'other' })
      toast(t('assistant.escalated'))
      mode.value = 'support'
      await loadTickets()
      openTicket(tk.id)
    }
    catch (e) { fail(e) }
  }

  // ── الدعم (تذاكر/محادثات) ──
  const tickets = ref<SupportTicketRow[]>([])
  const activeTicket = ref<SupportTicketDetail | null>(null)
  const ticketInput = ref('')
  const creatingTicket = ref(false)
  const newTicket = ref<{ subject: string, category: string, priority: string, body: string }>({ subject: '', category: 'other', priority: 'normal', body: '' })

  const CATEGORIES = computed(() => [
    { value: 'billing', title: t('assistant.catBilling') }, { value: 'technical', title: t('assistant.catTechnical') },
    { value: 'account', title: t('assistant.catAccount') }, { value: 'other', title: t('assistant.catOther') },
  ])
  const PRIORITIES = computed(() => [
    { value: 'low', title: t('assistant.prioLow') }, { value: 'normal', title: t('assistant.prioNormal') },
    { value: 'high', title: t('assistant.prioHigh') }, { value: 'urgent', title: t('assistant.prioUrgent') },
  ])
  const STATUS_COLOR: Record<string, ChipColor> = { open: 'info', pending: 'warning', resolved: 'success', closed: 'neutral' }

  async function loadTickets() {
    try { tickets.value = await api.support.tickets() }
    catch { /* تجاهل */ }
  }
  async function openTicket(id: number) {
    try { activeTicket.value = await api.support.ticket(id); creatingTicket.value = false; mode.value = 'support'; await scrollDown() }
    catch (e) { fail(e) }
  }
  function startNewTicket() { creatingTicket.value = true; activeTicket.value = null; newTicket.value = { subject: '', category: 'other', priority: 'normal', body: '' } }
  async function createTicket() {
    if (!newTicket.value.subject.trim() || !newTicket.value.body.trim())
      return
    try {
      const tk = await api.support.createTicket({ ...newTicket.value })
      toast(t('assistant.ticketCreated'))
      await loadTickets()
      openTicket(tk.id)
    }
    catch (e) { fail(e) }
  }
  async function replyTicket() {
    if (!ticketInput.value.trim() || !activeTicket.value)
      return
    try {
      activeTicket.value = await api.support.replyTicket(activeTicket.value.id, ticketInput.value.trim())
      ticketInput.value = ''
      loadTickets()
      await scrollDown()
    }
    catch (e) { fail(e) }
  }

  // ── الإعدادات/الخصوصيّة ──
  const prefs = ref({ dataAccess: true, proactive: true })
  async function loadSettings() { try { prefs.value = await api.assistant.settings() } catch { /* تجاهل */ } }
  async function saveSettings() {
    try {
      prefs.value = await api.assistant.updateSettings({ data_access: prefs.value.dataAccess, proactive: prefs.value.proactive })
      toast(t('assistant.settingsSaved'))
      loadContext()
    }
    catch (e) { fail(e) }
  }

  function toneColor(tone: string) { return `rgb(var(--v-theme-${tone === 'amber' ? 'warning' : tone}))` }
  function toolLabel(key: string) { const k = `assistant.tool_${key}`; const l = t(k); return l === k ? key : l }

  // ── التهيئة (كسولة عند أوّل فتح) + البثّ اللحظيّ (دائم للشارة) ──
  let unsubscribeTickets: (() => void) | null = null
  let initialized = false
  async function init() {
    if (initialized)
      return
    initialized = true
    await loadContext(); greet(); loadConversations(); loadTickets(); loadSettings()
  }
  onMounted(() => {
    // لا نُحمّل المحتوى إلّا عند أوّل فتح؛ لكن نستمع للبثّ دائمًا كي تتراكم شارة «غير-مقروء».
    const uuid = useAuthStore().authUser?.uuid
    if (uuid) {
      unsubscribeTickets = subscribeUserTickets(uuid, (e) => {
        if (activeTicket.value && activeTicket.value.id === e.ticketId && !activeTicket.value.replies.some(x => x.id === e.reply.id)) {
          activeTicket.value = { ...activeTicket.value, status: e.status, replies: [...activeTicket.value.replies, e.reply] }
          scrollDown()
        }
        loadTickets()
        if (e.reply.isStaff)
          widget.bumpUnread() // ردّ دعم جديد والويدجت مغلق ⇒ شارة غير-مقروء
      })
    }
  })
  onUnmounted(() => unsubscribeTickets?.())

  return {
    mode, governance, context, suggestions, nudges, quota, quotaRemaining, snack, toast, fail, loadContext,
    conversations, activeConvId, messages, input, sending, listRef, lastBlocked, scrollDown,
    loadConversations, greet, newConversation, openConversation, send, escalate,
    tickets, activeTicket, ticketInput, creatingTicket, newTicket, CATEGORIES, PRIORITIES, STATUS_COLOR,
    loadTickets, openTicket, startNewTicket, createTicket, replyTicket,
    prefs, loadSettings, saveSettings, toneColor, toolLabel, init,
  }
}

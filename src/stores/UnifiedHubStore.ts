import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { UserRole } from '@/interfaces/Auth'
import { useAuthStore } from '@/stores/AuthStore'
import { useExpertRolesStore } from '@/stores/ExpertRolesStore'
import { KIND_META as INTERVIEW_KIND_META, useInterviewersStore } from '@/stores/InterviewersStore'
import { PEER_TYPE_META, usePeerRequestsStore } from '@/stores/PeerRequestsStore'
import type { PeerRequestType } from '@/stores/PeerRequestsStore'
import { useRoleRequestsStore } from '@/stores/RoleRequestsStore'
import { useWishesStore } from '@/stores/WishesStore'

// ===== المركز الموحّد — طبقة تجميع WorkItem من مخازن الأدوار (بلا نسخ بيانات) =====
// مصدر الحقيقة يبقى في المخازن الأصلية؛ هنا مجرد اشتقاق computed + دوال نقية للفلترة/الفرز/التجميع

export type WorkItemKind
  = 'interview_request' // طلب مقابلة (مقيّم)
    | 'interview_upcoming' // مقابلة قادمة (مقيّم)
    | 'peer_request' // طلب متبادل وارد
    | 'consulting_request' // طلب استشارة B2B
    | 'trainee_referral' // متدرب مُحال
    | 'wish_incoming' // رغبة واردة (باحث)
    | 'offer_incoming' // عرض ذاتي وارد (شركة)
    | 'role_approval' // اعتماد دور (مدير)
    | 'my_booking' // حجزي كمرشح

/** يحتاج قرارًا الآن / موعد قادم / للاطلاع */
export type WorkItemUrgency = 'action' | 'upcoming' | 'info'

export interface WorkItem {
  /** معرّف مركّب فريد عبر كل المصادر */
  id: string
  sourceId: number
  role: UserRole
  kind: WorkItemKind
  title: string
  party: string
  partyInitial: string
  dateLabel: string
  status: string
  statusColor: string
  urgency: WorkItemUrgency
  /** 1 أعلى أولوية */
  priority: 1 | 2 | 3
  amount?: number
  amountLabel?: string
  actionTo: string
  icon: string
  color: string
}

export const KIND_META: Record<WorkItemKind, { label: string, icon: string, color: string }> = {
  interview_request: { label: 'طلب مقابلة', icon: 'mdi-account-tie-voice-outline', color: 'accent' },
  interview_upcoming: { label: 'مقابلة قادمة', icon: 'mdi-calendar-clock-outline', color: 'info' },
  peer_request: { label: 'طلب متبادل', icon: 'mdi-swap-horizontal-circle-outline', color: 'secondary' },
  consulting_request: { label: 'طلب استشارة', icon: 'mdi-lightbulb-on-outline', color: 'warning' },
  trainee_referral: { label: 'متدرب مُحال', icon: 'mdi-school-outline', color: 'teal' },
  wish_incoming: { label: 'رغبة واردة', icon: 'mdi-hand-heart-outline', color: 'accent' },
  offer_incoming: { label: 'عرض وارد', icon: 'mdi-briefcase-arrow-left-right-outline', color: 'primary' },
  role_approval: { label: 'اعتماد دور', icon: 'mdi-shield-check-outline', color: 'error' },
  my_booking: { label: 'حجزي كمرشح', icon: 'mdi-account-search-outline', color: 'primary' },
}

export const URGENCY_META: Record<WorkItemUrgency, { label: string, color: string, icon: string }> = {
  action: { label: 'يحتاج قرارك', color: 'error', icon: 'mdi-gesture-tap-button' },
  upcoming: { label: 'موعد قادم', color: 'info', icon: 'mdi-calendar-clock-outline' },
  info: { label: 'للاطلاع', color: 'surface-variant', icon: 'mdi-information-outline' },
}

/** الطلبات المتبادلة تُنسب لدور المستقبِل بحسب نوع الخدمة المطلوبة */
const PEER_TYPE_TO_ROLE: Record<PeerRequestType, UserRole> = {
  recommendation: 'seeker',
  endorsement: 'seeker',
  evaluation: 'interviewer',
  level: 'interviewer',
  interview: 'interviewer',
  consultation: 'consultant',
  training: 'trainer',
  coaching: 'coach',
}

/** يستخرج رقمًا من نص مالي عربي مثل «18,000 ر.س» — undefined إن خلا من الأرقام */
export function parseAmount(label: string | undefined): number | undefined {
  if (!label)
    return undefined
  const digits = label.replace(/[^\d]/g, '')
  return digits ? Number(digits) : undefined
}

// ===== دوال نقية للفلترة والفرز والتجميع (قابلة للاختبار مباشرة) =====

export interface HubFilter {
  roles?: UserRole[]
  kinds?: WorkItemKind[]
  urgencies?: WorkItemUrgency[]
  query?: string
}

export function filterItems(items: WorkItem[], f: HubFilter): WorkItem[] {
  const q = (f.query ?? '').trim()
  return items.filter(i =>
    (!f.roles?.length || f.roles.includes(i.role))
    && (!f.kinds?.length || f.kinds.includes(i.kind))
    && (!f.urgencies?.length || f.urgencies.includes(i.urgency))
    && (!q || i.title.includes(q) || i.party.includes(q) || i.status.includes(q)),
  )
}

export type HubSortKey = 'priority' | 'amount' | 'recent'

export function sortItems(items: WorkItem[], key: HubSortKey): WorkItem[] {
  const list = [...items]
  if (key === 'priority')
    return list.sort((a, b) => a.priority - b.priority)
  if (key === 'amount')
    return list.sort((a, b) => (b.amount ?? -1) - (a.amount ?? -1))
  return list // recent: ترتيب المصادر نفسه (الأحدث أولًا في مخازنها)
}

export type HubGroupKey = 'role' | 'kind' | 'urgency' | 'none'

export interface HubGroup { key: string, items: WorkItem[] }

export function groupItems(items: WorkItem[], by: HubGroupKey): HubGroup[] {
  if (by === 'none')
    return items.length ? [{ key: 'all', items }] : []
  const map = new Map<string, WorkItem[]>()
  for (const i of items) {
    const k = i[by]
    if (!map.has(k))
      map.set(k, [])
    map.get(k)!.push(i)
  }
  return [...map.entries()].map(([key, groupItems]) => ({ key, items: groupItems }))
}

export const useUnifiedHubStore = defineStore('unifiedHub', () => {
  const auth = useAuthStore()
  const interviewersStore = useInterviewersStore()
  const peerStore = usePeerRequestsStore()
  const expertStore = useExpertRolesStore()
  const wishesStore = useWishesStore()
  const roleRequestsStore = useRoleRequestsStore()

  // —— adapters: كل مصدر يتحول لعناصر WorkItem، مشروطًا بامتلاك الدور ——

  const interviewerItems = computed<WorkItem[]>(() => {
    if (!auth.ownsRole('interviewer'))
      return []
    const requests = interviewersStore.agendaRequests.map<WorkItem>(a => ({
      id: `interview_request-${a.id}`,
      sourceId: a.id,
      role: 'interviewer',
      kind: 'interview_request',
      title: `${INTERVIEW_KIND_META[a.kind].label} — ${a.candidateField}`,
      party: a.candidateName,
      partyInitial: a.candidateInitial,
      dateLabel: a.datetime,
      status: 'بانتظار قبولك',
      statusColor: 'warning',
      urgency: 'action',
      priority: 1,
      amount: a.price,
      amountLabel: `${a.price} ﷼`,
      actionTo: '/interviewer',
      icon: KIND_META.interview_request.icon,
      color: KIND_META.interview_request.color,
    }))
    const upcoming = interviewersStore.agendaUpcoming.map<WorkItem>(a => ({
      id: `interview_upcoming-${a.id}`,
      sourceId: a.id,
      role: 'interviewer',
      kind: 'interview_upcoming',
      title: `${INTERVIEW_KIND_META[a.kind].label}`,
      party: a.candidateName,
      partyInitial: a.candidateInitial,
      dateLabel: a.datetime,
      status: 'مجدولة',
      statusColor: 'info',
      urgency: 'upcoming',
      priority: 2,
      amount: a.price,
      amountLabel: `${a.price} ﷼`,
      actionTo: `/interviewer/session/${a.id}`,
      icon: KIND_META.interview_upcoming.icon,
      color: KIND_META.interview_upcoming.color,
    }))
    return [...requests, ...upcoming]
  })

  const peerItems = computed<WorkItem[]>(() =>
    peerStore.incoming
      .filter(r => r.status === 'pending')
      .map<WorkItem>(r => ({
        id: `peer_request-${r.id}`,
        sourceId: r.id,
        role: auth.ownsRole(PEER_TYPE_TO_ROLE[r.type]) ? PEER_TYPE_TO_ROLE[r.type] : 'seeker',
        kind: 'peer_request',
        title: `${PEER_TYPE_META[r.type].label} — ${r.reason}`,
        party: r.personName,
        partyInitial: r.personName.trim().charAt(0),
        dateLabel: r.date,
        status: 'بانتظار ردّك',
        statusColor: 'warning',
        urgency: 'action',
        priority: 2,
        actionTo: '/peer-requests',
        icon: PEER_TYPE_META[r.type].icon,
        color: PEER_TYPE_META[r.type].color,
      })),
  )

  const consultantItems = computed<WorkItem[]>(() => {
    if (!auth.ownsRole('consultant'))
      return []
    return expertStore.state.consulting
      .filter(c => c.status === 'new' || c.status === 'in_progress')
      .map<WorkItem>(c => ({
        id: `consulting_request-${c.id}`,
        sourceId: c.id,
        role: 'consultant',
        kind: 'consulting_request',
        title: c.topic,
        party: c.company,
        partyInitial: c.company.trim().charAt(0),
        dateLabel: c.date,
        status: c.status === 'new' ? 'طلب جديد' : 'قيد التنفيذ',
        statusColor: c.status === 'new' ? 'warning' : 'primary',
        urgency: c.status === 'new' ? 'action' : 'upcoming',
        priority: c.status === 'new' ? 1 : 2,
        amount: parseAmount(c.budget),
        amountLabel: c.budget,
        actionTo: '/consultant',
        icon: KIND_META.consulting_request.icon,
        color: KIND_META.consulting_request.color,
      }))
  })

  const trainerItems = computed<WorkItem[]>(() => {
    if (!auth.ownsRole('trainer'))
      return []
    return expertStore.state.trainees
      .filter(t => t.status === 'new')
      .map<WorkItem>(t => ({
        id: `trainee_referral-${t.id}`,
        sourceId: t.id,
        role: 'trainer',
        kind: 'trainee_referral',
        title: t.gap,
        party: t.name,
        partyInitial: t.initial,
        dateLabel: t.source,
        status: 'ترشيح جديد',
        statusColor: 'teal',
        urgency: 'action',
        priority: 2,
        actionTo: '/trainer',
        icon: KIND_META.trainee_referral.icon,
        color: KIND_META.trainee_referral.color,
      }))
  })

  const seekerWishItems = computed<WorkItem[]>(() => {
    if (!auth.ownsRole('seeker'))
      return []
    return wishesStore.wishes
      .filter(w => w.status === 'new')
      .map<WorkItem>(w => ({
        id: `wish_incoming-${w.id}`,
        sourceId: w.id,
        role: 'seeker',
        kind: 'wish_incoming',
        title: `${w.role} (${w.duration})`,
        party: w.company,
        partyInitial: w.companyInitial,
        dateLabel: `تطابق ${w.matchRate}%`,
        status: 'رغبة جديدة',
        statusColor: 'accent',
        urgency: 'action',
        priority: 1,
        amount: parseAmount(w.amount),
        amountLabel: w.amount,
        actionTo: '/wishes',
        icon: KIND_META.wish_incoming.icon,
        color: KIND_META.wish_incoming.color,
      }))
  })

  const companyOfferItems = computed<WorkItem[]>(() => {
    if (!auth.ownsRole('company'))
      return []
    return wishesStore.received
      .filter(o => o.status === 'new')
      .map<WorkItem>(o => ({
        id: `offer_incoming-${o.id}`,
        sourceId: o.id,
        role: 'company',
        kind: 'offer_incoming',
        title: o.service,
        party: o.candidateName,
        partyInitial: o.candidateInitial,
        dateLabel: o.date,
        status: 'عرض جديد',
        statusColor: 'primary',
        urgency: 'action',
        priority: 2,
        amount: parseAmount(o.amount),
        amountLabel: o.amount,
        actionTo: '/company/wishes',
        icon: KIND_META.offer_incoming.icon,
        color: KIND_META.offer_incoming.color,
      }))
  })

  const adminItems = computed<WorkItem[]>(() => {
    if (!auth.ownsRole('admin'))
      return []
    return roleRequestsStore.pending.map<WorkItem>(r => ({
      id: `role_approval-${r.id}`,
      sourceId: r.id,
      role: 'admin',
      kind: 'role_approval',
      title: r.note,
      party: r.userName,
      partyInitial: r.userName.trim().charAt(0),
      dateLabel: r.date,
      status: 'بانتظار الاعتماد',
      statusColor: 'error',
      urgency: 'action',
      priority: 1,
      actionTo: '/admin',
      icon: KIND_META.role_approval.icon,
      color: KIND_META.role_approval.color,
    }))
  })

  const myBookingItems = computed<WorkItem[]>(() => {
    if (!auth.ownsRole('seeker'))
      return []
    return interviewersStore.bookings
      .filter(b => b.status === 'scheduled' || b.status === 'requested')
      .map<WorkItem>(b => ({
        id: `my_booking-${b.id}`,
        sourceId: b.id,
        role: 'seeker',
        kind: 'my_booking',
        title: INTERVIEW_KIND_META[b.kind].label,
        party: b.interviewerName,
        partyInitial: b.interviewerName.trim().charAt(0),
        dateLabel: b.datetime,
        status: b.status === 'scheduled' ? 'مؤكد' : 'بانتظار المقيّم',
        statusColor: b.status === 'scheduled' ? 'success' : 'warning',
        urgency: 'upcoming',
        priority: 3,
        amount: b.price,
        amountLabel: `${b.price} ﷼`,
        actionTo: '/interviews',
        icon: KIND_META.my_booking.icon,
        color: KIND_META.my_booking.color,
      }))
  })

  /** كل عناصر العمل عبر الأدوار المملوكة */
  const allItems = computed<WorkItem[]>(() => [
    ...interviewerItems.value,
    ...consultantItems.value,
    ...trainerItems.value,
    ...seekerWishItems.value,
    ...companyOfferItems.value,
    ...adminItems.value,
    ...peerItems.value,
    ...myBookingItems.value,
  ])

  const actionItems = computed(() => allItems.value.filter(i => i.urgency === 'action'))
  const upcomingItems = computed(() => allItems.value.filter(i => i.urgency === 'upcoming'))

  // —— KPIs عابرة للأدوار ——
  const kpis = computed(() => {
    const pendingMoney = actionItems.value.reduce((s, i) => s + (i.amount ?? 0), 0)
    let earnings = 0
    if (auth.ownsRole('interviewer'))
      earnings += interviewersStore.interviewerStats.earnings
    if (auth.ownsRole('trainer'))
      earnings += expertStore.trainerStats.revenue
    if (auth.ownsRole('coach'))
      earnings += expertStore.coachStats.monthlyRecurring
    return {
      actionCount: actionItems.value.length,
      upcomingCount: upcomingItems.value.length,
      pendingMoney,
      earnings,
      activeRoles: auth.activeRoles.length,
    }
  })

  /** ملخص مصغّر لكل دور نشط — يغذي بطاقات الأدوار في المركز */
  const roleSummaries = computed(() => {
    const rows: { role: UserRole, facts: string[], home: string }[] = []
    if (auth.ownsRole('seeker')) {
      rows.push({
        role: 'seeker',
        facts: [
          `${seekerWishItems.value.length} رغبات جديدة`,
          `${myBookingItems.value.length} حجوزات قائمة`,
        ],
        home: 'dashboard',
      })
    }
    if (auth.ownsRole('interviewer')) {
      const s = interviewersStore.interviewerStats
      rows.push({
        role: 'interviewer',
        facts: [`${s.pending} طلبات معلّقة`, `${s.upcoming} مقابلات قادمة`, `${s.earnings} ﷼ أرباح`],
        home: 'interviewer-dashboard',
      })
    }
    if (auth.ownsRole('company')) {
      rows.push({
        role: 'company',
        facts: [`${companyOfferItems.value.length} عروض جديدة`, `${wishesStore.sentPending} رغبات معلّقة`],
        home: 'dashboard',
      })
    }
    if (auth.ownsRole('coach')) {
      const s = expertStore.coachStats
      rows.push({
        role: 'coach',
        facts: [`${s.clients} عملاء`, `${s.monthlyRecurring} ﷼ اشتراكات`, `تقدم ${s.avgProgress}%`],
        home: 'coach-dashboard',
      })
    }
    if (auth.ownsRole('trainer')) {
      const s = expertStore.trainerStats
      rows.push({
        role: 'trainer',
        facts: [`${s.newReferrals} إحالات جديدة`, `${s.trainees} متدربًا`, `${s.revenue} ﷼ إيراد`],
        home: 'trainer-dashboard',
      })
    }
    if (auth.ownsRole('consultant')) {
      const s = expertStore.consultantStats
      rows.push({
        role: 'consultant',
        facts: [`${s.newRequests} طلبات جديدة`, `${s.active} نشطة`, `${s.done} منجزة`],
        home: 'consultant-dashboard',
      })
    }
    return rows
  })

  /**
   * تنفيذ قرار قبول/رفض من الصندوق الموحّد مباشرة — يفوّض للمخزن الأصلي.
   * يعيد false للأنواع التي تحتاج سياقًا أعمق (تُفتح صفحتها عبر actionTo).
   */
  function resolveItem(item: WorkItem, accept: boolean): boolean {
    switch (item.kind) {
      case 'interview_request':
        accept ? interviewersStore.acceptRequest(item.sourceId) : interviewersStore.declineRequest(item.sourceId)
        return true
      case 'peer_request':
        accept ? peerStore.accept(item.sourceId) : peerStore.reject(item.sourceId)
        return true
      case 'consulting_request': {
        const r = expertStore.state.consulting.find(c => c.id === item.sourceId)
        if (r?.status !== 'new')
          return false // قيد التنفيذ: الإنجاز والتحصيل من لوحة المستشار
        expertStore.respondConsulting(item.sourceId, accept)
        return true
      }
      case 'wish_incoming':
        wishesStore.setStatus(item.sourceId, accept ? 'accepted' : 'rejected')
        return true
      case 'offer_incoming':
        wishesStore.respondOffer(item.sourceId, accept ? 'accepted' : 'declined')
        return true
      case 'role_approval':
        roleRequestsStore.decide(item.sourceId, accept)
        return true
      default:
        return false // trainee_referral / my_booking / interview_upcoming: عبر صفحتها
    }
  }

  return {
    allItems, actionItems, upcomingItems,
    kpis, roleSummaries, resolveItem,
  }
})

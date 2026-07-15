import type { RouteLocationRaw } from 'vue-router'

/**
 * خريطة إجراءات الـnudges السلوكيّة → وجهات داخليّة، كي «يرسل» المساعد المستخدمَ
 * لأقسام المنصّة المناسبة. القيم مصدرها الباك-إند (AssistantService::nudges).
 */
const NUDGE_ROUTES: Record<string, RouteLocationRaw> = {
  'post-opportunity': { name: 'create-opportunity' },
  'marketplace': { name: 'opportunities' },
  'profile': { name: 'profile' },
  'settings-plan': { name: 'settings', query: { tab: 'plan' } },
}

/** وجهة داخليّة لإجراء nudge (أو null إن كان غير معروف/فارغ). */
export function nudgeRoute(action?: string | null): RouteLocationRaw | null {
  return action ? (NUDGE_ROUTES[action] ?? null) : null
}

export interface TextPart { type: 'text' | 'link', value: string }

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]}'"])/gi

/**
 * يقسّم نصّ الرسالة إلى مقاطع نصّ/رابط لعرض الروابط قابلةً للنقر بأمان (بلا v-html).
 */
export function linkifyParts(text: string): TextPart[] {
  const parts: TextPart[] = []
  let last = 0
  for (const m of text.matchAll(URL_RE)) {
    const i = m.index ?? 0
    if (i > last)
      parts.push({ type: 'text', value: text.slice(last, i) })
    parts.push({ type: 'link', value: m[0] })
    last = i + m[0].length
  }
  if (last < text.length)
    parts.push({ type: 'text', value: text.slice(last) })
  return parts.length ? parts : [{ type: 'text', value: text }]
}

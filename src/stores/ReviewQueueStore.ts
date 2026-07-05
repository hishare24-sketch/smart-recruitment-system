import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { syncPrivateDoc } from '@/services/cloudSync'

// ============================================================================
// طابور المراجعة الإدارية للتصنيف (المرحلة 3 من خطة التصنيف).
// يجمع العناصر التي وجّهتها الحوكمة للمراجعة (كلمة عامة · بلا تطابق · غموض · أخرى)
// كي يعالجها الأدمن بدل قبول تصنيف غير دقيق بصمت. المرجع: DOC/TAXONOMY_PLAN.md
// ============================================================================
export type ReviewItemKind = 'opportunity' | 'request' | 'skill' | 'profile' | 'other'

export interface ReviewItem {
  id: number
  kind: ReviewItemKind
  title: string
  reason: string
  suggestedSector?: string
  createdAt: string
  resolved: boolean
}

const STORAGE_KEY = 'reviewQueue'

function load(): ReviewItem[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return []
  try {
    return JSON.parse(raw) as ReviewItem[]
  }
  catch {
    return []
  }
}

let nextId = 1

export const useReviewQueueStore = defineStore('reviewQueue', () => {
  const items = ref<ReviewItem[]>(load())
  // أعلى مُعرّف موجود + 1 (تفاديًا للتصادم بعد الإماهة)
  nextId = items.value.reduce((m, i) => Math.max(m, i.id), 0) + 1

  watch(items, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط
  const { status: syncStatus } = syncPrivateDoc({
    store: 'reviewQueue',
    snapshot: () => items.value,
    apply: (incoming) => {
      if (Array.isArray(incoming))
        items.value = incoming as ReviewItem[]
    },
    source: items,
  })

  const pending = computed(() => items.value.filter(i => !i.resolved))
  const pendingCount = computed(() => pending.value.length)

  /** أضِف عنصرًا للطابور (يتجاهل التكرار المطابق غير المحلول لنفس النوع/العنوان) */
  function flag(entry: { kind: ReviewItemKind, title: string, reason: string, suggestedSector?: string }): ReviewItem | undefined {
    const dup = items.value.find(i => !i.resolved && i.kind === entry.kind && i.title === entry.title)
    if (dup)
      return dup
    const item: ReviewItem = {
      id: nextId++,
      kind: entry.kind,
      title: entry.title,
      reason: entry.reason,
      suggestedSector: entry.suggestedSector,
      createdAt: 'الآن',
      resolved: false,
    }
    items.value = [item, ...items.value]
    return item
  }

  function resolve(id: number) {
    const it = items.value.find(i => i.id === id)
    if (it)
      it.resolved = true
  }

  function remove(id: number) {
    items.value = items.value.filter(i => i.id !== id)
  }

  return { items, syncStatus, pending, pendingCount, flag, resolve, remove }
})

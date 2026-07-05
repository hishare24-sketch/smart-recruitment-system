import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { syncPrivateDoc, syncPublicProfileDoc } from './cloudSync'

// المفتاح مطفأ في الاختبارات (USE_REAL_API=false) — لا مزامنة سحابية ولا شبكة؛
// تبقى الحالة محلية (localStorage في المخزن) والحالة 'off'.
describe('cloudSync (NestJS routing — flag off in tests)', () => {
  it('syncPrivateDoc لمخزن مُدرَج: لا شبكة، الحالة off', () => {
    const src = ref<number[]>([])
    const apply = vi.fn()
    const { status } = syncPrivateDoc({ store: 'wallet', snapshot: () => src.value, apply, source: src })
    expect(status.value).toBe('off')
    expect(apply).not.toHaveBeenCalled()
  })

  it('syncPrivateDoc لمخزن غير مُدرَج: الحالة off أيضًا', () => {
    const src = ref(0)
    const { status } = syncPrivateDoc({ store: 'not-listed', snapshot: () => src.value, apply: () => {}, source: src })
    expect(status.value).toBe('off')
  })

  it('التعديل بعد الإنشاء لا ينهار ولا يلمس الشبكة (وضع محلي)', async () => {
    const src = ref<string[]>([])
    const { status } = syncPrivateDoc({ store: 'requests', snapshot: () => src.value, apply: () => {}, source: src })
    src.value = ['x']
    await Promise.resolve()
    expect(status.value).toBe('off')
  })

  it('syncPublicProfileDoc: الصفحة العامة عبر موردها المخصّص — off هنا', () => {
    const src = ref({})
    const { status } = syncPublicProfileDoc({ slug: () => 'ahmed', snapshot: () => src.value, apply: () => {}, source: src })
    expect(status.value).toBe('off')
  })
})

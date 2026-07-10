import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSectorContext } from './useSectorContext'
import { usePersonaStore } from '@/stores/PersonaStore'
import { useProfileStore } from '@/stores/ProfileStore'

/** يضبط مهارات الملف إلى قائمة محدّدة (لِتحكُّم القطاع المشتقّ) */
function setSkills(names: string[]) {
  const profile = useProfileStore()
  profile.skills.splice(0, profile.skills.length)
  for (const n of names)
    profile.addSkill(n, 3)
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('useSectorContext — المصادر والاتّحاد', () => {
  it('بلا سياق: has=false والقيم فارغة والأدوات محايدة', () => {
    setSkills([]) // لا مهارات → لا اشتقاق
    const ctx = useSectorContext()
    expect(ctx.has.value).toBe(false)
    expect(ctx.effective.value).toEqual([])
    expect(ctx.primary.value).toBeUndefined()
    expect(ctx.boost('technology')).toBe(0)
    expect(ctx.seedTree()).toEqual({})
    expect(ctx.matchInput()).toEqual({})
  })

  it('explicit فقط: effective = التفضيل الصريح (slugs)', () => {
    setSkills([])
    usePersonaStore().setInterestedSectors(['finance', 'technology'])
    const ctx = useSectorContext()
    expect(ctx.has.value).toBe(true)
    expect(ctx.explicit.value.sort()).toEqual(['finance', 'technology'])
    expect(ctx.derived.value).toEqual([])
    expect(ctx.effective.value.sort()).toEqual(['finance', 'technology'])
  })

  it('derived فقط: يُشتقّ القطاع من المهارات حين لا تفضيل صريح', () => {
    setSkills(['AutoCAD']) // ضمن الهندسة S05
    const ctx = useSectorContext()
    expect(ctx.explicit.value).toEqual([])
    expect(ctx.derived.value).toEqual(['engineering'])
    expect(ctx.effective.value).toEqual(['engineering'])
  })

  it('الاتّحاد: explicit ∪ derived بلا تكرار', () => {
    setSkills(['AutoCAD']) // engineering
    usePersonaStore().setInterestedSectors(['finance'])
    const ctx = useSectorContext()
    expect(ctx.effective.value.sort()).toEqual(['engineering', 'finance'])
  })

  it('الاتّحاد يزيل تكرار القطاع المشترك بين الصريح والمشتقّ', () => {
    setSkills(['PHP']) // technology S01
    usePersonaStore().setInterestedSectors(['technology'])
    const ctx = useSectorContext()
    expect(ctx.effective.value).toEqual(['technology'])
  })
})

describe('useSectorContext — hasExplicit والحوكمة (S21)', () => {
  it('hasExplicit=false للمشتقّ وحده، true عند اختيار صريح', () => {
    setSkills(['PHP']) // technology مشتقّ فقط
    const ctx = useSectorContext()
    expect(ctx.has.value).toBe(true)
    expect(ctx.hasExplicit.value).toBe(false)
    usePersonaStore().setInterestedSectors(['finance'])
    expect(ctx.hasExplicit.value).toBe(true)
  })

  it('يستبعد S21 («أخرى») من السياق — لا يصلح للتخصيص', () => {
    setSkills([])
    usePersonaStore().setInterestedSectors(['other', 'technology']) // other = S21
    const ctx = useSectorContext()
    expect(ctx.effective.value).toEqual(['technology'])
    expect(ctx.primary.value).toBe('technology')
    expect(ctx.inEffective('other')).toBe(false)
  })

  it('S21 وحده كاختيار صريح ⇒ لا سياق فعّال (has=false)', () => {
    setSkills([])
    usePersonaStore().setInterestedSectors(['other'])
    const ctx = useSectorContext()
    expect(ctx.has.value).toBe(false)
    expect(ctx.hasExplicit.value).toBe(false)
    expect(ctx.primary.value).toBeUndefined()
  })
})

describe('useSectorContext — القطاع الأبرز (primary)', () => {
  it('يختار الأعلى أولويّة عرض بين القطاعات الصريحة', () => {
    setSkills([])
    // technology=S01 (pri1) أبرز من finance=S03 (pri3)
    usePersonaStore().setInterestedSectors(['finance', 'technology'])
    const ctx = useSectorContext()
    expect(ctx.primary.value).toBe('technology')
  })

  it('يفضّل الصريح على المشتقّ حتى لو كان المشتقّ أعلى أولويّة', () => {
    setSkills(['PHP']) // technology S01 (pri1) — مشتقّ
    usePersonaStore().setInterestedSectors(['finance']) // S03 (pri3) — صريح
    const ctx = useSectorContext()
    expect(ctx.primary.value).toBe('finance')
  })
})

describe('useSectorContext — boost', () => {
  it('يدرّج الترجيح: الأبرز 1، صريح آخر 0.8، مشتقّ 0.4، خارج السياق 0', () => {
    setSkills(['AutoCAD']) // engineering — مشتقّ
    usePersonaStore().setInterestedSectors(['technology', 'finance'])
    const ctx = useSectorContext()
    expect(ctx.primary.value).toBe('technology')
    expect(ctx.boost('technology')).toBe(1) // الأبرز
    expect(ctx.boost('finance')).toBe(0.8) // صريح آخر
    expect(ctx.boost('engineering')).toBe(0.4) // مشتقّ
    expect(ctx.boost('health')).toBe(0) // خارج السياق
    expect(ctx.boost(undefined)).toBe(0)
  })

  it('يقبل code وslug والمعرّف القديم (getSector)', () => {
    setSkills([])
    usePersonaStore().setInterestedSectors(['technology'])
    const ctx = useSectorContext()
    expect(ctx.boost('S01')).toBe(1) // code
    expect(ctx.boost('technology')).toBe(1) // slug
  })
})

describe('useSectorContext — inEffective (شريحة «قطاعاتي»)', () => {
  it('يطابق القطاعات ضمن الاتّحاد ويرفض ما عداها', () => {
    setSkills(['AutoCAD']) // engineering — مشتقّ
    usePersonaStore().setInterestedSectors(['technology'])
    const ctx = useSectorContext()
    expect(ctx.inEffective('technology')).toBe(true) // صريح
    expect(ctx.inEffective('S05')).toBe(true) // مشتقّ (بالـcode)
    expect(ctx.inEffective('health')).toBe(false) // خارج السياق
    expect(ctx.inEffective(undefined)).toBe(false) // بلا قطاع
  })
})

describe('useSectorContext — rankSearch & seedTree & matchInput', () => {
  const items = [
    { id: 'a', sector: 'health' },
    { id: 'b', sector: 'technology' },
    { id: 'c', sector: 'finance' },
    { id: 'd', sector: 'health' },
  ]
  const get = (x: { sector: string }) => x.sector

  it('يرفع عناصر قطاعات المستخدم مع ترتيب مستقرّ للمتساوين', () => {
    setSkills([])
    usePersonaStore().setInterestedSectors(['technology', 'finance'])
    const ctx = useSectorContext()
    const ranked = ctx.rankSearch(items, get).map(x => x.id)
    // technology (primary=1) ثم finance (0.8) ثم health وhealth بترتيبهما الأصلي
    expect(ranked).toEqual(['b', 'c', 'a', 'd'])
  })

  it('بلا سياق: rankSearch لا يغيّر الترتيب', () => {
    setSkills([])
    const ctx = useSectorContext()
    expect(ctx.rankSearch(items, get).map(x => x.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('seedTree/matchInput يعيدان القطاع الأبرز (slug)', () => {
    setSkills([])
    usePersonaStore().setInterestedSectors(['technology'])
    const ctx = useSectorContext()
    expect(ctx.seedTree()).toEqual({ category: 'technology' })
    expect(ctx.matchInput()).toEqual({ sector: 'technology' })
  })
})

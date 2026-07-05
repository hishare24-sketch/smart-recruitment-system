import { describe, expect, it } from 'vitest'
import { ALL_SKILLS, TAXONOMY, categorizeSkill, getCategory } from './taxonomy'
import { SECTORS } from './sectors'

// taxonomy.ts هو الآن طبقة توافق فوق sectors.ts — نختبر عقد التوافق لا بيانات مستقلة.
describe('taxonomy (compat adapter over sectors)', () => {
  it('projects all sectors as categories with subcategories and Vuetify colors', () => {
    expect(TAXONOMY.length).toBe(SECTORS.length)
    const vuetifyColors = new Set(['primary', 'secondary', 'accent', 'success', 'info', 'warning', 'error', 'on-surface'])
    for (const c of TAXONOMY) {
      expect(c.subcategories.length).toBeGreaterThan(0)
      expect(vuetifyColors.has(c.color)).toBe(true)
    }
  })

  it('classifies known skills into a valid category id', () => {
    expect(categorizeSkill('Vue.js')).toBe('technology')
    expect(categorizeSkill('Figma')).toBe('design')
    expect(categorizeSkill('AutoCAD')).toBe('engineering')
    // كل نتيجة تصنيف يجب أن تكون مُعرّف قطاع موجودًا
    const validIds = new Set(TAXONOMY.map(c => c.id))
    expect(validIds.has(categorizeSkill('PMP')!)).toBe(true)
  })

  it('returns undefined for unknown skills', () => {
    expect(categorizeSkill('نشاط غير معروف تمامًا')).toBeUndefined()
  })

  it('resolves categories by id and dedupes ALL_SKILLS', () => {
    expect(getCategory('technology')?.label).toBe('التقنية وتكنولوجيا المعلومات')
    expect(getCategory('nope')).toBeUndefined()
    expect(new Set(ALL_SKILLS).size).toBe(ALL_SKILLS.length)
  })
})

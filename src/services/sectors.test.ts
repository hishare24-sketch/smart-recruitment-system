import { describe, expect, it } from 'vitest'
import { TAXONOMY } from './taxonomy'
import {
  ALL_SECTOR_SKILLS,
  ALL_SUBS,
  GENERIC_BLOCKLIST,
  LEGACY_SECTOR_MAP,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_TYPE_IDS,
  OPP_TYPE_FROM_REQUEST_KIND,
  opportunityTypeLabel,
  SECTORS,
  getSector,
  isGenericLabel,
  migrateSector,
  sectorForSkill,
  sectorsByPriority,
  topSectors,
} from './sectors'

describe('sectors — structure', () => {
  it('has 21 sectors with unique codes S01..S21 and unique slugs', () => {
    expect(SECTORS.length).toBe(21)
    const codes = SECTORS.map(s => s.code)
    const ids = SECTORS.map(s => s.id)
    expect(new Set(codes).size).toBe(21)
    expect(new Set(ids).size).toBe(21)
    for (let i = 1; i <= 21; i++)
      expect(codes).toContain(`S${String(i).padStart(2, '0')}`)
  })

  it('has 96 sub-specialties total', () => {
    expect(ALL_SUBS.length).toBe(96)
  })

  it('keeps sub ids unique within each sector', () => {
    for (const s of SECTORS)
      expect(new Set(s.subs.map(x => x.id)).size).toBe(s.subs.length)
  })

  it('gives every sector a non-empty label/en/icon/color/description and subs', () => {
    for (const s of SECTORS) {
      expect(s.label && s.en && s.icon && s.color && s.description).toBeTruthy()
      expect(s.subs.length).toBeGreaterThan(0)
    }
  })

  it('assigns unique priorities covering 1..21', () => {
    const p = SECTORS.map(s => s.priority).sort((a, b) => a - b)
    expect(p).toEqual(Array.from({ length: 21 }, (_, i) => i + 1))
  })

  it('uses only known semantic color tokens', () => {
    const ok = new Set(['brand', 'emerald', 'accent', 'success', 'info', 'warning', 'error', 'neutral'])
    for (const s of SECTORS)
      expect(ok.has(s.color)).toBe(true)
  })
})

describe('sectors — lookup & skills', () => {
  it('resolves a sector by code and by slug', () => {
    expect(getSector('S01')?.id).toBe('technology')
    expect(getSector('technology')?.code).toBe('S01')
    expect(getSector('nope')).toBeUndefined()
    expect(getSector(undefined)).toBeUndefined()
  })

  it('classifies known skills into the correct sector', () => {
    expect(sectorForSkill('Vue.js')).toBe('S01')
    expect(sectorForSkill('Figma')).toBe('S11')
    expect(sectorForSkill('AutoCAD')).toBe('S05')
    expect(sectorForSkill('التفاوض')).toBe('S04')
    expect(sectorForSkill('نشاط غير معروف تمامًا')).toBeUndefined()
    expect(sectorForSkill('')).toBeUndefined()
  })

  it('preserves EVERY legacy taxonomy skill (no skill lost in the merge)', () => {
    const legacy = [...new Set(TAXONOMY.flatMap(c => c.skills))]
    for (const skill of legacy)
      expect(sectorForSkill(skill), `skill "${skill}" must classify`).toBeDefined()
  })

  it('dedupes and sorts ALL_SECTOR_SKILLS', () => {
    expect(new Set(ALL_SECTOR_SKILLS).size).toBe(ALL_SECTOR_SKILLS.length)
    expect([...ALL_SECTOR_SKILLS].sort()).toEqual(ALL_SECTOR_SKILLS)
    expect(ALL_SECTOR_SKILLS).toContain('Laravel')
  })
})

describe('sectors — legacy migration', () => {
  it('maps all 8 legacy category ids to valid new sector codes', () => {
    const legacyIds = TAXONOMY.map(c => c.id)
    expect(Object.keys(LEGACY_SECTOR_MAP).sort()).toEqual(legacyIds.sort())
    for (const id of legacyIds) {
      const code = migrateSector(id)
      expect(code, `legacy "${id}" must migrate`).toBeDefined()
      expect(getSector(code!), `migrated code for "${id}" must exist`).toBeDefined()
    }
  })

  it('returns undefined for an unknown legacy id', () => {
    expect(migrateSector('unknown_legacy')).toBeUndefined()
  })
})

describe('sectors — governance', () => {
  it('flags generic words and never lets them be a sector label', () => {
    expect(isGenericLabel('عمال')).toBe(true)
    expect(isGenericLabel('موظفين')).toBe(true)
    expect(isGenericLabel('تقني')).toBe(true)
    expect(isGenericLabel('متفرقات')).toBe(true)
    expect(isGenericLabel('تطوير البرمجيات')).toBe(false)
    for (const s of SECTORS)
      expect(GENERIC_BLOCKLIST).not.toContain(s.label)
  })

  it('routes partnership/co-founder items to opportunity_tag (not the sector tree)', () => {
    const s20 = getSector('entrepreneurship')!
    const tags = s20.subs.filter(x => x.type === 'opportunity_tag').map(x => x.id)
    expect(tags).toContain('business_partnerships')
    expect(tags).toContain('cofounder')
  })
})

describe('opportunity types (independent field)', () => {
  it('exposes 8 unique opportunity types', () => {
    expect(OPPORTUNITY_TYPES.length).toBe(8)
    expect(new Set(OPPORTUNITY_TYPES.map(o => o.id)).size).toBe(8)
  })

  it('maps every current RequestKind to a valid opportunity type', () => {
    const validIds = new Set(OPPORTUNITY_TYPES.map(o => o.id))
    for (const kind of ['job', 'project', 'consultation', 'task'])
      expect(validIds.has(OPP_TYPE_FROM_REQUEST_KIND[kind])).toBe(true)
  })

  it('resolves a label per opportunity type and echoes unknown ids', () => {
    expect(opportunityTypeLabel('freelance')).toBe('عمل حر')
    expect(opportunityTypeLabel('nope')).toBe('nope')
    expect(OPPORTUNITY_TYPE_IDS).toContain('internship')
  })

  it('keeps the opportunities EMPLOYMENT_TYPE_LABELS in sync with the canonical source', async () => {
    const { EMPLOYMENT_TYPE_LABELS } = await import('@/modules/opportunities/interfaces/Opportunity')
    for (const o of OPPORTUNITY_TYPES)
      expect(EMPLOYMENT_TYPE_LABELS[o.id]).toBe(o.label)
    expect(Object.keys(EMPLOYMENT_TYPE_LABELS).length).toBe(OPPORTUNITY_TYPES.length)
  })
})

describe('sectors — priority helpers', () => {
  it('orders sectors by priority and slices the top N', () => {
    expect(sectorsByPriority()[0].code).toBe('S01')
    expect(topSectors(8).length).toBe(8)
    expect(topSectors(8).map(s => s.priority)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})

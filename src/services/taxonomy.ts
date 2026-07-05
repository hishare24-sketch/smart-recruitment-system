// ============================================================================
// طبقة توافق (Compatibility Adapter) فوق المصدر الموحّد `services/sectors.ts`.
// ----------------------------------------------------------------------------
// المصدر الحقيقي للتصنيف صار مصفوفة القطاعات الـ21 في `sectors.ts` (المرحلة 2).
// نُبقي هذا الملف بواجهته القديمة (`TaxonomyCategory`/`TAXONOMY`/`getCategory`/
// `categorizeSkill`/`ALL_SKILLS`) كي يستمرّ مستهلكوه التسعة بلا تعديل — لكنه الآن
// «يشتقّ» بياناته من القطاعات لا يملك بياناته. بذلك كل التصنيفات والأقسام في المنصّة
// مربوطة بمصدر واحد. المرجع: DOC/TAXONOMY_PLAN.md
// ============================================================================
import { ALL_SECTOR_SKILLS, getSector, SECTORS, sectorForSkill } from '@/services/sectors'
import type { Sector } from '@/services/sectors'

export interface TaxonomyCategory {
  id: string
  label: string
  icon: string
  color: string
  subcategories: string[]
  skills: string[]
}

// رمز لون الأساس (brand/emerald/…) → اسم متغيّر ثيم Vuetify (المستهلكون يستخدمون
// `--v-theme-${color}` أو خاصية VIcon/VAvatar `color`).
const COLOR_MAP: Record<string, string> = {
  brand: 'primary',
  emerald: 'secondary',
  accent: 'accent',
  success: 'success',
  info: 'info',
  warning: 'warning',
  error: 'error',
  neutral: 'on-surface',
}

function toCategory(s: Sector): TaxonomyCategory {
  return {
    id: s.id,
    label: s.label,
    icon: s.icon,
    color: COLOR_MAP[s.color] ?? 'primary',
    subcategories: s.subs.map(sub => sub.label),
    skills: s.subs.flatMap(sub => sub.skills),
  }
}

// القطاعات الـ21 بواجهة التصنيف القديمة (مرتّبة بأولوية العرض = ترتيب S01..S21)
export const TAXONOMY: TaxonomyCategory[] = SECTORS.map(toCategory)

export function getCategory(id: string | undefined): TaxonomyCategory | undefined {
  const s = getSector(id)
  return s ? toCategory(s) : undefined
}

// تصنيف مهارة نصّية حرّة إلى مُعرّف قطاع (slug) — يوافق سلوك الدالة القديمة
export function categorizeSkill(name: string): string | undefined {
  const code = sectorForSkill(name)
  return code ? getSector(code)?.id : undefined
}

// كل المهارات المعروفة (للإكمال التلقائي وفلاتر المقيّمين) — بلا تكرار مرتّبة
export const ALL_SKILLS: string[] = ALL_SECTOR_SKILLS

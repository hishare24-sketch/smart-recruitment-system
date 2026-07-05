// ============================================================================
// محرّك المطابقة الرسمي — مفاتيح المطابقة المشتركة بين الأطراف (ورقتا 04/05).
// ----------------------------------------------------------------------------
// المطابقة = القطاع + التخصّص + المسمّى + المهارات + الموقع + نوع الفرصة.
// دالة واحدة `matchScore(a, b)` تقارن أي طرفين (باحث↔فرصة، جهة↔مرشّح، خبير↔باحث)
// عبر نفس المفاتيح فتُعيد درجة 0..100 + تفصيلًا. مبنيّة على مصدر التصنيف الموحّد
// `sectors.ts`. المرجع: DOC/TAXONOMY_PLAN.md
// ============================================================================
import { getSector } from '@/services/sectors'

/** ملف مطابقة مجرّد — أي طرف يُعبّر عن نفسه بهذه المفاتيح المشتركة */
export interface MatchProfile {
  /** كود القطاع (S01) أو slugه (technology) أو مُعرّف قديم */
  sector?: string
  /** التخصّص الفرعي (مُعرّف أو تسمية) */
  sub?: string
  title?: string
  skills?: string[]
  city?: string
  remote?: boolean
  /** مُعرّف نوع الفرصة (full_time…) */
  opportunityType?: string
}

export interface MatchBreakdown {
  sector: number
  specialty: number
  skills: number
  location: number
  type: number
}

export interface MatchResult {
  /** الدرجة الكلّية 0..100 (مُطبّعة على المفاتيح المتوفّرة على الطرفين) */
  score: number
  /** تفصيل كل مفتاح 0..100 (فقط المفاتيح المتوفّرة على الطرفين) */
  breakdown: Partial<MatchBreakdown>
  /** المهارات المشتركة (تطابق غير حسّاس لحالة الأحرف) */
  sharedSkills: string[]
}

// أوزان المفاتيح (مجموعها 100) — المهارات ثم القطاع أعلى وزنًا
const WEIGHTS: MatchBreakdown = {
  sector: 25,
  specialty: 20,
  skills: 30,
  location: 15,
  type: 10,
}

function norm(s?: string): string {
  return (s ?? '').trim().toLowerCase()
}

/** كود القطاع القانوني لأي مُعرّف (S01/slug/قديم) — لمقارنة عادلة */
function sectorCode(v?: string): string | undefined {
  return getSector(v)?.code
}

/** تقاطع المهارات (غير حسّاس لحالة الأحرف) مُعيدًا التسميات الأصلية من a */
function sharedSkills(a: string[], b: string[]): string[] {
  const setB = new Set(b.map(norm))
  return a.filter(s => setB.has(norm(s)))
}

/**
 * درجة مطابقة بين ملفَّين عبر المفاتيح المشتركة. المفاتيح الغائبة على أحد الطرفين
 * تُستبعد ويُعاد تطبيع الوزن على المتوفّر (فلا يُعاقَب نقص البيانات).
 */
export function matchScore(a: MatchProfile, b: MatchProfile): MatchResult {
  const breakdown: Partial<MatchBreakdown> = {}
  let earned = 0
  let possible = 0

  // القطاع
  const ca = sectorCode(a.sector)
  const cb = sectorCode(b.sector)
  if (ca && cb) {
    const v = ca === cb ? 1 : 0
    breakdown.sector = v * 100
    earned += v * WEIGHTS.sector
    possible += WEIGHTS.sector
  }

  // التخصّص الفرعي
  if (a.sub && b.sub) {
    const v = norm(a.sub) === norm(b.sub) ? 1 : 0
    breakdown.specialty = v * 100
    earned += v * WEIGHTS.specialty
    possible += WEIGHTS.specialty
  }

  // المهارات (Jaccard)
  const shared = a.skills?.length && b.skills?.length ? sharedSkills(a.skills, b.skills) : []
  if (a.skills?.length && b.skills?.length) {
    const union = new Set([...a.skills.map(norm), ...b.skills.map(norm)])
    const v = union.size ? shared.length / union.size : 0
    breakdown.skills = Math.round(v * 100)
    earned += v * WEIGHTS.skills
    possible += WEIGHTS.skills
  }

  // الموقع (عن بُعد يتطابق مع عن بُعد؛ وإلا نفس المدينة)
  const hasLoc = (a.remote !== undefined || a.city) && (b.remote !== undefined || b.city)
  if (hasLoc) {
    let v = 0
    if (a.remote && b.remote)
      v = 1
    else if (a.city && b.city && norm(a.city) === norm(b.city))
      v = 1
    else if ((a.remote && b.city) || (b.remote && a.city))
      v = 0.5 // أحد الطرفين مرن
    breakdown.location = Math.round(v * 100)
    earned += v * WEIGHTS.location
    possible += WEIGHTS.location
  }

  // نوع الفرصة
  if (a.opportunityType && b.opportunityType) {
    const v = norm(a.opportunityType) === norm(b.opportunityType) ? 1 : 0
    breakdown.type = v * 100
    earned += v * WEIGHTS.type
    possible += WEIGHTS.type
  }

  const score = possible ? Math.round((earned / possible) * 100) : 0
  return { score, breakdown, sharedSkills: shared }
}

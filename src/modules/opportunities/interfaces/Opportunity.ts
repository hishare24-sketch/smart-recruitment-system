import { OPPORTUNITY_TYPES, type OpportunityTypeId } from '@/services/sectors'

// نوع الفرصة موحّد على المصدر المعتمد `OPPORTUNITY_TYPES` (services/sectors.ts)
export type EmploymentType = OpportunityTypeId
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead'

export interface MatchBreakdown {
  skills: number
  experience: number
  education: number
  location: number
}

export interface Opportunity {
  id: number
  title: string
  company: string
  companyInitial: string
  location: string
  city: string
  type: EmploymentType
  level: ExperienceLevel
  department: string
  matchRate: number
  matchBreakdown: MatchBreakdown
  applicants: number
  postedAt: string
  postedDaysAgo: number
  isNew?: boolean
  isFeatured?: boolean
  salaryMin: number
  salaryMax: number
  description: string
  responsibilities: string[]
  requirements: string[]
  benefits: string[]
  skills: string[]
}

// تسميات نوع الفرصة مشتقّة من المصدر المعتمد (تتزامن تلقائيًا مع أي توسّع)
export const EMPLOYMENT_TYPE_LABELS = Object.fromEntries(
  OPPORTUNITY_TYPES.map(o => [o.id, o.label]),
) as Record<EmploymentType, string>

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  entry: 'مبتدئ',
  mid: 'متوسط',
  senior: 'خبير',
  lead: 'قيادي',
}

export function formatSalary(min: number, max: number): string {
  if (min === 0 && max === 0)
    return 'حسب الاتفاق'
  const fmt = (n: number) => n.toLocaleString('en-US')
  return `${fmt(min)} - ${fmt(max)} ريال`
}

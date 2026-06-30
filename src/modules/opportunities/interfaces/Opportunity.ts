export type EmploymentType = 'full_time' | 'part_time' | 'remote' | 'temporary' | 'task'

export interface Opportunity {
  id: number
  title: string
  company: string
  companyLogo?: string
  location: string
  type: EmploymentType
  matchRate: number
  applicants: number
  postedAt: string
  isNew?: boolean
  isFeatured?: boolean
  salaryRange?: string
  description?: string
  skills?: string[]
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'دوام كامل',
  part_time: 'دوام جزئي',
  remote: 'عن بُعد',
  temporary: 'مؤقت',
  task: 'مهمة',
}

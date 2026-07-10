import { useRequestsStore } from '@/stores/RequestsStore'
import { useInterviewersStore } from '@/stores/InterviewersStore'
import { useCandidatesStore } from '@/stores/CandidatesStore'
import { mockOpportunities } from '@/modules/opportunities/services/mockOpportunities'
import { ALL_SKILLS, categorizeSkill, getCategory } from '@/services/taxonomy'
import { sectorForField } from '@/services/sectors'
import { useSectorContext } from '@/composables/useSectorContext'
import type { SearchScope } from '@/services/ai/types'

export interface SearchResultItem {
  id: string | number
  title: string
  subtitle: string
  icon: string
  color: string
  route: { name: string, params?: Record<string, string | number> } | null
}

export interface SearchCategory {
  key: SearchScope
  label: string
  icon: string
  items: SearchResultItem[]
}

function match(q: string, ...fields: (string | undefined)[]) {
  const n = q.trim().toLowerCase()
  if (!n)
    return true
  return fields.some(f => (f ?? '').toLowerCase().includes(n))
}

// Does any of the given skills/tags belong to the taxonomy category?
function inCategory(category: string | undefined, tags: string[]) {
  if (!category)
    return true
  return tags.some(t => categorizeSkill(t) === category)
}

// Aggregate search across every section of the platform.
export function useGlobalSearch() {
  const requestsStore = useRequestsStore()
  const interviewersStore = useInterviewersStore()
  const candidatesStore = useCandidatesStore()
  const sector = useSectorContext()

  /**
   * ترتيب واعٍ بالقطاع: يرفع عناصر قطاعات المستخدم للأعلى (غير هادم)، ومع `onlyMine`
   * يقيّدها على اتّحاد قطاعات المستخدم. القسم بلا سياق → سلوك اليوم (rankSearch محايد).
   */
  function applySector<T>(list: T[], getSec: (t: T) => string | undefined, onlyMine: boolean): T[] {
    const scoped = onlyMine && sector.has.value ? list.filter(t => sector.inEffective(getSec(t))) : list
    return sector.rankSearch(scoped, getSec)
  }

  /** `onlyMine`: شريحة «ضمن قطاعاتي» — يقيّد الأقسام القطاعيّة على قطاعات المستخدم */
  function search(query: string, scope: SearchScope = 'all', category?: string, opts?: { onlyMine?: boolean }): SearchCategory[] {
    const q = query.trim()
    const onlyMine = opts?.onlyMine ?? false
    const want = (s: SearchScope) => scope === 'all' || scope === s

    const cats: SearchCategory[] = []

    if (want('requests')) {
      const filtered = requestsStore.requests
        .filter(r => match(q, r.title, r.org, r.field, r.skills.join(' ')) && inCategory(category, r.skills))
      const items = applySector(filtered, r => sectorForField(r.field)?.id, onlyMine)
        .map<SearchResultItem>(r => ({
          id: r.id, title: r.title, subtitle: `${r.org} · ${r.field} · ${r.budget}`,
          icon: 'mdi-storefront-outline', color: 'primary', route: { name: 'request-details', params: { id: r.id } },
        }))
      cats.push({ key: 'requests', label: 'الطلبات', icon: 'mdi-storefront-outline', items })
    }

    if (want('opportunities')) {
      const filtered = mockOpportunities
        .filter(o => match(q, o.title, o.company, o.city, o.skills.join(' ')) && inCategory(category, o.skills))
      const items = applySector(filtered, o => sectorForField(o.department)?.id, onlyMine)
        .map<SearchResultItem>(o => ({
          id: o.id, title: o.title, subtitle: `${o.company} · ${o.city}`,
          icon: 'mdi-briefcase-search-outline', color: 'accent', route: { name: 'opportunity-details', params: { id: o.id } },
        }))
      cats.push({ key: 'opportunities', label: 'الفرص', icon: 'mdi-briefcase-search-outline', items })
    }

    if (want('interviewers')) {
      const filtered = interviewersStore.interviewers
        .filter(iv => match(q, iv.name, iv.title, iv.field, iv.specialties.join(' ')) && inCategory(category, iv.specialties))
      const items = applySector(filtered, iv => sectorForField(iv.field)?.id, onlyMine)
        .map<SearchResultItem>(iv => ({
          id: iv.id, title: iv.name, subtitle: `${iv.title} · ${iv.rating}★`,
          icon: 'mdi-account-supervisor-circle-outline', color: 'secondary', route: { name: 'interviewer-profile', params: { id: iv.id } },
        }))
      cats.push({ key: 'interviewers', label: 'المقيّمون', icon: 'mdi-account-supervisor-circle-outline', items })
    }

    if (want('users')) {
      const items = candidatesStore.candidates
        .filter(c => match(q, c.name, c.title, c.skills.join(' ')))
        .map<SearchResultItem>(c => ({
          id: c.id, title: c.name, subtitle: c.title,
          icon: 'mdi-account-outline', color: 'info', route: { name: 'candidate-profile', params: { id: c.id } },
        }))
      cats.push({ key: 'users', label: 'المستخدمون', icon: 'mdi-account-outline', items })
    }

    if (want('companies')) {
      const names = new Set<string>()
      for (const o of mockOpportunities) names.add(o.company)
      for (const r of requestsStore.requests) names.add(r.org)
      const items = [...names]
        .filter(name => match(q, name))
        .map<SearchResultItem>((name, i) => ({
          id: i, title: name, subtitle: 'جهة/شركة',
          icon: 'mdi-domain', color: 'primary', route: null,
        }))
      cats.push({ key: 'companies', label: 'الشركات', icon: 'mdi-domain', items })
    }

    if (want('skills')) {
      const items = ALL_SKILLS
        .filter(s => match(q, s))
        .map<SearchResultItem>(s => ({
          id: s, title: s, subtitle: getCategory(categorizeSkill(s))?.label ?? 'مهارة',
          icon: 'mdi-star-four-points-outline', color: 'success', route: null,
        }))
      cats.push({ key: 'skills', label: 'المهارات', icon: 'mdi-star-four-points-outline', items })
    }

    return cats
  }

  return { search }
}

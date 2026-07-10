<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import OpportunityCard from '../components/OpportunityCard.vue'
import { mockOpportunities } from '../services/mockOpportunities'
import { EMPLOYMENT_TYPE_LABELS, EXPERIENCE_LEVEL_LABELS } from '../interfaces/Opportunity'
import type { EmploymentType, ExperienceLevel } from '../interfaces/Opportunity'
import { useSavedStore } from '@/stores/SavedStore'
import TaxonomyTree from '@/components/shared/TaxonomyTree.vue'
import { categorizeSkill } from '@/services/taxonomy'
import { useProfileStore } from '@/stores/ProfileStore'
import { matchScore } from '@/services/matching'
import { opportunityMatchProfile, seekerMatchProfile } from '@/services/matchProfile'
import { sectorForField } from '@/services/sectors'
import { useSectorContext } from '@/composables/useSectorContext'
import type { Opportunity } from '../interfaces/Opportunity'
import { ai } from '@/services/ai'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSlider from '@/components/ui/BaseSlider.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

const savedStore = useSavedStore()
const profile = useProfileStore()
const sector = useSectorContext()

// نطاق القطاع: «قطاعاتي» (اتّحاد قطاعات المستخدم) ⟷ «الكل». بذر افتراضيّ عند وجود
// سياق، لكنه ليس قفلًا — المستخدم يقلبه فورًا. بلا سياق → لا شريحة، سلوك اليوم.
const sectorScope = ref<'mine' | 'all'>(sector.hasExplicit.value ? 'mine' : 'all')
/** قطاع الفرصة (slug) من حقل القسم عبر resolver الترحيل */
function oppSector(o: Opportunity): string | undefined {
  return sectorForField(o.department)?.id
}

// AI smart quick-filters
const smartChips = computed(() => ai.smartFilterChips({ section: 'opportunities', skills: profile.skills.map(s => s.name) }))
const activeChips = ref<Set<string>>(new Set())
function toggleChip(key: string) {
  const next = new Set(activeChips.value)
  next.has(key) ? next.delete(key) : next.add(key)
  activeChips.value = next
}
const userSkills = computed(() => profile.skills.map(s => s.name))

// نسبة التطابق الحيّة (نفس محرّك بطاقة الفرصة) — للفرز و«الأعلى تطابقاً» بتناسق
const seekerProfile = computed(() => seekerMatchProfile({
  skills: userSkills.value,
  city: profile.prefs.location,
  opportunityType: profile.prefs.preferred_employment_types[0],
  ...sector.matchInput(),
}))
function liveMatch(o: Opportunity): number {
  return matchScore(seekerProfile.value, opportunityMatchProfile(o)).score
}

// AI personalized top match (بالتطابق الحيّ)
const topMatch = computed(() => [...mockOpportunities].sort((a, b) => liveMatch(b) - liveMatch(a))[0])
const treeSel = ref<{ category?: string, sub?: string }>({})
const treeItems = computed(() => mockOpportunities.map(o => ({
  skills: o.skills,
  text: `${o.title} ${o.city} ${o.skills.join(' ')}`,
  sector: sectorForField(o.department)?.id,
})))

const search = ref('')
const selectedType = ref<EmploymentType | null>(null)
const selectedLevel = ref<ExperienceLevel | null>(null)
const selectedCity = ref<string | null>(null)
const minSalary = ref(0)
const sortBy = ref<'match' | 'newest' | 'oldest' | 'salary' | 'salaryLow'>('match')
const savedOnly = ref(false)
const view = ref<'grid' | 'list'>('grid')

const typeOptions = (Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map(value => ({ value, title: EMPLOYMENT_TYPE_LABELS[value] }))
const levelOptions = (Object.keys(EXPERIENCE_LEVEL_LABELS) as ExperienceLevel[]).map(value => ({ value, title: EXPERIENCE_LEVEL_LABELS[value] }))
const cityOptions = [...new Set(mockOpportunities.map(o => o.city))].map(c => ({ value: c, title: c }))
const sortOptions = [
  { value: 'match', title: 'الأعلى تطابقاً' },
  { value: 'newest', title: 'الأحدث' },
  { value: 'oldest', title: 'الأقدم' },
  { value: 'salary', title: 'الأعلى راتباً' },
  { value: 'salaryLow', title: 'الأقل راتباً' },
]

const filtered = computed(() => {
  let list = mockOpportunities.filter((o) => {
    const matchesSearch = !search.value
      || o.title.includes(search.value)
      || o.company.includes(search.value)
      || o.skills.some(s => s.toLowerCase().includes(search.value.toLowerCase()))
    const matchesType = !selectedType.value || o.type === selectedType.value
    const matchesLevel = !selectedLevel.value || o.level === selectedLevel.value
    const matchesCity = !selectedCity.value || o.city === selectedCity.value
    const matchesSalary = o.salaryMax >= minSalary.value
    const matchesSaved = !savedOnly.value || savedStore.isSaved(o.id)
    const matchesCategory = !treeSel.value.category
      || sectorForField(o.department)?.id === treeSel.value.category
      || o.skills.some(s => categorizeSkill(s) === treeSel.value.category)
    const matchesSub = !treeSel.value.sub || `${o.title} ${o.city} ${o.skills.join(' ')}`.includes(treeSel.value.sub)
    // نطاق «قطاعاتي» — يقيّد على اتّحاد قطاعات المستخدم (قابل للتجاوز بـ«الكل»)
    const matchesScope = sectorScope.value === 'all' || !sector.has.value || sector.inEffective(oppSector(o))
    const matchesNew = !activeChips.value.has('newToday') || o.postedDaysAgo <= 1
    const matchesSkills = !activeChips.value.has('skills') || o.skills.some(s => userSkills.value.includes(s))
    return matchesSearch && matchesType && matchesLevel && matchesCity && matchesSalary && matchesSaved && matchesCategory && matchesSub && matchesScope && matchesNew && matchesSkills
  })

  list = [...list].sort((a, b) => {
    if (sortBy.value === 'match') {
      const d = liveMatch(b) - liveMatch(a)
      // عند تعادل التطابق: ترفع قطاعات المستخدم (الأبرز ثم الصريح ثم المشتقّ)
      return d !== 0 ? d : sector.boost(oppSector(b)) - sector.boost(oppSector(a))
    }
    if (sortBy.value === 'newest')
      return a.postedDaysAgo - b.postedDaysAgo
    if (sortBy.value === 'oldest')
      return b.postedDaysAgo - a.postedDaysAgo
    if (sortBy.value === 'salaryLow')
      return a.salaryMax - b.salaryMax
    return b.salaryMax - a.salaryMax
  })
  return list
})

function resetFilters() {
  search.value = ''
  selectedType.value = null
  selectedLevel.value = null
  selectedCity.value = null
  minSalary.value = 0
  savedOnly.value = false
  treeSel.value = {}
  sectorScope.value = sector.hasExplicit.value ? 'mine' : 'all'
}
</script>

<template>
  <div>
    <PageHeader
      title="استعراض الفرص"
      subtitle="فرص مرشّحة لك بالذكاء الاصطناعي حسب ملفك"
      icon="mdi-briefcase-search-outline"
    >
      <template #actions>
        <BaseButton
          :variant="savedOnly ? 'accent' : 'outline'"
          size="sm"
          @click="savedOnly = !savedOnly"
        >
          <BaseIcon :name="savedOnly ? 'mdi-bookmark' : 'mdi-bookmark-outline'" :size="18" />
          المحفوظة ({{ savedStore.count }})
        </BaseButton>
        <div class="rounded-ui inline-flex overflow-hidden border-ui">
          <button
            class="px-3 py-2 transition"
            :class="view === 'grid' ? 'bg-brand text-on-brand' : 'text-muted hover:bg-surfalt'"
            aria-label="عرض شبكي"
            @click="view = 'grid'"
          >
            <BaseIcon name="mdi-view-grid-outline" :size="18" />
          </button>
          <button
            class="px-3 py-2 transition"
            :class="view === 'list' ? 'bg-brand text-on-brand' : 'text-muted hover:bg-surfalt'"
            aria-label="عرض قائمة"
            @click="view = 'list'"
          >
            <BaseIcon name="mdi-view-list-outline" :size="18" />
          </button>
        </div>
      </template>
    </PageHeader>

    <!-- AI personalized top match -->
    <div
      v-if="topMatch"
      class="rounded-ui mb-4 flex flex-wrap items-center justify-between gap-2 border-s-4 p-3"
      style="border-color: rgb(var(--v-theme-secondary)); background: rgba(var(--v-theme-secondary), 0.1)"
    >
      <span class="text-sm">
        <BaseIcon name="mdi-robot-happy-outline" :size="16" /> الأكثر تطابقًا مع ملفك: «{{ topMatch.title }}» — {{ topMatch.company }} · تطابق
        <strong>{{ liveMatch(topMatch) }}%</strong>
      </span>
      <BaseButton variant="emerald" size="sm" :to="{ name: 'opportunity-details', params: { id: topMatch.id } }">عرض</BaseButton>
    </div>

    <!-- Search & filters -->
    <BaseCard class="mb-5">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div class="md:col-span-4">
          <BaseInput v-model="search" prefix-icon="mdi-magnify" placeholder="ابحث بالمسمى أو الشركة أو المهارة...">
            <template #suffix>
              <button v-if="search" type="button" class="text-muted" aria-label="مسح" @click="search = ''">
                <BaseIcon name="mdi-close" :size="18" />
              </button>
            </template>
          </BaseInput>
        </div>
        <div class="md:col-span-2">
          <BaseSelect v-model="selectedType" :items="typeOptions" placeholder="نوع الدوام" clearable />
        </div>
        <div class="md:col-span-2">
          <BaseSelect v-model="selectedLevel" :items="levelOptions" placeholder="المستوى" clearable />
        </div>
        <div class="md:col-span-2">
          <BaseSelect v-model="selectedCity" :items="cityOptions" placeholder="المدينة" clearable />
        </div>
        <div class="md:col-span-2">
          <BaseSelect v-model="sortBy" :items="sortOptions" prefix-icon="mdi-sort" />
        </div>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <div v-if="sector.has.value" class="seg" role="group" aria-label="نطاق القطاع">
          <button
            type="button"
            class="seg-btn"
            :class="{ 'is-active': sectorScope === 'mine' }"
            @click="sectorScope = 'mine'"
          >
            <BaseIcon name="mdi-shape-outline" :size="15" /> قطاعاتي
          </button>
          <button
            type="button"
            class="seg-btn"
            :class="{ 'is-active': sectorScope === 'all' }"
            @click="sectorScope = 'all'"
          >الكل</button>
        </div>
        <span class="whitespace-nowrap text-xs text-muted">أدنى راتب: {{ minSalary.toLocaleString('en-US') }}</span>
        <BaseSlider v-model="minSalary" :min="0" :max="28000" :step="1000" color="secondary" class="min-w-[160px] flex-1" />
        <BaseButton variant="ghost" size="sm" @click="resetFilters">
          <BaseIcon name="mdi-filter-off-outline" :size="18" /> إعادة تعيين
        </BaseButton>
      </div>
    </BaseCard>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-4">
      <!-- Taxonomy tree -->
      <div class="md:col-span-1">
        <BaseCard>
          <TaxonomyTree v-model="treeSel" :items="treeItems" />
        </BaseCard>
      </div>

      <!-- Results -->
      <div class="md:col-span-3">
        <!-- AI smart quick-filters -->
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted"><BaseIcon name="mdi-robot-happy-outline" :size="16" style="color: rgb(var(--v-theme-secondary))" /> فلاتر ذكية:</span>
          <button
            v-for="chip in smartChips"
            :key="chip.key"
            class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition"
            :class="activeChips.has(chip.key) ? 'bg-emerald text-on-brand' : 'border-ui text-content hover:bg-surfalt'"
            @click="toggleChip(chip.key)"
          >
            <BaseIcon :name="chip.icon" :size="14" /> {{ chip.label }}
          </button>
        </div>

        <div class="mb-3 text-sm text-muted">
          {{ filtered.length }} فرصة متاحة
        </div>

        <div v-if="filtered.length" class="grid gap-4" :class="view === 'grid' ? 'md:grid-cols-2' : 'grid-cols-1'">
          <OpportunityCard v-for="opp in filtered" :key="opp.id" :opportunity="opp" />
        </div>

        <BaseCard v-else class="py-12 text-center">
          <BaseIcon name="mdi-briefcase-remove-outline" :size="64" class="text-muted" />
          <div class="mt-3 text-xl font-bold">لا توجد فرص مطابقة</div>
          <div class="mb-3 text-sm text-muted">جرّب تعديل كلمات البحث أو الفلاتر</div>
          <BaseButton variant="tonal-brand" @click="resetFilters">إعادة تعيين الفلاتر</BaseButton>
        </BaseCard>
      </div>
    </div>
  </div>
</template>

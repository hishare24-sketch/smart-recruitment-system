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
import { ai } from '@/services/ai'

const savedStore = useSavedStore()
const profile = useProfileStore()

// AI smart quick-filters
const smartChips = computed(() => ai.smartFilterChips({ section: 'opportunities', skills: profile.skills.map(s => s.name) }))
const activeChips = ref<Set<string>>(new Set())
function toggleChip(key: string) {
  const next = new Set(activeChips.value)
  next.has(key) ? next.delete(key) : next.add(key)
  activeChips.value = next
}
const userSkills = computed(() => profile.skills.map(s => s.name))

// AI personalized top match
const topMatch = computed(() => [...mockOpportunities].sort((a, b) => b.matchRate - a.matchRate)[0])
const treeSel = ref<{ category?: string, sub?: string }>({})
const treeItems = computed(() => mockOpportunities.map(o => ({
  skills: o.skills,
  text: `${o.title} ${o.city} ${o.skills.join(' ')}`,
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
    const matchesCategory = !treeSel.value.category || o.skills.some(s => categorizeSkill(s) === treeSel.value.category)
    const matchesSub = !treeSel.value.sub || `${o.title} ${o.city} ${o.skills.join(' ')}`.includes(treeSel.value.sub)
    const matchesNew = !activeChips.value.has('newToday') || o.postedDaysAgo <= 1
    const matchesSkills = !activeChips.value.has('skills') || o.skills.some(s => userSkills.value.includes(s))
    return matchesSearch && matchesType && matchesLevel && matchesCity && matchesSalary && matchesSaved && matchesCategory && matchesSub && matchesNew && matchesSkills
  })

  list = [...list].sort((a, b) => {
    if (sortBy.value === 'match')
      return b.matchRate - a.matchRate
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
        <VBtn
          :variant="savedOnly ? 'flat' : 'outlined'"
          :color="savedOnly ? 'accent' : 'primary'"
          size="small"
          :prepend-icon="savedOnly ? 'mdi-bookmark' : 'mdi-bookmark-outline'"
          @click="savedOnly = !savedOnly"
        >
          المحفوظة ({{ savedStore.count }})
        </VBtn>
        <VBtnToggle v-model="view" mandatory density="comfortable" color="primary" variant="outlined">
          <VBtn value="grid" icon="mdi-view-grid-outline" size="small" />
          <VBtn value="list" icon="mdi-view-list-outline" size="small" />
        </VBtnToggle>
      </template>
    </PageHeader>

    <!-- AI personalized top match -->
    <VAlert v-if="topMatch" color="secondary" variant="tonal" density="comfortable" class="mb-4" border="start">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <span class="text-caption">
          <VIcon icon="mdi-robot-happy-outline" size="16" /> الأكثر تطابقًا مع ملفك: «{{ topMatch.title }}» — {{ topMatch.company }} · تطابق
          <strong>{{ topMatch.matchRate }}%</strong>
        </span>
        <VBtn size="x-small" color="secondary" variant="flat" :to="{ name: 'opportunity-details', params: { id: topMatch.id } }">عرض</VBtn>
      </div>
    </VAlert>

    <!-- Search & filters -->
    <VCard class="pa-4 mb-5">
      <VRow dense align="center">
        <VCol cols="12" md="4">
          <VTextField
            v-model="search"
            placeholder="ابحث بالمسمى أو الشركة أو المهارة..."
            prepend-inner-icon="mdi-magnify"
            hide-details
            clearable
          />
        </VCol>
        <VCol cols="6" md="2">
          <VSelect v-model="selectedType" :items="typeOptions" placeholder="نوع الدوام" hide-details clearable />
        </VCol>
        <VCol cols="6" md="2">
          <VSelect v-model="selectedLevel" :items="levelOptions" placeholder="المستوى" hide-details clearable />
        </VCol>
        <VCol cols="6" md="2">
          <VSelect v-model="selectedCity" :items="cityOptions" placeholder="المدينة" hide-details clearable />
        </VCol>
        <VCol cols="6" md="2">
          <VSelect v-model="sortBy" :items="sortOptions" hide-details prepend-inner-icon="mdi-sort" />
        </VCol>
      </VRow>
      <VRow dense align="center" class="mt-1">
        <VCol cols="12" md="6" class="d-flex align-center ga-3">
          <span class="text-caption text-medium-emphasis text-no-wrap">أدنى راتب: {{ minSalary.toLocaleString('en-US') }}</span>
          <VSlider v-model="minSalary" :min="0" :max="28000" :step="1000" color="secondary" hide-details density="compact" />
        </VCol>
        <VCol cols="12" md="6" class="d-flex justify-end">
          <VBtn variant="text" size="small" prepend-icon="mdi-filter-off-outline" @click="resetFilters">إعادة تعيين</VBtn>
        </VCol>
      </VRow>
    </VCard>

    <VRow>
      <!-- Taxonomy tree -->
      <VCol cols="12" md="3">
        <VCard class="pa-4">
          <TaxonomyTree v-model="treeSel" :items="treeItems" />
        </VCard>
      </VCol>

      <!-- Results -->
      <VCol cols="12" md="9">
        <!-- AI smart quick-filters -->
        <div class="d-flex align-center flex-wrap ga-2 mb-3">
          <span class="text-caption text-medium-emphasis"><VIcon icon="mdi-robot-happy-outline" size="16" color="secondary" /> فلاتر ذكية:</span>
          <VChip
            v-for="chip in smartChips"
            :key="chip.key"
            :color="activeChips.has(chip.key) ? 'secondary' : undefined"
            :variant="activeChips.has(chip.key) ? 'flat' : 'outlined'"
            size="small"
            :prepend-icon="chip.icon"
            @click="toggleChip(chip.key)"
          >
            {{ chip.label }}
          </VChip>
        </div>

        <div class="text-body-2 text-medium-emphasis mb-3">
          {{ filtered.length }} فرصة متاحة
        </div>

        <VRow v-if="filtered.length">
          <VCol
            v-for="opp in filtered"
            :key="opp.id"
            cols="12"
            :md="view === 'grid' ? 6 : 12"
          >
            <OpportunityCard :opportunity="opp" />
          </VCol>
        </VRow>

        <VCard v-else class="pa-12 text-center">
          <VIcon icon="mdi-briefcase-remove-outline" size="64" color="medium-emphasis" />
          <div class="text-h6 mt-3">لا توجد فرص مطابقة</div>
          <div class="text-body-2 text-medium-emphasis mb-3">جرّب تعديل كلمات البحث أو الفلاتر</div>
          <VBtn color="primary" variant="tonal" @click="resetFilters">إعادة تعيين الفلاتر</VBtn>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

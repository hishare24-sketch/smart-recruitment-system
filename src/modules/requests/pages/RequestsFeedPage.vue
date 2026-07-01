<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { KIND_META, STATE_META, useRequestsStore } from '@/stores/RequestsStore'
import type { RequestKind } from '@/stores/RequestsStore'
import { ai } from '@/services/ai'
import EmptyState from '@/components/shared/EmptyState.vue'
import TaxonomyTree from '@/components/shared/TaxonomyTree.vue'
import { categorizeSkill } from '@/services/taxonomy'
import { useProfileStore } from '@/stores/ProfileStore'

const router = useRouter()
const store = useRequestsStore()
const profile = useProfileStore()

// AI smart quick-filters
const smartChips = computed(() => ai.smartFilterChips({ section: 'requests', skills: profile.skills.map(s => s.name) }))
const activeChips = ref<Set<string>>(new Set())
function toggleChip(key: string) {
  const next = new Set(activeChips.value)
  next.has(key) ? next.delete(key) : next.add(key)
  activeChips.value = next
}
const userSkills = computed(() => profile.skills.map(s => s.name))

const search = ref('')
const searchFocused = ref(false)
const suggestions = computed(() => (searchFocused.value ? ai.searchSuggestions(search.value) : []))

const kinds = Object.keys(KIND_META) as RequestKind[]
const selectedKinds = ref<RequestKind[]>([])
const selectedField = ref<string | null>(null)
const remoteOnly = ref(false)
const maxWeeks = ref(20)
const minBudget = ref(0)
const treeSel = ref<{ category?: string, sub?: string }>({})

const treeItems = computed(() => store.requests.map(r => ({
  skills: r.skills,
  text: `${r.title} ${r.field} ${r.skills.join(' ')}`,
})))

// Side-sheet filter + sorting
const filterDrawer = ref(false)
const sortBy = ref<'match' | 'newest' | 'oldest' | 'rating' | 'price' | 'applicants'>('match')
const sortOptions = [
  { value: 'match', title: 'الأعلى تطابقًا' },
  { value: 'newest', title: 'الأحدث' },
  { value: 'oldest', title: 'الأقدم' },
  { value: 'rating', title: 'الأعلى تقييمًا' },
  { value: 'price', title: 'الأقل سعرًا' },
  { value: 'applicants', title: 'الأكثر تقدّمًا' },
]
const activeFilterCount = computed(() =>
  selectedKinds.value.length + (selectedField.value ? 1 : 0) + (remoteOnly.value ? 1 : 0)
  + (maxWeeks.value < 20 ? 1 : 0) + (minBudget.value > 0 ? 1 : 0) + (treeSel.value.category ? 1 : 0),
)
function resetFilters() {
  selectedKinds.value = []
  selectedField.value = null
  remoteOnly.value = false
  maxWeeks.value = 20
  minBudget.value = 0
  treeSel.value = {}
}

function toggleKind(k: RequestKind) {
  selectedKinds.value = selectedKinds.value.includes(k)
    ? selectedKinds.value.filter(x => x !== k)
    : [...selectedKinds.value, k]
}

const filtered = computed(() => {
  const list = store.requests.filter((r) => {
    if (search.value.trim() && !`${r.title} ${r.org} ${r.field} ${r.skills.join(' ')}`.includes(search.value.trim()))
      return false
    if (selectedKinds.value.length && !selectedKinds.value.includes(r.kind))
      return false
    if (selectedField.value && r.field !== selectedField.value)
      return false
    if (remoteOnly.value && !r.remote)
      return false
    if (r.durationWeeks > maxWeeks.value)
      return false
    if (r.budgetValue < minBudget.value)
      return false
    if (treeSel.value.category && !r.skills.some(s => categorizeSkill(s) === treeSel.value.category))
      return false
    if (treeSel.value.sub && !`${r.title} ${r.field} ${r.skills.join(' ')}`.includes(treeSel.value.sub))
      return false
    // AI smart quick-filters
    if (activeChips.value.has('newToday') && r.state !== 'new')
      return false
    if (activeChips.value.has('lowComp') && r.applicants >= 5)
      return false
    if (activeChips.value.has('topRated') && r.orgRating < 4.5)
      return false
    if (activeChips.value.has('skills') && !r.skills.some(s => userSkills.value.includes(s)))
      return false
    return true
  })
  const sorted = [...list]
  switch (sortBy.value) {
    case 'newest': sorted.sort((a, b) => b.postedOrder - a.postedOrder); break
    case 'oldest': sorted.sort((a, b) => a.postedOrder - b.postedOrder); break
    case 'rating': sorted.sort((a, b) => b.orgRating - a.orgRating); break
    case 'price': sorted.sort((a, b) => a.budgetValue - b.budgetValue); break
    case 'applicants': sorted.sort((a, b) => b.applicants - a.applicants); break
    default: sorted.sort((a, b) => b.matchRate - a.matchRate)
  }
  return sorted
})

function matchColor(v: number) {
  if (v >= 85)
    return 'success'
  if (v >= 70)
    return 'accent'
  return 'warning'
}

function applySuggestion(s: string) {
  search.value = s
  searchFocused.value = false
}
function onSearchBlur() {
  setTimeout(() => (searchFocused.value = false), 200)
}
function open(id: number) {
  router.push({ name: 'request-details', params: { id } })
}
</script>

<template>
  <div>
    <PageHeader
      title="سوق الطلبات"
      subtitle="وظائف ومشاريع واستشارات ومهمات — مرتّبة بذكاء حسب تطابقك"
      icon="mdi-storefront-outline"
    >
      <template #actions>
        <VBtn variant="tonal" color="secondary" prepend-icon="mdi-file-send-outline" :to="{ name: 'my-requests' }">
          طلباتي المقدّمة
        </VBtn>
      </template>
    </PageHeader>

    <!-- Smart search -->
    <div class="position-relative mb-4">
      <VTextField
        v-model="search"
        placeholder="ابحث: مشاريع Vue، استشارة معمارية، مهمة قصيرة..."
        prepend-inner-icon="mdi-magnify"
        variant="solo"
        density="comfortable"
        hide-details
        clearable
        @focus="searchFocused = true"
        @blur="onSearchBlur"
      >
        <template #append-inner>
          <VChip color="secondary" size="small" label prepend-icon="mdi-robot-happy-outline">بحث ذكي</VChip>
        </template>
      </VTextField>

      <!-- AI live suggestions -->
      <VExpandTransition>
        <VCard v-if="searchFocused && suggestions.length" class="position-absolute w-100 mt-1" style="z-index: 10" elevation="6">
          <VList density="compact">
            <VListSubheader class="text-caption">
              <VIcon icon="mdi-robot-happy-outline" size="16" class="me-1" /> اقتراحات ذكية
            </VListSubheader>
            <VListItem
              v-for="(s, i) in suggestions"
              :key="i"
              prepend-icon="mdi-magnify"
              :title="s"
              @mousedown="applySuggestion(s)"
            />
          </VList>
        </VCard>
      </VExpandTransition>
    </div>

    <!-- Toolbar: count · filter · sort -->
    <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
      <span class="text-body-2 text-medium-emphasis">{{ filtered.length }} طلب</span>
      <div class="d-flex align-center ga-2">
        <VBtn variant="outlined" size="small" prepend-icon="mdi-filter-variant" @click="filterDrawer = true">
          فلترة
          <VChip v-if="activeFilterCount" color="accent" size="x-small" class="ms-1" label>{{ activeFilterCount }}</VChip>
        </VBtn>
        <VSelect
          v-model="sortBy"
          :items="sortOptions"
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-sort"
          style="max-width: 190px"
        />
      </div>
    </div>

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

    <!-- AI proactive alert -->
    <VAlert color="secondary" variant="tonal" density="comfortable" class="mb-4" border="start">
      <template #prepend><VIcon icon="mdi-bell-ring-outline" /></template>
      <span class="text-caption">يوجد طلب جديد من «شركة تقنية المستقبل» قد يعجبك — تطابق 94%.</span>
    </VAlert>

    <!-- Horizontal request cards -->
    <VCard
      v-for="r in filtered"
      :key="r.id"
      class="pa-4 mb-3 cursor-pointer"
      @click="open(r.id)"
    >
      <div class="d-flex ga-4 flex-wrap flex-sm-nowrap align-center">
        <!-- Org logo -->
        <VAvatar :color="KIND_META[r.kind].color" size="56" rounded="lg">
          <span class="text-h6 text-white font-weight-bold">{{ r.orgInitial }}</span>
        </VAvatar>

        <!-- Main info -->
        <div class="flex-grow-1" style="min-width: 220px">
          <div class="d-flex align-center ga-2 flex-wrap mb-1">
            <VChip :color="KIND_META[r.kind].color" size="x-small" label :prepend-icon="KIND_META[r.kind].icon">
              {{ KIND_META[r.kind].label }}
            </VChip>
            <VChip :color="STATE_META[r.state].color" size="x-small" variant="tonal" label :prepend-icon="STATE_META[r.state].icon">
              {{ STATE_META[r.state].label }}
            </VChip>
          </div>
          <div class="text-subtitle-1 font-weight-bold mb-1">{{ r.title }}</div>
          <div class="d-flex align-center ga-2 text-caption text-medium-emphasis mb-2 flex-wrap">
            <span class="font-weight-bold">{{ r.org }}</span>
            <span class="d-flex align-center"><VIcon icon="mdi-star" color="amber" size="14" class="me-1" />{{ r.orgRating }} ({{ r.orgReviews }})</span>
            <span>· {{ r.field }}</span>
          </div>
          <div class="d-flex flex-wrap ga-1">
            <VChip size="x-small" variant="tonal" prepend-icon="mdi-map-marker-outline">{{ r.remote ? 'عن بُعد' : r.city }}</VChip>
            <VChip size="x-small" variant="tonal" prepend-icon="mdi-clock-outline">{{ r.duration }}</VChip>
            <VChip size="x-small" variant="tonal" prepend-icon="mdi-cash">{{ r.budget }}</VChip>
          </div>
        </div>

        <!-- Match ring + action -->
        <div class="text-center d-flex flex-column align-center" style="min-width: 84px">
          <VTooltip text="نسبة التطابق الذكي مع مهاراتك المُثبتة" location="top">
            <template #activator="{ props }">
              <VProgressCircular v-bind="props" :model-value="r.matchRate" :color="matchColor(r.matchRate)" :size="58" :width="5">
                <span class="text-caption font-weight-bold">{{ r.matchRate }}%</span>
              </VProgressCircular>
            </template>
          </VTooltip>
          <div class="text-caption text-medium-emphasis mt-1">تطابق</div>
          <VChip v-if="store.hasApplied(r.id)" color="success" size="x-small" label prepend-icon="mdi-check" class="mt-1">مقدّم</VChip>
        </div>
      </div>

      <VDivider class="my-2" />
      <div class="d-flex align-center justify-space-between text-caption text-medium-emphasis">
        <span><VIcon icon="mdi-account-group-outline" size="14" /> {{ r.applicants }} متقدم · {{ r.postedAt }}</span>
        <span class="text-primary d-flex align-center">التفاصيل <VIcon icon="mdi-arrow-left" size="16" class="ms-1" /></span>
      </div>
    </VCard>

    <VCard v-if="!filtered.length">
      <EmptyState
        icon="mdi-magnify-close"
        title="لا طلبات مطابقة"
        description="وسّع نطاق المدة أو المقابل، أو أزل بعض الفلاتر لعرض المزيد."
      />
    </VCard>

    <!-- Filter side sheet -->
    <VNavigationDrawer v-model="filterDrawer" temporary location="end" width="330">
      <div class="pa-4">
        <div class="d-flex align-center justify-space-between mb-4">
          <span class="text-subtitle-1 font-weight-bold"><VIcon icon="mdi-filter-variant" class="me-1" /> فلترة الطلبات</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="filterDrawer = false" />
        </div>

        <TaxonomyTree v-model="treeSel" :items="treeItems" class="mb-4" />
        <VDivider class="mb-4" />

        <div class="text-caption font-weight-bold mb-2">نوع الطلب</div>
        <div class="d-flex flex-wrap ga-1 mb-4">
          <VChip
            v-for="k in kinds"
            :key="k"
            :color="selectedKinds.includes(k) ? KIND_META[k].color : undefined"
            :variant="selectedKinds.includes(k) ? 'flat' : 'outlined'"
            size="small"
            :prepend-icon="KIND_META[k].icon"
            @click="toggleKind(k)"
          >
            {{ KIND_META[k].label }}
          </VChip>
        </div>

        <VSelect
          v-model="selectedField"
          :items="store.fields"
          label="المجال"
          density="compact"
          variant="outlined"
          clearable
          hide-details
          class="mb-4"
        />

        <div class="text-caption font-weight-bold mb-1">المدة (حتى {{ maxWeeks }} أسبوع)</div>
        <VSlider v-model="maxWeeks" :min="1" :max="20" :step="1" color="accent" hide-details class="mb-3" />

        <div class="text-caption font-weight-bold mb-1">حد أدنى للمقابل ({{ minBudget.toLocaleString('en-US') }} ريال)</div>
        <VSlider v-model="minBudget" :min="0" :max="50000" :step="2500" color="secondary" hide-details class="mb-3" />

        <VSwitch v-model="remoteOnly" label="عن بُعد فقط" color="primary" density="compact" hide-details class="mb-4" />

        <div class="d-flex ga-2">
          <VBtn variant="tonal" block @click="resetFilters">إعادة تعيين</VBtn>
          <VBtn color="accent" block @click="filterDrawer = false">عرض ({{ filtered.length }})</VBtn>
        </div>
      </div>
    </VNavigationDrawer>
  </div>
</template>

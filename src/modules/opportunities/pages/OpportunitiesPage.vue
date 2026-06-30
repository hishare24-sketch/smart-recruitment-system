<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import OpportunityCard from '../components/OpportunityCard.vue'
import { mockOpportunities } from '../services/mockOpportunities'
import { EMPLOYMENT_TYPE_LABELS } from '../interfaces/Opportunity'
import type { EmploymentType } from '../interfaces/Opportunity'

const search = ref('')
const selectedType = ref<EmploymentType | null>(null)
const view = ref<'grid' | 'list'>('grid')

const typeOptions = (Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map(value => ({
  value,
  title: EMPLOYMENT_TYPE_LABELS[value],
}))

const filtered = computed(() => {
  return mockOpportunities.filter((o) => {
    const matchesSearch = !search.value
      || o.title.includes(search.value)
      || o.company.includes(search.value)
    const matchesType = !selectedType.value || o.type === selectedType.value
    return matchesSearch && matchesType
  })
})
</script>

<template>
  <div>
    <PageHeader
      title="استعراض الفرص"
      subtitle="فرص مرشّحة لك بالذكاء الاصطناعي حسب ملفك"
      icon="mdi-briefcase-search-outline"
    >
      <template #actions>
        <VBtnToggle v-model="view" mandatory density="comfortable" color="primary" variant="outlined">
          <VBtn value="grid" icon="mdi-view-grid-outline" size="small" />
          <VBtn value="list" icon="mdi-view-list-outline" size="small" />
        </VBtnToggle>
      </template>
    </PageHeader>

    <!-- Search & filters -->
    <VCard class="pa-4 mb-5">
      <VRow dense align="center">
        <VCol cols="12" md="6">
          <VTextField
            v-model="search"
            placeholder="ابحث عن مسمى وظيفي أو شركة..."
            prepend-inner-icon="mdi-magnify"
            hide-details
            clearable
          />
        </VCol>
        <VCol cols="12" md="4">
          <VSelect
            v-model="selectedType"
            :items="typeOptions"
            placeholder="نوع الدوام"
            prepend-inner-icon="mdi-filter-variant"
            hide-details
            clearable
          />
        </VCol>
        <VCol cols="12" md="2">
          <VBtn color="primary" block size="large">
            بحث متقدم
          </VBtn>
        </VCol>
      </VRow>
    </VCard>

    <div class="text-body-2 text-medium-emphasis mb-3">
      {{ filtered.length }} فرصة متاحة
    </div>

    <!-- Results -->
    <VRow v-if="filtered.length">
      <VCol
        v-for="opp in filtered"
        :key="opp.id"
        cols="12"
        :md="view === 'grid' ? 6 : 12"
        :lg="view === 'grid' ? 4 : 12"
      >
        <OpportunityCard :opportunity="opp" />
      </VCol>
    </VRow>

    <VCard v-else class="pa-12 text-center">
      <VIcon icon="mdi-briefcase-remove-outline" size="64" color="medium-emphasis" />
      <div class="text-h6 mt-3">
        لا توجد فرص مطابقة
      </div>
      <div class="text-body-2 text-medium-emphasis">
        جرّب تعديل كلمات البحث أو الفلاتر
      </div>
    </VCard>
  </div>
</template>

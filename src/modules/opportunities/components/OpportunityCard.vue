<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Opportunity } from '../interfaces/Opportunity'
import { EMPLOYMENT_TYPE_LABELS } from '../interfaces/Opportunity'

const props = defineProps<{ opportunity: Opportunity }>()
const router = useRouter()

function matchColor(rate: number) {
  if (rate >= 85)
    return 'success'
  if (rate >= 70)
    return 'secondary'
  return 'warning'
}

function openDetails() {
  router.push({ name: 'opportunity-details', params: { id: props.opportunity.id } })
}
</script>

<template>
  <VCard class="pa-4 d-flex flex-column" height="100%">
    <div class="d-flex align-start justify-space-between mb-2">
      <div class="d-flex align-center ga-3">
        <VAvatar color="primary" variant="tonal" rounded="lg" size="46">
          <VIcon icon="mdi-domain" />
        </VAvatar>
        <div>
          <div class="text-subtitle-1 font-weight-bold">
            {{ opportunity.title }}
          </div>
          <div class="text-body-2 text-medium-emphasis">
            {{ opportunity.company }}
          </div>
        </div>
      </div>
      <VChip v-if="opportunity.isNew" color="accent" size="x-small" label>
        جديد
      </VChip>
    </div>

    <div class="d-flex flex-wrap ga-2 my-2">
      <VChip size="small" variant="tonal" prepend-icon="mdi-map-marker-outline">
        {{ opportunity.location }}
      </VChip>
      <VChip size="small" variant="tonal" prepend-icon="mdi-briefcase-outline">
        {{ EMPLOYMENT_TYPE_LABELS[opportunity.type] }}
      </VChip>
    </div>

    <!-- Match rate -->
    <div class="mt-2">
      <div class="d-flex justify-space-between text-caption mb-1">
        <span class="text-medium-emphasis">نسبة التطابق الذكي</span>
        <span class="font-weight-bold" :class="`text-${matchColor(opportunity.matchRate)}`">
          {{ opportunity.matchRate }}%
        </span>
      </div>
      <VProgressLinear
        :model-value="opportunity.matchRate"
        :color="matchColor(opportunity.matchRate)"
        height="6"
        rounded
      />
    </div>

    <div class="d-flex align-center justify-space-between mt-4 pt-2">
      <span class="text-caption text-medium-emphasis">
        <VIcon icon="mdi-account-multiple-outline" size="16" /> {{ opportunity.applicants }} متقدم
      </span>
      <span class="text-caption text-medium-emphasis">{{ opportunity.postedAt }}</span>
    </div>

    <VDivider class="my-3" />

    <div class="d-flex ga-2 mt-auto">
      <VBtn color="accent" size="small" class="flex-grow-1" @click="openDetails">
        تقدّم الآن
      </VBtn>
      <VBtn variant="outlined" color="primary" size="small" @click="openDetails">
        التفاصيل
      </VBtn>
    </div>
  </VCard>
</template>

<script setup lang="ts">
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'

const kpis = [
  { title: 'الفرص المنشورة', value: 18, icon: 'mdi-briefcase-outline', color: 'primary' },
  { title: 'إجمالي الترشيحات', value: 214, icon: 'mdi-account-group-outline', color: 'secondary' },
  { title: 'متوسط وقت التوظيف', value: '9 أيام', icon: 'mdi-clock-fast', color: 'accent' },
  { title: 'معدل التطابق', value: '82%', icon: 'mdi-target', color: 'success' },
]

// Simple bar data (applications over last 6 months)
const monthly = [
  { month: 'يناير', value: 32 },
  { month: 'فبراير', value: 41 },
  { month: 'مارس', value: 28 },
  { month: 'أبريل', value: 55 },
  { month: 'مايو', value: 47 },
  { month: 'يونيو', value: 62 },
]
const maxVal = Math.max(...monthly.map(m => m.value))

const topSkills = [
  { skill: 'Vue.js', count: 86 },
  { skill: 'TypeScript', count: 72 },
  { skill: 'Node.js', count: 64 },
  { skill: 'UI/UX', count: 51 },
  { skill: 'Python', count: 43 },
]
const maxSkill = Math.max(...topSkills.map(s => s.count))

const levels = [
  { label: 'مبتدئ', value: 35, color: 'info' },
  { label: 'متوسط', value: 45, color: 'secondary' },
  { label: 'خبير', value: 20, color: 'success' },
]
</script>

<template>
  <div>
    <PageHeader
      title="التحليلات والتقارير"
      subtitle="رؤى ذكية عن أداء التوظيف وسوق المواهب"
      icon="mdi-chart-box-outline"
    >
      <template #actions>
        <VBtn color="primary" variant="outlined" prepend-icon="mdi-download">تصدير التقرير</VBtn>
      </template>
    </PageHeader>

    <VRow class="mb-2">
      <VCol v-for="k in kpis" :key="k.title" cols="12" sm="6" lg="3">
        <StatCard v-bind="k" />
      </VCol>
    </VRow>

    <VRow>
      <!-- Applications bar chart -->
      <VCol cols="12" lg="8">
        <VCard class="pa-5" height="100%">
          <div class="text-subtitle-1 font-weight-bold mb-4">الترشيحات خلال آخر 6 أشهر</div>
          <div class="d-flex align-end justify-space-between ga-3" style="height: 220px">
            <div v-for="m in monthly" :key="m.month" class="d-flex flex-column align-center flex-grow-1">
              <div class="text-caption font-weight-bold mb-1">{{ m.value }}</div>
              <div
                class="w-100 rounded-t-lg"
                :style="{ height: `${(m.value / maxVal) * 170}px`, background: 'linear-gradient(180deg,#319795,#1A365D)' }"
              />
              <div class="text-caption text-medium-emphasis mt-2">{{ m.month }}</div>
            </div>
          </div>
        </VCard>
      </VCol>

      <!-- Candidate levels -->
      <VCol cols="12" lg="4">
        <VCard class="pa-5" height="100%">
          <div class="text-subtitle-1 font-weight-bold mb-4">توزيع المرشحين حسب المستوى</div>
          <div v-for="lvl in levels" :key="lvl.label" class="mb-4">
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>{{ lvl.label }}</span>
              <span class="font-weight-bold">{{ lvl.value }}%</span>
            </div>
            <VProgressLinear :model-value="lvl.value" :color="lvl.color" height="10" rounded />
          </div>
          <VDivider class="my-4" />
          <VAlert type="info" variant="tonal" density="compact" class="text-caption">
            <VIcon icon="mdi-robot-happy-outline" size="14" /> توقّع الـ AI: الطلب على مهارات Vue.js سيرتفع 18% الربع القادم.
          </VAlert>
        </VCard>
      </VCol>

      <!-- Top skills -->
      <VCol cols="12">
        <VCard class="pa-5">
          <div class="text-subtitle-1 font-weight-bold mb-4">أكثر المهارات شيوعاً بين المرشحين</div>
          <div v-for="s in topSkills" :key="s.skill" class="d-flex align-center ga-3 mb-3">
            <div class="text-body-2 font-weight-medium" style="width: 100px">{{ s.skill }}</div>
            <VProgressLinear :model-value="(s.count / maxSkill) * 100" color="accent" height="14" rounded class="flex-grow-1">
              <span class="text-caption on-accent font-weight-bold">{{ s.count }}</span>
            </VProgressLinear>
          </div>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

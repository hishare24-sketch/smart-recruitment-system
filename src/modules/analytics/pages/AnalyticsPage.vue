<script setup lang="ts">
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'

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
        <BaseButton variant="outline"><BaseIcon name="mdi-download" :size="16" />تصدير التقرير</BaseButton>
      </template>
    </PageHeader>

    <div class="mb-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard v-for="k in kpis" :key="k.title" v-bind="k" />
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <!-- Applications bar chart -->
      <div class="lg:col-span-8">
        <BaseCard class="h-full">
          <div class="mb-4 text-base font-bold text-content">الترشيحات خلال آخر 6 أشهر</div>
          <div class="flex items-end justify-between gap-3" style="height: 220px">
            <div v-for="m in monthly" :key="m.month" class="flex flex-1 flex-col items-center">
              <div class="mb-1 text-xs font-bold text-content">{{ m.value }}</div>
              <div
                class="w-full rounded-t-lg"
                :style="{ height: `${(m.value / maxVal) * 170}px`, background: 'linear-gradient(180deg,#319795,#1A365D)' }"
              />
              <div class="mt-2 text-xs text-muted">{{ m.month }}</div>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Candidate levels -->
      <div class="lg:col-span-4">
        <BaseCard class="h-full">
          <div class="mb-4 text-base font-bold text-content">توزيع المرشحين حسب المستوى</div>
          <div v-for="lvl in levels" :key="lvl.label" class="mb-4">
            <div class="mb-1 flex justify-between text-sm text-content">
              <span>{{ lvl.label }}</span>
              <span class="font-bold">{{ lvl.value }}%</span>
            </div>
            <BaseProgressBar :value="lvl.value" :color="lvl.color" :height="10" />
          </div>
          <hr class="my-4 border-ui">
          <div class="flex items-center gap-1 rounded-ui p-2 text-xs text-content" style="background: rgba(var(--v-theme-info), 0.14)">
            <BaseIcon name="mdi-robot-happy-outline" :size="14" :style="{ color: 'rgb(var(--v-theme-info))' }" /> توقّع الـ AI: الطلب على مهارات Vue.js سيرتفع 18% الربع القادم.
          </div>
        </BaseCard>
      </div>

      <!-- Top skills -->
      <div class="lg:col-span-12">
        <BaseCard>
          <div class="mb-4 text-base font-bold text-content">أكثر المهارات شيوعاً بين المرشحين</div>
          <div v-for="s in topSkills" :key="s.skill" class="mb-3 flex items-center gap-3">
            <div class="text-sm font-medium text-content" style="width: 100px">{{ s.skill }}</div>
            <div class="relative h-3.5 flex-1 overflow-hidden rounded-full" style="background: rgba(var(--v-theme-on-surface), 0.12)">
              <div
                class="flex h-full items-center justify-end rounded-full px-2 text-[10px] font-bold"
                :style="{ width: `${(s.count / maxSkill) * 100}%`, background: 'rgb(var(--v-theme-accent))', color: 'rgb(var(--v-theme-on-accent))' }"
              >{{ s.count }}</div>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>

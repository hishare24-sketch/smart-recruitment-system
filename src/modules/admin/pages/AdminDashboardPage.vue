<script setup lang="ts">
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'

const stats = [
  { title: 'إجمالي المستخدمين', value: '14,208', icon: 'mdi-account-multiple-outline', color: 'primary' },
  { title: 'الفرص النشطة', value: '3,142', icon: 'mdi-briefcase-outline', color: 'secondary' },
  { title: 'التوصيات الموثّقة', value: '8,761', icon: 'mdi-account-star-outline', color: 'accent' },
  { title: 'السير المنشأة', value: '5,930', icon: 'mdi-file-account-outline', color: 'success' },
]

const usersByRole = [
  { label: 'باحثون عن عمل', value: 68, color: 'primary' },
  { label: 'جهات توظيف', value: 18, color: 'secondary' },
  { label: 'موصون', value: 11, color: 'accent' },
  { label: 'مدراء', value: 3, color: 'info' },
]

const recentActivity = [
  { icon: 'mdi-account-plus-outline', text: 'انضم 128 مستخدماً جديداً اليوم', time: 'اليوم' },
  { icon: 'mdi-briefcase-plus-outline', text: 'نُشرت 42 فرصة جديدة', time: 'اليوم' },
  { icon: 'mdi-flag-outline', text: '3 بلاغات محتوى بانتظار المراجعة', time: 'قبل ساعتين' },
  { icon: 'mdi-robot-happy-outline', text: 'تم تحديث نموذج المطابقة الذكي', time: 'أمس' },
]

const health = [
  { label: 'زمن الاستجابة', value: '120ms', color: 'success' },
  { label: 'التوفّر', value: '99.9%', color: 'success' },
  { label: 'طلبات AI/دقيقة', value: '340', color: 'info' },
]
</script>

<template>
  <div>
    <PageHeader
      title="لوحة تحكم المدير"
      subtitle="نظرة شاملة على أداء المنصة"
      icon="mdi-shield-crown-outline"
    />

    <VRow class="mb-2">
      <VCol v-for="s in stats" :key="s.title" cols="12" sm="6" lg="3">
        <StatCard v-bind="s" />
      </VCol>
    </VRow>

    <VRow>
      <VCol cols="12" md="5">
        <VCard class="pa-5" height="100%">
          <div class="text-subtitle-1 font-weight-bold mb-4">توزيع المستخدمين حسب الدور</div>
          <div v-for="r in usersByRole" :key="r.label" class="mb-4">
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>{{ r.label }}</span>
              <span class="font-weight-bold">{{ r.value }}%</span>
            </div>
            <VProgressLinear :model-value="r.value" :color="r.color" height="10" rounded />
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" md="7">
        <VCard class="pa-5" height="100%">
          <div class="text-subtitle-1 font-weight-bold mb-3">نشاطات المنصة</div>
          <VList lines="two" class="py-0">
            <VListItem v-for="(a, i) in recentActivity" :key="i" class="px-0">
              <template #prepend>
                <VAvatar color="primary" variant="tonal" rounded="lg"><VIcon :icon="a.icon" /></VAvatar>
              </template>
              <VListItemTitle>{{ a.text }}</VListItemTitle>
              <VListItemSubtitle>{{ a.time }}</VListItemSubtitle>
            </VListItem>
          </VList>
        </VCard>
      </VCol>

      <VCol cols="12">
        <VCard class="pa-5">
          <div class="text-subtitle-1 font-weight-bold mb-4">صحة النظام</div>
          <VRow>
            <VCol v-for="h in health" :key="h.label" cols="12" sm="4">
              <div class="d-flex align-center ga-3">
                <VIcon icon="mdi-circle" :color="h.color" size="14" />
                <div>
                  <div class="text-h6 font-weight-bold">{{ h.value }}</div>
                  <div class="text-caption text-medium-emphasis">{{ h.label }}</div>
                </div>
              </div>
            </VCol>
          </VRow>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

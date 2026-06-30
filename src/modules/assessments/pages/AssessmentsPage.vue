<script setup lang="ts">
import PageHeader from '@/components/shared/PageHeader.vue'

const available = [
  { name: 'أساسيات JavaScript', type: 'مهاري', duration: '20 دقيقة', questions: 25, icon: 'mdi-language-javascript', color: 'warning' },
  { name: 'تحليل الشخصية المهنية', type: 'شخصي', duration: '15 دقيقة', questions: 40, icon: 'mdi-head-cog-outline', color: 'secondary' },
  { name: 'لعبة المنطق والذكاء', type: 'لعبة', duration: '10 دقائق', questions: 12, icon: 'mdi-puzzle-outline', color: 'accent' },
  { name: 'مهارات Vue.js المتقدمة', type: 'مهاري', duration: '30 دقيقة', questions: 30, icon: 'mdi-vuejs', color: 'success' },
]

const completed = [
  { name: 'أساسيات HTML & CSS', date: '2026-06-12', score: 92, level: 'متقدم' },
  { name: 'مهارات التواصل', date: '2026-05-28', score: 78, level: 'متوسط' },
]
</script>

<template>
  <div>
    <PageHeader
      title="مركز التقييم والاختبارات"
      subtitle="أثبت مهاراتك عبر اختبارات وألعاب ذكية"
      icon="mdi-clipboard-check-outline"
    />

    <h3 class="text-h6 font-weight-bold mb-3">الاختبارات المتاحة</h3>
    <VRow class="mb-4">
      <VCol v-for="test in available" :key="test.name" cols="12" sm="6" lg="3">
        <VCard class="pa-4 text-center" height="100%">
          <VAvatar :color="test.color" variant="tonal" size="56" rounded="lg" class="mb-3">
            <VIcon :icon="test.icon" size="30" />
          </VAvatar>
          <div class="text-subtitle-2 font-weight-bold">{{ test.name }}</div>
          <VChip size="x-small" label class="my-2">{{ test.type }}</VChip>
          <div class="text-caption text-medium-emphasis mb-3">
            <VIcon icon="mdi-clock-outline" size="14" /> {{ test.duration }} ·
            {{ test.questions }} سؤال
          </div>
          <VBtn color="accent" size="small" block>ابدأ الاختبار</VBtn>
        </VCard>
      </VCol>
    </VRow>

    <h3 class="text-h6 font-weight-bold mb-3">الاختبارات المنجزة</h3>
    <VCard>
      <VList lines="two">
        <template v-for="(test, i) in completed" :key="test.name">
          <VListItem>
            <template #prepend>
              <VAvatar :color="test.score >= 85 ? 'success' : 'warning'" variant="tonal" rounded="lg">
                <span class="font-weight-bold">{{ test.score }}</span>
              </VAvatar>
            </template>
            <VListItemTitle class="font-weight-bold">{{ test.name }}</VListItemTitle>
            <VListItemSubtitle>{{ test.date }} · المستوى: {{ test.level }}</VListItemSubtitle>
            <template #append>
              <VBtn variant="tonal" color="primary" size="small">عرض التحليل</VBtn>
            </template>
          </VListItem>
          <VDivider v-if="i < completed.length - 1" />
        </template>
      </VList>
    </VCard>
  </div>
</template>

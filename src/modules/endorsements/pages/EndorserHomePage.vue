<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'

const router = useRouter()

const pendingRequests = [
  { id: 1, name: 'أحمد المنصور', relation: 'زميل سابق', date: 'قبل يومين' },
  { id: 2, name: 'سارة العتيبي', relation: 'عملنا في نفس الفريق', date: 'قبل 4 أيام' },
]

const givenEndorsements = [
  { name: 'خالد الحربي', date: '2026-06-10', type: 'فيديو', views: 24 },
  { name: 'نورة القحطاني', date: '2026-05-22', type: 'نص', views: 15 },
]

const stats = [
  { title: 'طلبات معلّقة', value: 2, icon: 'mdi-account-clock-outline', color: 'warning' },
  { title: 'توصيات مقدّمة', value: 8, icon: 'mdi-account-star-outline', color: 'primary' },
  { title: 'مشاهدات توصياتك', value: 142, icon: 'mdi-eye-outline', color: 'secondary' },
]

function addEndorsement(id?: number) {
  router.push({ name: 'add-endorsement', query: id ? { request: String(id) } : {} })
}
</script>

<template>
  <div>
    <PageHeader
      title="لوحة الموصي"
      subtitle="قدّم توصيات موثّقة لزملائك وتابع تأثيرها"
      icon="mdi-account-star-outline"
    />

    <VRow class="mb-2">
      <VCol v-for="s in stats" :key="s.title" cols="12" sm="4">
        <StatCard v-bind="s" />
      </VCol>
    </VRow>

    <VRow>
      <!-- Pending requests -->
      <VCol cols="12" md="6">
        <h3 class="text-h6 font-weight-bold mb-3">طلبات التوصية المعلّقة</h3>
        <VCard>
          <VList lines="two">
            <template v-for="(req, i) in pendingRequests" :key="req.id">
              <VListItem>
                <template #prepend>
                  <VAvatar color="warning" variant="tonal"><VIcon icon="mdi-account-clock-outline" /></VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">{{ req.name }}</VListItemTitle>
                <VListItemSubtitle>{{ req.relation }} · {{ req.date }}</VListItemSubtitle>
                <template #append>
                  <VBtn color="accent" size="small" @click="addEndorsement(req.id)">إضافة توصية</VBtn>
                </template>
              </VListItem>
              <VDivider v-if="i < pendingRequests.length - 1" />
            </template>
          </VList>
        </VCard>
      </VCol>

      <!-- Given endorsements -->
      <VCol cols="12" md="6">
        <h3 class="text-h6 font-weight-bold mb-3">التوصيات المقدّمة سابقاً</h3>
        <VCard>
          <VList lines="two">
            <template v-for="(e, i) in givenEndorsements" :key="e.name">
              <VListItem>
                <template #prepend>
                  <VAvatar color="primary" variant="tonal"><VIcon icon="mdi-account-star-outline" /></VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">{{ e.name }}</VListItemTitle>
                <VListItemSubtitle>{{ e.date }} · {{ e.type }} · {{ e.views }} مشاهدة</VListItemSubtitle>
                <template #append>
                  <VBtn variant="text" size="small" color="primary">عرض</VBtn>
                </template>
              </VListItem>
              <VDivider v-if="i < givenEndorsements.length - 1" />
            </template>
          </VList>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

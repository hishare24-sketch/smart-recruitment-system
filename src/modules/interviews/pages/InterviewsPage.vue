<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { LEVEL_META, TYPE_META, useInterviewsStore } from '@/stores/InterviewsStore'
import type { Interview } from '@/stores/InterviewsStore'
import type { InterviewLevel, InterviewType } from '@/services/ai'

const router = useRouter()
const store = useInterviewsStore()

const types = Object.keys(TYPE_META) as InterviewType[]
const levels = Object.keys(LEVEL_META) as InterviewLevel[]

const setupDialog = ref(false)
const chosenType = ref<InterviewType>('ai_text')
const chosenLevel = ref<InterviewLevel>('intermediate')

function openSetup(type: InterviewType) {
  chosenType.value = type
  chosenLevel.value = 'intermediate'
  setupDialog.value = true
}

function startNow() {
  const id = store.start(chosenType.value, chosenLevel.value)
  setupDialog.value = false
  if (chosenType.value === 'ai_text' || chosenType.value === 'ai_video')
    router.push({ name: 'interview-session', params: { id } })
  else
    router.push({ name: 'interviews' })
}

function viewResult(iv: Interview) {
  router.push({ name: 'interview-result', params: { id: iv.id } })
}
</script>

<template>
  <div>
    <PageHeader
      title="المقابلات وتحديد المستوى"
      subtitle="أثبت مستواك عبر مقابلات ذكية أو مع خبراء — ترفع نسبة ثقتك"
      icon="mdi-account-tie-voice-outline"
    />

    <!-- Available -->
    <h3 class="text-h6 font-weight-bold mb-3">المقابلات المتاحة</h3>
    <VRow class="mb-4">
      <VCol v-for="t in types" :key="t" cols="12" sm="6" lg="3">
        <VCard class="pa-4 text-center h-100 d-flex flex-column">
          <VAvatar color="primary" variant="tonal" size="56" rounded="lg" class="mb-3 mx-auto"><VIcon :icon="TYPE_META[t].icon" size="30" /></VAvatar>
          <div class="text-subtitle-2 font-weight-bold">{{ TYPE_META[t].label }}</div>
          <div class="text-caption text-medium-emphasis mb-3 flex-grow-1">{{ TYPE_META[t].desc }}</div>
          <VBtn color="accent" size="small" block @click="openSetup(t)">اختيار المستوى</VBtn>
        </VCard>
      </VCol>
    </VRow>

    <!-- History -->
    <h3 class="text-h6 font-weight-bold mb-3">سجل المقابلات ({{ store.count }})</h3>
    <VCard v-if="store.count">
      <VList lines="two">
        <template v-for="(iv, i) in store.interviews" :key="iv.id">
          <VListItem>
            <template #prepend>
              <VAvatar :color="iv.status === 'completed' ? 'success' : 'warning'" variant="tonal" rounded="lg">
                <VIcon :icon="TYPE_META[iv.type].icon" />
              </VAvatar>
            </template>
            <VListItemTitle class="font-weight-bold">
              {{ TYPE_META[iv.type].label }} · {{ LEVEL_META[iv.level].label }}
            </VListItemTitle>
            <VListItemSubtitle>
              {{ iv.date }} ·
              <span v-if="iv.result">النتيجة {{ iv.result.score }}% ({{ iv.result.level }})</span>
              <span v-else>{{ iv.status === 'in_progress' ? 'قيد التنفيذ' : 'مجدولة' }}</span>
            </VListItemSubtitle>
            <template #append>
              <VBtn v-if="iv.status === 'completed'" variant="tonal" color="primary" size="small" @click="viewResult(iv)">التقرير</VBtn>
              <VBtn v-else-if="iv.status === 'in_progress'" color="accent" size="small" @click="router.push({ name: 'interview-session', params: { id: iv.id } })">متابعة</VBtn>
            </template>
          </VListItem>
          <VDivider v-if="i < store.interviews.length - 1" />
        </template>
      </VList>
    </VCard>
    <VCard v-else class="pa-8 text-center">
      <VIcon icon="mdi-account-voice" size="48" color="medium-emphasis" />
      <div class="text-body-2 text-medium-emphasis mt-2">لم تُجرِ أي مقابلة بعد — ابدأ بمقابلة AI أساسية مجانية</div>
    </VCard>

    <!-- Setup dialog -->
    <VDialog v-model="setupDialog" max-width="520">
      <VCard class="pa-2">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>{{ TYPE_META[chosenType].label }}</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="setupDialog = false" />
        </VCardTitle>
        <VCardText>
          <div class="text-body-2 font-weight-bold mb-2">اختر المستوى</div>
          <VCard
            v-for="lvl in levels"
            :key="lvl"
            :variant="chosenLevel === lvl ? 'flat' : 'outlined'"
            :color="chosenLevel === lvl ? 'primary' : undefined"
            class="pa-3 mb-2 cursor-pointer d-flex align-center justify-space-between"
            @click="chosenLevel = lvl"
          >
            <div class="d-flex align-center ga-2">
              <VIcon :icon="chosenLevel === lvl ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'" :color="chosenLevel === lvl ? 'white' : undefined" />
              <span :class="chosenLevel === lvl ? 'text-white' : ''">{{ LEVEL_META[lvl].label }}</span>
            </div>
            <VChip size="small" :color="chosenLevel === lvl ? 'white' : 'accent'" :variant="chosenLevel === lvl ? 'flat' : 'tonal'" label>
              {{ LEVEL_META[lvl].cost === 0 ? 'مجاني' : `${LEVEL_META[lvl].cost} ريال` }}
            </VChip>
          </VCard>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="setupDialog = false">إلغاء</VBtn>
          <VBtn v-if="chosenType === 'external' || chosenType === 'expert'" color="secondary" variant="tonal" prepend-icon="mdi-calendar">جدولة</VBtn>
          <VBtn color="accent" prepend-icon="mdi-play" @click="startNow">
            {{ chosenType === 'external' || chosenType === 'expert' ? 'طلب المقابلة' : 'بدء الآن' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

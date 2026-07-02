<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { KIND_META, useRequestsStore } from '@/stores/RequestsStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { useResumesStore } from '@/stores/ResumesStore'
import { ai } from '@/services/ai'

const route = useRoute()
const router = useRouter()
const store = useRequestsStore()
const profile = useProfileStore()
const resumesStore = useResumesStore()

const request = computed(() => store.getById(Number(route.params.id)))
const similar = computed(() => store.similar(Number(route.params.id)))
const applied = computed(() => (request.value ? store.hasApplied(request.value.id) : false))

const breakdown = computed(() => {
  const b = request.value?.breakdown
  return [
    { label: 'المهارات', value: b?.skills ?? 0 },
    { label: 'الخبرات', value: b?.experience ?? 0 },
    { label: 'الموقع', value: b?.location ?? 0 },
    { label: 'المدة', value: b?.duration ?? 0 },
  ]
})

// AI narrative match analysis
const matchNarrative = computed(() => {
  if (!request.value)
    return ''
  const b = request.value.breakdown
  const weakest = [...breakdown.value].sort((a, b2) => a.value - b2.value)[0]
  return `مهاراتك تتناسب مع هذا الطلب بنسبة ${b.skills}%. أقوى جوانبك «${breakdown.value[0].value >= 85 ? 'المهارات' : 'الخبرة'}»، بينما «${weakest.label}» (${weakest.value}%) هو الأقل — عزّزه بإضافة ${weakest.label === 'المهارات' ? 'اختبار مهارة' : 'مشروع'} ذي صلة لرفع فرصك.`
})

const faqs = computed(() => (request.value ? ai.generatedFaqs(request.value.title, request.value.kind) : []))
const forecast = computed(() => (request.value ? ai.applicationForecast(request.value.org, request.value.avgResponseDays) : ''))

// Apply dialog
const applyDialog = ref(false)
const resumes = computed(() => resumesStore.resumes)
const selectedResume = ref<number | null>(resumesStore.active?.id ?? null)
const appliedSnackbar = ref(false)
function confirmApply() {
  if (request.value)
    store.apply(request.value)
  applyDialog.value = false
  appliedSnackbar.value = true
}

// AI negotiation dialog
const negotiationDialog = ref(false)
const negotiationText = ref('')
const negotiationLoading = ref(false)
function openNegotiation() {
  negotiationDialog.value = true
  negotiationLoading.value = true
  negotiationText.value = ''
  setTimeout(() => {
    if (request.value) {
      const strengths = profile.skills
        .filter(s => !profile.unverifiedSkills.includes(s.name))
        .map(s => s.name)
      negotiationText.value = ai.negotiationDraft(request.value.title, request.value.org, strengths)
    }
    negotiationLoading.value = false
  }, 900)
}
function copyNegotiation() {
  navigator.clipboard?.writeText(negotiationText.value)
  negotiationDialog.value = false
  router.push({ name: 'messages' })
}
</script>

<template>
  <div v-if="request">
    <VBtn variant="text" prepend-icon="mdi-arrow-right" class="mb-3" @click="router.back()">رجوع</VBtn>

    <VRow>
      <!-- Main -->
      <VCol cols="12" md="8">
        <VCard class="pa-5 mb-4">
          <div class="d-flex align-start ga-4 mb-3">
            <VAvatar :color="KIND_META[request.kind].color" variant="tonal" rounded="lg" size="64">
              <span class="text-h4 font-weight-bold">{{ request.orgInitial }}</span>
            </VAvatar>
            <div>
              <div class="d-flex align-center ga-2 flex-wrap">
                <h1 class="text-h5 font-weight-bold">{{ request.title }}</h1>
                <VChip :color="KIND_META[request.kind].color" size="small" label :prepend-icon="KIND_META[request.kind].icon">
                  {{ KIND_META[request.kind].label }}
                </VChip>
              </div>
              <div class="text-body-1 text-medium-emphasis">{{ request.org }} · {{ request.field }}</div>
            </div>
          </div>

          <div class="d-flex flex-wrap ga-2 mb-4">
            <VChip variant="tonal" prepend-icon="mdi-map-marker-outline">{{ request.remote ? 'عن بُعد' : request.city }}</VChip>
            <VChip variant="tonal" prepend-icon="mdi-clock-outline">{{ request.duration }}</VChip>
            <VChip variant="tonal" prepend-icon="mdi-cash">{{ request.budget }}</VChip>
            <VChip variant="tonal" prepend-icon="mdi-account-multiple-outline">{{ request.applicants }} متقدم</VChip>
          </div>

          <VDivider class="mb-4" />

          <h3 class="text-subtitle-1 font-weight-bold mb-2">وصف الطلب</h3>
          <p class="text-body-2 text-medium-emphasis mb-4">{{ request.description }}</p>

          <h3 class="text-subtitle-1 font-weight-bold mb-2">المخرجات المتوقّعة</h3>
          <VList density="compact" class="py-0 mb-3">
            <VListItem v-for="d in request.deliverables" :key="d" class="px-0">
              <template #prepend><VIcon icon="mdi-check-circle-outline" color="success" size="18" /></template>
              <VListItemTitle class="text-body-2">{{ d }}</VListItemTitle>
            </VListItem>
          </VList>

          <h3 class="text-subtitle-1 font-weight-bold mb-2">المهارات المطلوبة</h3>
          <div class="d-flex flex-wrap ga-2">
            <VChip v-for="s in request.skills" :key="s" color="secondary" variant="tonal" size="small">{{ s }}</VChip>
          </div>
        </VCard>

        <!-- AI-generated FAQs -->
        <VCard class="pa-5 mb-4">
          <div class="d-flex align-center ga-2 mb-3">
            <VIcon icon="mdi-robot-happy-outline" color="secondary" />
            <h3 class="text-subtitle-1 font-weight-bold">أسئلة شائعة (مولّدة بالذكاء الاصطناعي)</h3>
          </div>
          <VExpansionPanels variant="accordion">
            <VExpansionPanel v-for="(f, i) in faqs" :key="i" :title="f.question">
              <template #text>
                <span class="text-body-2 text-medium-emphasis">{{ f.answer }}</span>
              </template>
            </VExpansionPanel>
          </VExpansionPanels>
        </VCard>

        <!-- Similar -->
        <template v-if="similar.length">
          <h3 class="text-h6 font-weight-bold mb-3">طلبات مشابهة</h3>
          <VRow>
            <VCol v-for="r in similar" :key="r.id" cols="12" sm="4">
              <VCard class="pa-3 cursor-pointer" height="100%" @click="router.push({ name: 'request-details', params: { id: r.id } })">
                <VChip :color="KIND_META[r.kind].color" size="x-small" label class="mb-2">{{ KIND_META[r.kind].label }}</VChip>
                <div class="text-subtitle-2 font-weight-bold text-truncate">{{ r.title }}</div>
                <div class="text-caption text-medium-emphasis">{{ r.org }}</div>
                <VChip color="success" size="x-small" label class="mt-2">{{ r.matchRate }}% تطابق</VChip>
              </VCard>
            </VCol>
          </VRow>
        </template>
      </VCol>

      <!-- Sidebar -->
      <VCol cols="12" md="4">
        <VCard class="pa-5 mb-4">
          <div class="text-center mb-3">
            <VProgressCircular :model-value="request.matchRate" :size="110" :width="10" color="success">
              <span class="text-h5 font-weight-bold">{{ request.matchRate }}%</span>
            </VProgressCircular>
            <div class="text-body-2 text-medium-emphasis mt-2">نسبة تطابقك مع الطلب</div>
          </div>

          <VBtn
            color="accent"
            size="large"
            block
            :disabled="applied"
            :prepend-icon="applied ? 'mdi-check' : 'mdi-send'"
            @click="applyDialog = true"
          >
            {{ applied ? 'تم التقديم' : 'تقدّم الآن' }}
          </VBtn>
          <VBtn variant="outlined" color="secondary" block class="mt-2" prepend-icon="mdi-handshake-outline" @click="openNegotiation">
            تفاوض مدعوم من AI
          </VBtn>

          <VAlert type="info" variant="tonal" density="compact" class="mt-3 text-caption">
            <VIcon icon="mdi-clock-fast" size="16" class="me-1" />{{ forecast }}
          </VAlert>
        </VCard>

        <!-- Match analysis -->
        <VCard class="pa-5">
          <div class="text-subtitle-1 font-weight-bold mb-3">تحليل التطابق التفصيلي</div>
          <div v-for="item in breakdown" :key="item.label" class="mb-3">
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>{{ item.label }}</span>
              <span class="font-weight-bold">{{ item.value }}%</span>
            </div>
            <VProgressLinear :model-value="item.value" color="primary" height="6" rounded />
          </div>
          <VAlert color="secondary" variant="tonal" density="compact" class="mt-2" border="start">
            <template #prepend><VIcon icon="mdi-robot-happy-outline" size="18" /></template>
            <span class="text-caption">{{ matchNarrative }}</span>
          </VAlert>
        </VCard>
      </VCol>
    </VRow>

    <!-- Apply dialog -->
    <VDialog v-model="applyDialog" max-width="520">
      <VCard class="pa-2">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>التقديم بسيرة ذاتية</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="applyDialog = false" />
        </VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-3">اختر السيرة الأنسب لهذا الطلب (الـ AI يوصي بالسيرة النشطة):</p>
          <VCard
            v-for="r in resumes"
            :key="r.id"
            :variant="selectedResume === r.id ? 'flat' : 'outlined'"
            :color="selectedResume === r.id ? 'primary' : undefined"
            class="pa-3 mb-2 cursor-pointer d-flex align-center ga-3"
            @click="selectedResume = r.id"
          >
            <VIcon :icon="selectedResume === r.id ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'" />
            <div>
              <div class="text-body-2 font-weight-bold">{{ r.name }}</div>
              <div class="text-caption" :class="selectedResume === r.id ? '' : 'text-medium-emphasis'">{{ r.template }} · {{ r.language }}</div>
            </div>
          </VCard>
          <VBtn variant="tonal" color="secondary" block class="mt-2" prepend-icon="mdi-plus" :to="{ name: 'resume-builder' }">
            إنشاء سيرة جديدة لهذا الطلب
          </VBtn>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="applyDialog = false">إلغاء</VBtn>
          <VBtn color="accent" prepend-icon="mdi-send" @click="confirmApply">تأكيد التقديم</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- AI negotiation dialog -->
    <VDialog v-model="negotiationDialog" max-width="560">
      <VCard class="pa-2">
        <VCardTitle class="d-flex align-center ga-2">
          <VIcon icon="mdi-robot-happy-outline" color="secondary" />
          <span>تفاوض مدعوم من AI</span>
        </VCardTitle>
        <VCardText>
          <p class="text-caption text-medium-emphasis mb-2">صاغ الـ AI رسالة تفاوض احترافية تستند إلى نقاط قوتك المُثبتة:</p>
          <VSkeletonLoader v-if="negotiationLoading" type="paragraph" />
          <VTextarea v-else v-model="negotiationText" auto-grow rows="8" variant="outlined" />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="negotiationDialog = false">إغلاق</VBtn>
          <VBtn color="secondary" :disabled="negotiationLoading" prepend-icon="mdi-send" @click="copyNegotiation">
            إرسال عبر الرسائل
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar v-model="appliedSnackbar" color="success" timeout="4000">
      تم إرسال طلبك بنجاح!
      <template #actions>
        <VBtn variant="text" @click="router.push({ name: 'my-requests' })">طلباتي</VBtn>
      </template>
    </VSnackbar>
  </div>

  <VCard v-else class="pa-12 text-center">
    <VIcon icon="mdi-alert-circle-outline" size="64" color="error" />
    <div class="text-h6 mt-3">الطلب غير موجود</div>
    <VBtn color="primary" class="mt-3" :to="{ name: 'requests' }">العودة للسوق</VBtn>
  </VCard>
</template>

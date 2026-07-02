<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import ReviewsPanel from '@/components/shared/ReviewsPanel.vue'
import StatCard from '@/components/shared/StatCard.vue'
import { COMMISSION_NOTE, KIND_META, useInterviewersStore } from '@/stores/InterviewersStore'
import type { AgendaItem, MarketInterviewKind } from '@/stores/InterviewersStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { ai } from '@/services/ai'
import type { EvalElementSuggestion } from '@/services/ai'

const router = useRouter()
const store = useInterviewersStore()
const notifications = useNotificationsStore()

function acceptRequest(a: AgendaItem) {
  store.acceptRequest(a.id)
  notifications.push({
    icon: 'mdi-calendar-check-outline',
    color: 'success',
    title: 'قبلت طلب مقابلة',
    body: `أكّدت مقابلة ${KIND_META[a.kind].label} مع ${a.candidateName} — ${a.datetime}`,
    category: 'interview',
  })
}

const stats = computed(() => [
  { title: 'أرباح الشهر', value: `${store.interviewerStats.earnings} ﷼`, icon: 'mdi-cash-multiple', color: 'success' },
  { title: 'مقابلات منفّذة', value: store.interviewerStats.sessions, icon: 'mdi-check-decagram', color: 'primary' },
  { title: 'متوسط التقييم', value: `${store.interviewerStats.avgRating} ★`, icon: 'mdi-star', color: 'warning' },
  { title: 'طلبات جديدة', value: store.interviewerStats.pending, icon: 'mdi-bell-ring-outline', color: 'accent' },
])

// Pricing management
const priceDialog = ref(false)
const kinds = Object.keys(KIND_META) as MarketInterviewKind[]
const draftPricing = ref<Record<MarketInterviewKind, number>>({ ...store.pricing })
function openPricing() {
  draftPricing.value = { ...store.pricing }
  priceDialog.value = true
}
function savePricing() {
  kinds.forEach(k => store.setPrice(k, draftPricing.value[k]))
  priceDialog.value = false
}

// Custom evaluation elements management
const commissionNote = COMMISSION_NOTE
const newElement = ref({ name: '', description: '', price: 50 })
function addElement() {
  if (!newElement.value.name.trim())
    return
  store.addEvalElement({ name: newElement.value.name.trim(), description: newElement.value.description.trim(), price: newElement.value.price })
  newElement.value = { name: '', description: '', price: 50 }
}
const suggestions = ref<EvalElementSuggestion[]>([])
function loadSuggestions() {
  suggestions.value = ai.suggestEvalElements('technical', [])
}
function addSuggestion(s: EvalElementSuggestion) {
  store.addEvalElement({ name: s.name, description: s.description, price: s.price })
  suggestions.value = suggestions.value.filter(x => x.name !== s.name)
}
</script>

<template>
  <div>
    <PageHeader
      title="لوحة المقيّم"
      subtitle="أدر مقابلاتك التقييمية وأرباحك وأسعارك"
      icon="mdi-account-tie"
    >
      <template #actions>
        <VBtn variant="text" color="primary" prepend-icon="mdi-chart-box-outline" :to="{ name: 'interviewer-analytics' }">التحليلات</VBtn>
        <VBtn variant="tonal" color="secondary" prepend-icon="mdi-tag-outline" @click="openPricing">إدارة الأسعار</VBtn>
      </template>
    </PageHeader>

    <VRow class="mb-2">
      <VCol v-for="s in stats" :key="s.title" cols="12" sm="6" lg="3">
        <StatCard v-bind="s" />
      </VCol>
    </VRow>

    <!-- AI tip -->
    <VAlert color="secondary" variant="tonal" class="mb-4" border="start">
      <template #prepend><VIcon icon="mdi-robot-happy-outline" /></template>
      <span class="text-body-2">
        لديك {{ store.interviewerStats.pending }} طلب مقابلة جديد يناسب تخصصك — الرد السريع يرفع تقييمك وترتيبك في السوق.
      </span>
    </VAlert>

    <VRow>
      <!-- Requests + upcoming -->
      <VCol cols="12" lg="7">
        <h2 class="text-subtitle-1 font-weight-bold mb-3">طلبات مقابلات جديدة ({{ store.agendaRequests.length }})</h2>
        <VCard v-if="store.agendaRequests.length" class="mb-5">
          <VList lines="two">
            <template v-for="(a, i) in store.agendaRequests" :key="a.id">
              <VListItem>
                <template #prepend>
                  <VAvatar color="accent" variant="tonal"><span class="font-weight-bold">{{ a.candidateInitial }}</span></VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">{{ a.candidateName }} · {{ KIND_META[a.kind].label }}</VListItemTitle>
                <VListItemSubtitle>{{ a.candidateField }} · {{ a.datetime }} · {{ a.price }} ﷼</VListItemSubtitle>
                <template #append>
                  <div class="d-flex ga-1">
                    <VBtn size="small" color="success" variant="tonal" prepend-icon="mdi-check" @click="acceptRequest(a)">قبول</VBtn>
                    <VBtn icon="mdi-close" size="small" variant="text" color="error" @click="store.declineRequest(a.id)" />
                  </div>
                </template>
              </VListItem>
              <VDivider v-if="i < store.agendaRequests.length - 1" />
            </template>
          </VList>
        </VCard>
        <VCard v-else class="pa-6 text-center mb-5">
          <VIcon icon="mdi-inbox-outline" size="40" color="medium-emphasis" />
          <div class="text-body-2 text-medium-emphasis mt-1">لا طلبات جديدة حاليًا</div>
        </VCard>

        <h2 class="text-subtitle-1 font-weight-bold mb-3">مقابلات قادمة ({{ store.agendaUpcoming.length }})</h2>
        <VCard v-if="store.agendaUpcoming.length">
          <VList lines="two">
            <template v-for="(a, i) in store.agendaUpcoming" :key="a.id">
              <VListItem>
                <template #prepend>
                  <VAvatar color="info" variant="tonal"><span class="font-weight-bold">{{ a.candidateInitial }}</span></VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">{{ a.candidateName }} · {{ KIND_META[a.kind].label }}</VListItemTitle>
                <VListItemSubtitle>{{ a.datetime }} · {{ a.price }} ﷼</VListItemSubtitle>
                <template #append>
                  <VBtn size="small" color="primary" prepend-icon="mdi-video-outline" @click="router.push({ name: 'conduct-interview', params: { id: a.id } })">
                    بدء المقابلة
                  </VBtn>
                </template>
              </VListItem>
              <VDivider v-if="i < store.agendaUpcoming.length - 1" />
            </template>
          </VList>
        </VCard>
        <VCard v-else class="pa-6 text-center">
          <VIcon icon="mdi-calendar-blank-outline" size="40" color="medium-emphasis" />
          <div class="text-body-2 text-medium-emphasis mt-1">لا مقابلات مجدولة</div>
        </VCard>
      </VCol>

      <!-- Completed -->
      <VCol cols="12" lg="5">
        <h2 class="text-subtitle-1 font-weight-bold mb-3">مقابلات منفّذة ({{ store.agendaCompleted.length }})</h2>
        <VCard>
          <VList v-if="store.agendaCompleted.length" lines="two">
            <template v-for="(a, i) in store.agendaCompleted" :key="a.id">
              <VListItem>
                <template #prepend>
                  <VAvatar color="success" variant="tonal"><span class="font-weight-bold">{{ a.candidateInitial }}</span></VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">{{ a.candidateName }}</VListItemTitle>
                <VListItemSubtitle>{{ KIND_META[a.kind].label }} · {{ a.datetime }}</VListItemSubtitle>
                <template #append>
                  <div class="d-flex align-center ga-2">
                    <VRating v-if="a.rating" :model-value="a.rating" color="warning" density="compact" size="x-small" readonly />
                    <VChip v-if="a.report" color="success" size="small" label>{{ a.report.overall }}%</VChip>
                  </div>
                </template>
              </VListItem>
              <VDivider v-if="i < store.agendaCompleted.length - 1" />
            </template>
          </VList>
          <div v-else class="pa-6 text-center text-medium-emphasis">لا مقابلات منفّذة بعد</div>
        </VCard>
      </VCol>

      <!-- Custom evaluation elements management -->
      <VCol cols="12">
        <VCard class="pa-5">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-1">
            <div class="d-flex align-center ga-2">
              <VIcon icon="mdi-tune-vertical" color="accent" />
              <h2 class="text-subtitle-1 font-weight-bold">عناصر التقييم المخصّصة</h2>
            </div>
            <VBtn size="small" variant="tonal" color="secondary" prepend-icon="mdi-robot-happy-outline" @click="loadSuggestions">اقترح بالذكاء الاصطناعي</VBtn>
          </div>
          <p class="text-caption text-medium-emphasis mb-3 d-flex align-center flex-wrap ga-1">
            أضِف عناصر تقييم إضافية بسعر مستقل تظهر للمرشّحين عند الحجز.
            <VMenu :close-on-content-click="false" location="top">
              <template #activator="{ props }">
                <span v-bind="props" class="cursor-pointer d-inline-flex align-center text-secondary"><VIcon icon="mdi-information-outline" size="14" class="me-1" />العمولة</span>
              </template>
              <VCard max-width="320" class="pa-3 text-caption">{{ commissionNote }}</VCard>
            </VMenu>
          </p>

          <div v-if="suggestions.length" class="mb-3 d-flex flex-wrap ga-2">
            <VChip v-for="s in suggestions" :key="s.name" color="secondary" variant="tonal" size="small" @click="addSuggestion(s)">
              <VIcon icon="mdi-plus" start size="14" />{{ s.name }} (+{{ s.price }})
            </VChip>
          </div>

          <div v-if="store.myEvalElements.length" class="d-flex flex-column ga-2 mb-4">
            <div v-for="el in store.myEvalElements" :key="el.id" class="element-row pa-2 d-flex align-center ga-2">
              <div class="flex-grow-1">
                <div class="text-body-2 font-weight-bold">{{ el.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ el.description }}</div>
              </div>
              <span class="font-weight-bold">+{{ el.price }} ﷼</span>
              <VBtn icon="mdi-delete-outline" variant="text" size="x-small" color="error" @click="store.removeEvalElement(el.id)" />
            </div>
          </div>
          <div v-else class="text-caption text-medium-emphasis mb-3">لا عناصر مخصّصة بعد.</div>

          <VRow dense align="center">
            <VCol cols="12" sm="4"><VTextField v-model="newElement.name" label="اسم العنصر" density="compact" hide-details /></VCol>
            <VCol cols="12" sm="5"><VTextField v-model="newElement.description" label="الوصف" density="compact" hide-details /></VCol>
            <VCol cols="8" sm="2"><VTextField v-model.number="newElement.price" type="number" label="السعر" suffix="﷼" density="compact" hide-details /></VCol>
            <VCol cols="4" sm="1"><VBtn color="accent" block height="40" :disabled="!newElement.name.trim()" @click="addElement"><VIcon icon="mdi-plus" /></VBtn></VCol>
          </VRow>
        </VCard>
      </VCol>

      <!-- Candidate reviews of me (doc §3.3-ب) -->
      <VCol cols="12">
        <VCard class="pa-5">
          <div class="d-flex align-center ga-2 mb-1">
            <VIcon icon="mdi-star-check-outline" color="amber" />
            <h2 class="text-subtitle-1 font-weight-bold">تقييمات المرشحين لي</h2>
          </div>
          <p class="text-caption text-medium-emphasis mb-3">آخر التقييمات العلنية من مرشحيك — يمكنك الرد مرة واحدة على كل تقييم.</p>
          <ReviewsPanel direction="toInterviewer" subject-id="1" can-reply :limit="3" />
        </VCard>
      </VCol>
    </VRow>

    <!-- Pricing dialog -->
    <VDialog v-model="priceDialog" max-width="460">
      <VCard class="pa-2">
        <VCardTitle>إدارة أسعار المقابلات</VCardTitle>
        <VCardText>
          <div v-for="k in kinds" :key="k" class="d-flex align-center ga-3 mb-2">
            <span class="text-body-2 flex-grow-1">{{ KIND_META[k].label }}</span>
            <VTextField
              v-model.number="draftPricing[k]"
              type="number"
              density="compact"
              hide-details
              suffix="﷼"
              style="max-width: 130px"
            />
          </div>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="priceDialog = false">إلغاء</VBtn>
          <VBtn color="accent" prepend-icon="mdi-content-save" @click="savePricing">حفظ الأسعار</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.element-row {
  border: 1px solid rgba(140, 163, 150, 0.2);
  border-radius: var(--ui-radius);
}
</style>

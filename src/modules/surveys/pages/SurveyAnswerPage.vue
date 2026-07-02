<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useSurveysStore } from '@/stores/SurveysStore'
import type { AnswerValue, SurveyQuestion } from '@/stores/SurveysStore'
import SurveyQuestionInput from '../components/SurveyQuestionInput.vue'

// Public respondent view — reached in-platform or via the external share link
type Stage = 'welcome' | 'questions' | 'thanks' | 'closed' | 'already'

const route = useRoute()
const store = useSurveysStore()

const survey = computed(() => store.byToken(String(route.params.token)))
const source = computed<'internal' | 'external'>(() => (route.query.src === 'in' ? 'internal' : 'external'))
// من داخل المنصة = المستخدم الحالي هو المشارك (لمنع التكرار وصرف المكافأة)
const isMine = computed(() => source.value === 'internal')
const reward = computed(() => survey.value?.settings.rewardPoints ?? 0)
const earnsReward = computed(() => isMine.value && survey.value?.owner === 'platform' && reward.value > 0)

// Shuffle once per visit when the survey asks for it
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const questions = ref<SurveyQuestion[]>(
  survey.value ? (survey.value.settings.shuffleQuestions ? shuffled(survey.value.questions) : [...survey.value.questions]) : [],
)

const stage = ref<Stage>(
  !survey.value || survey.value.status !== 'active'
    ? 'closed'
    : isMine.value && store.hasParticipated(survey.value.id) ? 'already' : 'welcome',
)
const currentIndex = ref(0)
const answers = ref<Record<number, AnswerValue>>({})
const startedAt = ref(0)

const onePerPage = computed(() => survey.value?.settings.oneQuestionPerPage ?? true)
const current = computed(() => questions.value[currentIndex.value])
const progress = computed(() => (questions.value.length ? ((currentIndex.value + 1) / questions.value.length) * 100 : 0))
const isLast = computed(() => currentIndex.value === questions.value.length - 1)

function answered(q: SurveyQuestion): boolean {
  const v = answers.value[q.id]
  if (v === undefined || v === '')
    return false
  if (Array.isArray(v))
    return v.length > 0
  if (typeof v === 'object')
    return Object.keys(v).length > 0
  return true
}
const canProceed = computed(() => !current.value?.required || answered(current.value))
const missingRequired = computed(() => questions.value.filter(q => q.required && !answered(q)))

function start() {
  stage.value = 'questions'
  startedAt.value = Date.now()
}
function next() {
  if (isLast.value)
    finish()
  else currentIndex.value++
}
function prev() {
  if (currentIndex.value > 0)
    currentIndex.value--
}
function finish() {
  if (!survey.value)
    return
  const ok = store.submitResponse(survey.value.id, { ...answers.value }, {
    source: source.value,
    durationSec: Math.max(5, Math.round((Date.now() - startedAt.value) / 1000)),
    mine: isMine.value,
  })
  stage.value = ok ? 'thanks' : 'closed'
}
</script>

<template>
  <VContainer class="fill-height py-10" style="min-height: 100vh">
    <VRow justify="center" class="w-100">
      <VCol cols="12" sm="10" md="7" lg="6">
        <!-- Brand -->
        <div class="text-center mb-6">
          <VAvatar color="primary" size="56" rounded="lg" class="mb-2">
            <VIcon icon="mdi-poll" size="30" />
          </VAvatar>
          <div class="text-h6 font-weight-bold">منظومة التوظيف الذكية</div>
        </div>

        <!-- Closed / not found -->
        <VCard v-if="stage === 'closed'" class="pa-8 text-center">
          <VIcon icon="mdi-clipboard-off-outline" size="48" color="medium-emphasis" class="mb-3" />
          <h2 class="text-h6 font-weight-bold mb-2">هذا الاستبيان غير متاح</h2>
          <p class="text-body-2 text-medium-emphasis">
            {{ survey ? 'أُغلق الاستبيان أو اكتمل عدد الاستجابات المطلوب. شكرًا لاهتمامك!' : 'الرابط غير صحيح أو أُزيل الاستبيان.' }}
          </p>
        </VCard>

        <!-- Already participated -->
        <VCard v-else-if="stage === 'already' && survey" class="pa-8 text-center">
          <VAvatar color="success" variant="tonal" size="64" class="mb-3">
            <VIcon icon="mdi-check-circle-outline" size="36" />
          </VAvatar>
          <h2 class="text-h6 font-weight-bold mb-2">شاركت في هذا الاستبيان سابقًا</h2>
          <p class="text-body-2 text-medium-emphasis">تُحتسب مشاركة واحدة لكل مستخدم — شكرًا لمساهمتك!</p>
        </VCard>

        <!-- Welcome -->
        <VCard v-else-if="stage === 'welcome' && survey" class="pa-8 text-center">
          <VChip size="small" color="secondary" variant="tonal" label class="mb-3">{{ survey.type }}</VChip>
          <h1 class="text-h5 font-weight-bold mb-2">{{ survey.title }}</h1>
          <p v-if="survey.ownerName" class="text-caption text-medium-emphasis mb-1">من: {{ survey.ownerName }}</p>
          <p class="text-body-2 text-medium-emphasis mb-2">{{ survey.settings.welcomeMessage }}</p>
          <div class="text-caption text-medium-emphasis mb-3 d-flex align-center justify-center ga-3 flex-wrap">
            <span><VIcon icon="mdi-help-circle-outline" size="14" /> {{ survey.questions.length }} أسئلة</span>
            <span v-if="survey.settings.anonymous"><VIcon icon="mdi-incognito" size="14" /> إجاباتك مجهولة الهوية</span>
          </div>
          <VChip v-if="earnsReward" color="accent" label class="mb-4" prepend-icon="mdi-star-circle-outline">
            ستكسب +{{ reward }} نقطة عند الإكمال
          </VChip>
          <div>
            <VBtn color="accent" size="large" prepend-icon="mdi-play" @click="start">ابدأ الاستبيان</VBtn>
          </div>
        </VCard>

        <!-- Questions -->
        <template v-else-if="stage === 'questions' && survey">
          <VProgressLinear v-if="survey.settings.showProgress && onePerPage" :model-value="progress" color="primary" height="6" rounded class="mb-4" />

          <!-- One question per page -->
          <VCard v-if="onePerPage" class="pa-6">
            <div class="text-caption text-medium-emphasis mb-2">سؤال {{ currentIndex + 1 }} من {{ questions.length }}</div>
            <h2 class="text-subtitle-1 font-weight-bold mb-4">
              {{ current.text }}
              <span v-if="current.required" class="text-error">*</span>
            </h2>
            <SurveyQuestionInput v-model="answers[current.id]" :question="current" />
            <div class="d-flex justify-space-between mt-6">
              <VBtn variant="text" :disabled="currentIndex === 0" prepend-icon="mdi-chevron-right" @click="prev">السابق</VBtn>
              <VBtn color="primary" :disabled="!canProceed" append-icon="mdi-chevron-left" @click="next">
                {{ isLast ? 'إرسال' : 'التالي' }}
              </VBtn>
            </div>
          </VCard>

          <!-- All questions in one list -->
          <template v-else>
            <VCard v-for="(q, i) in questions" :key="q.id" class="pa-5 mb-3">
              <h2 class="text-subtitle-2 font-weight-bold mb-3">
                {{ i + 1 }}. {{ q.text }}
                <span v-if="q.required" class="text-error">*</span>
              </h2>
              <SurveyQuestionInput v-model="answers[q.id]" :question="q" />
            </VCard>
            <VBtn color="primary" size="large" block :disabled="missingRequired.length > 0" @click="finish">
              إرسال الإجابات
            </VBtn>
            <p v-if="missingRequired.length" class="text-caption text-error text-center mt-2">
              تبقّى {{ missingRequired.length }} أسئلة إلزامية
            </p>
          </template>
        </template>

        <!-- Thanks -->
        <VCard v-else-if="stage === 'thanks' && survey" class="pa-8 text-center">
          <VAvatar color="success" variant="tonal" size="64" class="mb-3">
            <VIcon icon="mdi-check" size="36" />
          </VAvatar>
          <h2 class="text-h6 font-weight-bold mb-2">{{ survey.settings.thanksMessage }}</h2>
          <VChip v-if="earnsReward" color="accent" label class="mb-2" prepend-icon="mdi-star-circle-outline">
            أُضيفت +{{ reward }} نقطة إلى محفظتك
          </VChip>
          <p class="text-body-2 text-medium-emphasis">وصلت إجاباتك إلى صاحب الاستبيان مباشرة.</p>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useSurveysStore } from '@/stores/SurveysStore'
import type { AnswerValue, SurveyQuestion } from '@/stores/SurveysStore'
import SurveyQuestionInput from '../components/SurveyQuestionInput.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'

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
  <div class="flex min-h-screen items-start justify-center px-4 py-10">
    <div class="w-full max-w-xl">
      <!-- Brand -->
      <div class="mb-6 text-center">
        <BaseAvatar color="brand" square :size="56" class="mb-2">
          <BaseIcon name="mdi-poll" :size="30" />
        </BaseAvatar>
        <div class="text-lg font-bold text-content">منظومة التوظيف الذكية</div>
      </div>

      <!-- Closed / not found -->
      <BaseCard v-if="stage === 'closed'" class="py-8 text-center">
        <BaseIcon name="mdi-clipboard-off-outline" :size="48" class="mb-3" :style="{ color: 'rgba(var(--v-theme-on-surface), 0.5)' }" />
        <h2 class="mb-2 text-lg font-bold text-content">هذا الاستبيان غير متاح</h2>
        <p class="text-sm text-muted">
          {{ survey ? 'أُغلق الاستبيان أو اكتمل عدد الاستجابات المطلوب. شكرًا لاهتمامك!' : 'الرابط غير صحيح أو أُزيل الاستبيان.' }}
        </p>
      </BaseCard>

      <!-- Already participated -->
      <BaseCard v-else-if="stage === 'already' && survey" class="py-8 text-center">
        <BaseAvatar color="success" tonal :size="64" class="mb-3">
          <BaseIcon name="mdi-check-circle-outline" :size="36" />
        </BaseAvatar>
        <h2 class="mb-2 text-lg font-bold text-content">شاركت في هذا الاستبيان سابقًا</h2>
        <p class="text-sm text-muted">تُحتسب مشاركة واحدة لكل مستخدم — شكرًا لمساهمتك!</p>
      </BaseCard>

      <!-- Welcome -->
      <BaseCard v-else-if="stage === 'welcome' && survey" class="py-8 text-center">
        <div class="mb-3 flex justify-center"><BaseChip color="emerald">{{ survey.type }}</BaseChip></div>
        <h1 class="mb-2 text-xl font-bold text-content">{{ survey.title }}</h1>
        <p v-if="survey.ownerName" class="mb-1 text-xs text-muted">من: {{ survey.ownerName }}</p>
        <p class="mb-2 text-sm text-muted">{{ survey.settings.welcomeMessage }}</p>
        <div class="mb-3 flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
          <span class="inline-flex items-center gap-1"><BaseIcon name="mdi-help-circle-outline" :size="14" /> {{ survey.questions.length }} أسئلة</span>
          <span v-if="survey.settings.anonymous" class="inline-flex items-center gap-1"><BaseIcon name="mdi-incognito" :size="14" /> إجاباتك مجهولة الهوية</span>
        </div>
        <div v-if="earnsReward" class="mb-4 flex justify-center">
          <BaseChip color="accent"><BaseIcon name="mdi-star-circle-outline" :size="14" />ستكسب +{{ reward }} نقطة عند الإكمال</BaseChip>
        </div>
        <BaseButton variant="accent" size="lg" @click="start"><BaseIcon name="mdi-play" :size="18" />ابدأ الاستبيان</BaseButton>
      </BaseCard>

      <!-- Questions -->
      <template v-else-if="stage === 'questions' && survey">
        <BaseProgressBar v-if="survey.settings.showProgress && onePerPage" :value="progress" color="primary" :height="6" class="mb-4" />

        <!-- One question per page -->
        <BaseCard v-if="onePerPage" class="p-6">
          <div class="mb-2 text-xs text-muted">سؤال {{ currentIndex + 1 }} من {{ questions.length }}</div>
          <h2 class="mb-4 text-base font-bold text-content">
            {{ current.text }}
            <span v-if="current.required" :style="{ color: 'rgb(var(--v-theme-error))' }">*</span>
          </h2>
          <SurveyQuestionInput v-model="answers[current.id]" :question="current" />
          <div class="mt-6 flex justify-between">
            <BaseButton variant="ghost" :disabled="currentIndex === 0" @click="prev"><BaseIcon name="mdi-chevron-right" :size="16" />السابق</BaseButton>
            <BaseButton variant="brand" :disabled="!canProceed" @click="next">
              {{ isLast ? 'إرسال' : 'التالي' }}<BaseIcon name="mdi-chevron-left" :size="16" />
            </BaseButton>
          </div>
        </BaseCard>

        <!-- All questions in one list -->
        <template v-else>
          <BaseCard v-for="(q, i) in questions" :key="q.id" class="mb-3">
            <h2 class="mb-3 text-sm font-bold text-content">
              {{ i + 1 }}. {{ q.text }}
              <span v-if="q.required" :style="{ color: 'rgb(var(--v-theme-error))' }">*</span>
            </h2>
            <SurveyQuestionInput v-model="answers[q.id]" :question="q" />
          </BaseCard>
          <BaseButton variant="brand" size="lg" block :disabled="missingRequired.length > 0" @click="finish">
            إرسال الإجابات
          </BaseButton>
          <p v-if="missingRequired.length" class="mt-2 text-center text-xs" :style="{ color: 'rgb(var(--v-theme-error))' }">
            تبقّى {{ missingRequired.length }} أسئلة إلزامية
          </p>
        </template>
      </template>

      <!-- Thanks -->
      <BaseCard v-else-if="stage === 'thanks' && survey" class="py-8 text-center">
        <BaseAvatar color="success" tonal :size="64" class="mb-3">
          <BaseIcon name="mdi-check" :size="36" />
        </BaseAvatar>
        <h2 class="mb-2 text-lg font-bold text-content">{{ survey.settings.thanksMessage }}</h2>
        <div v-if="earnsReward" class="mb-2 flex justify-center">
          <BaseChip color="accent"><BaseIcon name="mdi-star-circle-outline" :size="14" />أُضيفت +{{ reward }} نقطة إلى محفظتك</BaseChip>
        </div>
        <p class="text-sm text-muted">وصلت إجاباتك إلى صاحب الاستبيان مباشرة.</p>
      </BaseCard>
    </div>
  </div>
</template>

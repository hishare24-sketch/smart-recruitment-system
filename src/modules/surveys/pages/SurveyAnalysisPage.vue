<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { QUESTION_TYPE_META, useSurveysStore } from '@/stores/SurveysStore'
import type { SurveyQuestion } from '@/stores/SurveysStore'
import { ai } from '@/services/ai'

const route = useRoute()
const router = useRouter()
const store = useSurveysStore()

const survey = computed(() => store.byId(Number(route.params.id)))
const responses = computed(() => store.responsesFor(Number(route.params.id)))
const stats = computed(() => store.statsFor(Number(route.params.id)))

// ===== Aggregations per question type =====
function answersOf(q: SurveyQuestion) {
  return responses.value.map(r => r.answers[q.id]).filter(v => v !== undefined && v !== '')
}

function optionCounts(q: SurveyQuestion): { label: string, count: number, pct: number }[] {
  const counts = new Map<string, number>()
  for (const v of answersOf(q)) {
    const picks = Array.isArray(v) && q.type === 'multiple' ? v : [v]
    for (const p of picks as string[])
      counts.set(String(p), (counts.get(String(p)) ?? 0) + 1)
  }
  const total = Math.max(1, [...counts.values()].reduce((s, n) => s + n, 0))
  return (q.options ?? [...counts.keys()]).map(label => ({
    label,
    count: counts.get(label) ?? 0,
    pct: Math.round(((counts.get(label) ?? 0) / total) * 100),
  }))
}

function numericAvg(q: SurveyQuestion): number {
  const vals = answersOf(q).map(Number).filter(n => !Number.isNaN(n))
  return vals.length ? Math.round((vals.reduce((s, n) => s + n, 0) / vals.length) * 10) / 10 : 0
}

function distribution(q: SurveyQuestion, min: number, max: number): { label: string, count: number, pct: number }[] {
  const vals = answersOf(q).map(Number).filter(n => !Number.isNaN(n))
  const out = []
  for (let n = min; n <= max; n++) {
    const count = vals.filter(v => v === n).length
    out.push({ label: String(n), count, pct: vals.length ? Math.round((count / vals.length) * 100) : 0 })
  }
  return out
}

interface NpsBreakdown { score: number, promoters: number, passives: number, detractors: number }
function npsOf(q: SurveyQuestion): NpsBreakdown {
  const vals = answersOf(q).map(Number).filter(n => !Number.isNaN(n))
  if (!vals.length)
    return { score: 0, promoters: 0, passives: 0, detractors: 0 }
  const promoters = Math.round((vals.filter(v => v >= 9).length / vals.length) * 100)
  const passives = Math.round((vals.filter(v => v >= 7 && v <= 8).length / vals.length) * 100)
  const detractors = Math.round((vals.filter(v => v <= 6).length / vals.length) * 100)
  return { score: promoters - detractors, promoters, passives, detractors }
}

function matrixAverages(q: SurveyQuestion): { row: string, avg: number }[] {
  return (q.rows ?? []).map((row) => {
    const vals = answersOf(q)
      .map(v => (v as Record<string, number>)[row])
      .filter(n => typeof n === 'number')
    return { row, avg: vals.length ? Math.round((vals.reduce((s, n) => s + n, 0) / vals.length) * 10) / 10 : 0 }
  })
}

function rankingAverages(q: SurveyQuestion): { label: string, avg: number }[] {
  const positions = new Map<string, number[]>()
  for (const v of answersOf(q)) {
    (v as string[]).forEach((opt, i) => {
      positions.set(opt, [...(positions.get(opt) ?? []), i + 1])
    })
  }
  return [...positions.entries()]
    .map(([label, ps]) => ({ label, avg: Math.round((ps.reduce((s, n) => s + n, 0) / ps.length) * 10) / 10 }))
    .sort((a, b) => a.avg - b.avg)
}

function textAnswers(q: SurveyQuestion): string[] {
  return answersOf(q).map(String).slice(-6).reverse()
}

// Response timeline (per day)
const timeline = computed(() => {
  const byDay = new Map<string, number>()
  for (const r of responses.value)
    byDay.set(r.at, (byDay.get(r.at) ?? 0) + 1)
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const max = Math.max(1, ...days.map(d => d[1]))
  return days.map(([day, count]) => ({ day: day.slice(5), count, pct: Math.round((count / max) * 100) }))
})

// ===== AI insights =====
const firstRating = computed(() => survey.value?.questions.find(q => q.type === 'rating'))
const firstNps = computed(() => survey.value?.questions.find(q => q.type === 'nps'))
const insights = computed(() => {
  if (!survey.value)
    return null
  const texts = survey.value.questions
    .filter(q => q.type === 'text' || q.type === 'longtext')
    .flatMap(q => answersOf(q).map(String))
  return ai.surveyInsights({
    title: survey.value.title,
    responses: stats.value.responses,
    completion: stats.value.completion,
    nps: firstNps.value ? npsOf(firstNps.value).score : null,
    avgRating: firstRating.value ? numericAvg(firstRating.value) : null,
    textAnswers: texts,
  })
})
const sentimentColor = computed(() => ({ positive: 'success', neutral: 'warning', negative: 'error' })[insights.value?.sentiment ?? 'neutral'])

// ===== Export =====
function exportCsv() {
  if (!survey.value)
    return
  const header = ['#', 'التاريخ', 'المصدر', ...survey.value.questions.map(q => q.text)]
  const rows = responses.value.map((r, i) => [
    i + 1,
    r.at,
    r.source === 'external' ? 'خارجي' : 'داخلي',
    ...survey.value!.questions.map((q) => {
      const v = r.answers[q.id]
      if (v === undefined)
        return ''
      if (Array.isArray(v))
        return v.join(' | ')
      if (typeof v === 'object')
        return Object.entries(v).map(([k, n]) => `${k}:${n}`).join(' | ')
      return String(v)
    }),
  ])
  const csv = `﻿${[header, ...rows].map(r => r.map(c => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n')}`
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `${survey.value.title}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div v-if="survey">
    <PageHeader :title="`تحليل: ${survey.title}`" :subtitle="`${survey.type} · أُنشئ ${survey.createdAt}`" icon="mdi-chart-box-outline" />

    <!-- Actions -->
    <div class="d-flex flex-wrap ga-2 mb-4">
      <VBtn color="primary" variant="tonal" size="small" prepend-icon="mdi-download-outline" @click="exportCsv">تصدير CSV</VBtn>
      <VBtn variant="tonal" size="small" prepend-icon="mdi-printer-outline" onclick="window.print()">طباعة</VBtn>
      <VBtn variant="tonal" size="small" color="secondary" prepend-icon="mdi-account-multiple-plus-outline" @click="store.simulateResponses(survey.id, 4)">محاكاة مستجيبين</VBtn>
    </div>

    <!-- Overview stats -->
    <VRow class="mb-1">
      <VCol v-for="s in [
        { title: 'الاستجابات', value: stats.responses, icon: 'mdi-account-group-outline', color: 'primary' },
        { title: 'نسبة الإكمال', value: `${stats.completion}%`, icon: 'mdi-progress-check', color: 'success' },
        { title: 'متوسط الوقت', value: stats.avgTime, icon: 'mdi-timer-outline', color: 'info' },
        { title: 'داخلي / خارجي', value: `${stats.internal} / ${stats.external}`, icon: 'mdi-swap-horizontal', color: 'secondary' },
      ]" :key="s.title" cols="6" md="3">
        <VCard class="pa-4 text-center">
          <VIcon :icon="s.icon" :color="s.color" size="26" class="mb-1" />
          <div class="text-h6 font-weight-bold">{{ s.value }}</div>
          <div class="text-caption text-medium-emphasis">{{ s.title }}</div>
        </VCard>
      </VCol>
    </VRow>

    <VRow>
      <VCol cols="12" lg="8">
        <!-- Per-question visualizations -->
        <VCard v-for="(q, qi) in survey.questions" :key="q.id" class="pa-5 mb-4">
          <div class="d-flex align-center ga-2 mb-3 flex-wrap">
            <VChip size="x-small" color="primary" variant="tonal" label :prepend-icon="QUESTION_TYPE_META[q.type].icon">
              {{ QUESTION_TYPE_META[q.type].label }}
            </VChip>
            <h3 class="text-subtitle-1 font-weight-bold">{{ qi + 1 }}. {{ q.text }}</h3>
          </div>

          <!-- choices -->
          <template v-if="q.type === 'single' || q.type === 'multiple' || q.type === 'dropdown'">
            <div v-for="o in optionCounts(q)" :key="o.label" class="mb-2">
              <div class="d-flex justify-space-between text-body-2 mb-1">
                <span>{{ o.label }}</span>
                <span class="font-weight-bold">{{ o.count }} ({{ o.pct }}%)</span>
              </div>
              <VProgressLinear :model-value="o.pct" color="primary" height="10" rounded />
            </div>
          </template>

          <!-- rating -->
          <template v-else-if="q.type === 'rating'">
            <div class="d-flex align-center ga-3 mb-3">
              <span class="text-h4 font-weight-bold">{{ numericAvg(q) }}</span>
              <VRating :model-value="numericAvg(q)" color="warning" density="compact" half-increments readonly />
              <span class="text-caption text-medium-emphasis">متوسط التقييم</span>
            </div>
            <div v-for="d in distribution(q, 1, 5)" :key="d.label" class="d-flex align-center ga-2 mb-1">
              <span class="text-caption" style="width: 20px">{{ d.label }}★</span>
              <VProgressLinear :model-value="d.pct" color="warning" height="8" rounded class="flex-grow-1" />
              <span class="text-caption text-medium-emphasis" style="width: 32px">{{ d.count }}</span>
            </div>
          </template>

          <!-- NPS -->
          <template v-else-if="q.type === 'nps'">
            <div class="d-flex align-center ga-3 mb-3">
              <span class="text-h4 font-weight-bold" :class="npsOf(q).score >= 30 ? 'text-success' : npsOf(q).score >= 0 ? 'text-warning' : 'text-error'">
                {{ npsOf(q).score > 0 ? '+' : '' }}{{ npsOf(q).score }}
              </span>
              <span class="text-caption text-medium-emphasis">صافي نقاط الترويج (NPS)</span>
            </div>
            <div class="d-flex rounded-lg overflow-hidden mb-2" style="height: 18px">
              <div class="bg-error" :style="{ width: `${npsOf(q).detractors}%` }" />
              <div class="bg-warning" :style="{ width: `${npsOf(q).passives}%` }" />
              <div class="bg-success" :style="{ width: `${npsOf(q).promoters}%` }" />
            </div>
            <div class="d-flex justify-space-between text-caption">
              <span class="text-error">منتقدون {{ npsOf(q).detractors }}%</span>
              <span class="text-warning">محايدون {{ npsOf(q).passives }}%</span>
              <span class="text-success">مروّجون {{ npsOf(q).promoters }}%</span>
            </div>
          </template>

          <!-- scale -->
          <template v-else-if="q.type === 'scale'">
            <div class="d-flex align-center ga-3 mb-2">
              <span class="text-h5 font-weight-bold">{{ numericAvg(q) }}</span>
              <span class="text-caption text-medium-emphasis">من 10 · «{{ q.scaleMin || 'الأدنى' }}» إلى «{{ q.scaleMax || 'الأعلى' }}»</span>
            </div>
            <VProgressLinear :model-value="numericAvg(q) * 10" color="primary" height="12" rounded />
          </template>

          <!-- matrix -->
          <template v-else-if="q.type === 'matrix'">
            <div v-for="m in matrixAverages(q)" :key="m.row" class="d-flex align-center ga-2 mb-2">
              <span class="text-body-2" style="min-width: 120px">{{ m.row }}</span>
              <VProgressLinear :model-value="m.avg * 20" color="warning" height="10" rounded class="flex-grow-1" />
              <span class="text-caption font-weight-bold" style="width: 32px">{{ m.avg }}</span>
            </div>
          </template>

          <!-- ranking -->
          <template v-else-if="q.type === 'ranking'">
            <div v-for="(r, ri) in rankingAverages(q)" :key="r.label" class="d-flex align-center ga-2 mb-1">
              <VChip size="x-small" :color="ri === 0 ? 'success' : 'primary'" label>{{ ri + 1 }}</VChip>
              <span class="text-body-2 flex-grow-1">{{ r.label }}</span>
              <span class="text-caption text-medium-emphasis">متوسط الترتيب {{ r.avg }}</span>
            </div>
          </template>

          <!-- text -->
          <template v-else>
            <div v-if="textAnswers(q).length" class="d-flex flex-column ga-2">
              <VCard v-for="(a, i) in textAnswers(q)" :key="i" variant="tonal" color="surface-variant" class="pa-3 text-body-2">
                «{{ a }}»
              </VCard>
            </div>
            <p v-else class="text-caption text-medium-emphasis">لا إجابات نصية بعد.</p>
          </template>
        </VCard>
      </VCol>

      <VCol cols="12" lg="4">
        <!-- AI insights -->
        <VCard v-if="insights" class="pa-5 mb-4">
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon icon="mdi-robot-happy-outline" color="secondary" />
            <h3 class="text-subtitle-1 font-weight-bold">تحليل الذكاء الاصطناعي</h3>
            <VChip size="x-small" :color="sentimentColor" label class="ms-auto">{{ insights.sentimentLabel }}</VChip>
          </div>
          <p class="text-body-2 mb-3">{{ insights.summary }}</p>
          <div class="text-body-2 font-weight-bold mb-1">أبرز الملاحظات</div>
          <div class="d-flex flex-column ga-1 mb-3">
            <div v-for="t in insights.themes" :key="t" class="text-caption d-flex ga-1">
              <VIcon icon="mdi-circle-small" size="16" color="secondary" />{{ t }}
            </div>
          </div>
          <div class="text-body-2 font-weight-bold mb-1">توصيات قابلة للتنفيذ</div>
          <VAlert v-for="r in insights.recommendations" :key="r" color="secondary" variant="tonal" density="compact" class="mb-1 text-caption" border="start">
            {{ r }}
          </VAlert>
        </VCard>

        <!-- Response timeline -->
        <VCard class="pa-5">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">الاستجابات عبر الزمن</h3>
          <div v-if="timeline.length" class="d-flex align-end ga-1" style="height: 90px">
            <VTooltip v-for="d in timeline" :key="d.day" :text="`${d.day}: ${d.count}`" location="top">
              <template #activator="{ props }">
                <div v-bind="props" class="flex-grow-1 d-flex flex-column justify-end" style="height: 100%">
                  <div class="bar-lime rounded-t" :style="{ height: `${Math.max(8, d.pct)}%` }" />
                </div>
              </template>
            </VTooltip>
          </div>
          <p v-else class="text-caption text-medium-emphasis">لا استجابات بعد.</p>
          <div v-if="timeline.length" class="d-flex justify-space-between text-caption text-medium-emphasis mt-1">
            <span>{{ timeline[0].day }}</span>
            <span>{{ timeline[timeline.length - 1].day }}</span>
          </div>
        </VCard>
      </VCol>
    </VRow>
  </div>

  <VCard v-else class="pa-8 text-center">
    <p class="text-body-1">الاستبيان غير موجود.</p>
    <VBtn color="primary" variant="tonal" class="mt-2" @click="router.push({ name: 'surveys' })">عودة للاستبيانات</VBtn>
  </VCard>
</template>

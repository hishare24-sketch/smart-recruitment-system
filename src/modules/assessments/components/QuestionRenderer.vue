<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { AssessmentQuestion } from '../services/mockAssessments'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'

const props = defineProps<{ question: AssessmentQuestion }>()
// answer shape varies by type: number | string | number[] | Record<number,number>
const answer = defineModel<any>()

// — reorder helpers (sequencing / rank) —
function ensureOrder() {
  if ((props.question.type === 'sequencing' || props.question.type === 'rank') && !Array.isArray(answer.value)) {
    const n = props.question.items?.length ?? 0
    // start reversed so the user has to actually reorder
    answer.value = Array.from({ length: n }, (_, i) => n - 1 - i)
  }
  if (props.question.type === 'matching' && (typeof answer.value !== 'object' || answer.value == null))
    answer.value = {}
}
onMounted(ensureOrder)

function moveUp(pos: number) {
  if (pos <= 0)
    return
  const arr = [...(answer.value as number[])]
  ;[arr[pos - 1], arr[pos]] = [arr[pos], arr[pos - 1]]
  answer.value = arr
}
function moveDown(pos: number) {
  const arr = [...(answer.value as number[])]
  if (pos >= arr.length - 1)
    return
  ;[arr[pos + 1], arr[pos]] = [arr[pos], arr[pos + 1]]
  answer.value = arr
}

// — matching: shuffled right options carrying their original pair index —
const rightOptions = computed(() =>
  (props.question.pairs ?? [])
    .map((p, i) => ({ title: p.right, value: i }))
    .slice()
    .reverse(),
)
function setMatch(leftIndex: number, val: number) {
  answer.value = { ...(answer.value as Record<number, number>), [leftIndex]: val }
}

// — file / recording UI state via the answer string —
function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f)
    answer.value = `[ملف: ${f.name}] ${typeof answer.value === 'string' ? answer.value : ''}`
}
</script>

<template>
  <div>
    <!-- MCQ / True-False -->
    <div v-if="question.type === 'mcq' || question.type === 'truefalse'" class="flex flex-col gap-3">
      <button
        v-for="(opt, i) in question.options"
        :key="i"
        type="button"
        class="flex w-full items-center gap-3 rounded-ui-lg border p-3 text-start transition"
        :class="answer === i ? 'border-transparent bg-brand text-on-brand' : 'border-ui'"
        @click="answer = i"
      >
        <BaseIcon :name="answer === i ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'" :size="22" :style="answer === i ? {} : { color: 'rgba(var(--v-theme-on-surface), 0.6)' }" />
        <span>{{ opt }}</span>
      </button>
      <BaseTextarea
        v-if="question.type === 'truefalse'"
        placeholder="برّر إجابتك باختصار (اختياري)"
        :rows="2"
        class="mt-1"
      />
    </div>

    <!-- Open analytical / mind-map / recording / file upload / image analysis all end with a textarea -->
    <div v-else-if="['open', 'mindmap', 'recording', 'fileupload', 'imageanalysis'].includes(question.type)">
      <!-- Image analysis: mock chart -->
      <div v-if="question.type === 'imageanalysis'" class="mb-3 rounded-ui p-4 text-center" style="background: rgba(var(--v-theme-info), 0.14)">
        <div class="mb-2 text-xs text-muted">{{ question.imageLabel }}</div>
        <svg viewBox="0 0 300 90" width="100%" height="90">
          <polyline points="10,20 60,30 110,25 160,45 210,60 260,75" fill="none" stroke="rgb(var(--v-theme-info))" stroke-width="3" />
          <circle v-for="(p, i) in [[10,20],[60,30],[110,25],[160,45],[210,60],[260,75]]" :key="i" :cx="p[0]" :cy="p[1]" r="3" fill="rgb(var(--v-theme-info))" />
        </svg>
      </div>

      <!-- File upload -->
      <div v-if="question.type === 'fileupload'" class="relative mb-3 inline-block">
        <BaseButton variant="tonal-emerald"><BaseIcon name="mdi-upload" :size="16" />رفع ملف للتحليل</BaseButton>
        <input type="file" class="file-overlay" @change="onFile">
      </div>

      <!-- Recording (simulated) -->
      <div v-if="question.type === 'recording'" class="mb-3 flex items-center gap-1 rounded-ui p-2 text-xs text-content" style="background: rgba(var(--v-theme-info), 0.14)">
        <BaseIcon name="mdi-microphone-outline" :size="16" :style="{ color: 'rgb(var(--v-theme-info))' }" /> يُحاكى التسجيل الصوتي — دوّن ما ستقوله في المربّع.
      </div>

      <BaseTextarea
        v-model="answer"
        :placeholder="question.placeholder ?? 'اكتب إجابتك...'"
        :rows="5"
      />
      <div v-if="question.type === 'mindmap'" class="mt-1 flex items-center gap-1 text-xs text-muted">
        <BaseIcon name="mdi-sitemap-outline" :size="14" /> اكتب كل عقدة في سطر لتشكيل خريطتك الذهنية.
      </div>
    </div>

    <!-- Sequencing / Rank -->
    <div v-else-if="question.type === 'sequencing' || question.type === 'rank'" class="flex flex-col gap-2">
      <div
        v-for="(itemIndex, pos) in (answer as number[]) ?? []"
        :key="itemIndex"
        class="flex items-center gap-2 rounded-ui-lg border border-ui p-2"
      >
        <BaseChip :color="question.type === 'rank' ? 'accent' : 'brand'">{{ pos + 1 }}</BaseChip>
        <span class="flex-1">{{ question.items?.[itemIndex] }}</span>
        <button class="icon-btn h-8 w-8 disabled:opacity-40" :disabled="pos === 0" aria-label="لأعلى" @click="moveUp(pos)"><BaseIcon name="mdi-chevron-up" :size="18" /></button>
        <button class="icon-btn h-8 w-8 disabled:opacity-40" :disabled="pos === ((answer as number[])?.length ?? 0) - 1" aria-label="لأسفل" @click="moveDown(pos)"><BaseIcon name="mdi-chevron-down" :size="18" /></button>
      </div>
    </div>

    <!-- Matching -->
    <div v-else-if="question.type === 'matching'" class="flex flex-col gap-2">
      <div v-for="(pair, i) in question.pairs" :key="i" class="flex items-center gap-3">
        <span class="inline-flex min-w-[110px] justify-center rounded-full px-2.5 py-1 text-xs font-medium" style="background: rgba(var(--v-theme-primary), 0.14); color: rgb(var(--v-theme-primary))">{{ pair.left }}</span>
        <BaseIcon name="mdi-arrow-left-thin" :size="20" :style="{ color: 'rgba(var(--v-theme-on-surface), 0.6)' }" />
        <BaseSelect
          :model-value="(answer as Record<number, number>)?.[i] ?? null"
          :items="rightOptions"
          placeholder="اختر المطابق"
          class="flex-1"
          @update:model-value="v => v != null && setMatch(i, v)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-overlay {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
</style>

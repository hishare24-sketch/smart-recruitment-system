<script setup lang="ts">
import { computed } from 'vue'
import type { AnswerValue, SurveyQuestion } from '@/stores/SurveysStore'

const props = defineProps<{
  question: SurveyQuestion
  modelValue: AnswerValue | undefined
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: AnswerValue): void }>()

const val = computed({
  get: () => props.modelValue,
  set: (v: AnswerValue) => emit('update:modelValue', v),
})

// matrix: value is Record<row, 1..5>
function matrixValue(row: string): number {
  return (props.modelValue as Record<string, number> | undefined)?.[row] ?? 0
}
function setMatrix(row: string, v: number) {
  emit('update:modelValue', { ...(props.modelValue as Record<string, number> ?? {}), [row]: v })
}

// ranking: value is string[] (current order)
const rankingOrder = computed<string[]>(() =>
  (props.modelValue as string[] | undefined) ?? [...(props.question.options ?? [])],
)
function move(idx: number, dir: -1 | 1) {
  const arr = [...rankingOrder.value]
  const target = idx + dir
  if (target < 0 || target >= arr.length)
    return
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
  emit('update:modelValue', arr)
}

const NPS = Array.from({ length: 11 }, (_, i) => i)
const SCALE = Array.from({ length: 10 }, (_, i) => i + 1)
function npsColor(n: number): string {
  return n <= 6 ? 'error' : n <= 8 ? 'warning' : 'success'
}
</script>

<template>
  <div>
    <!-- single -->
    <VRadioGroup v-if="question.type === 'single'" :model-value="val as string" hide-details @update:model-value="v => (val = v as string)">
      <VRadio v-for="opt in question.options" :key="opt" :label="opt" :value="opt" />
    </VRadioGroup>

    <!-- multiple -->
    <div v-else-if="question.type === 'multiple'">
      <VCheckbox
        v-for="opt in question.options"
        :key="opt"
        :model-value="(val as string[] | undefined) ?? []"
        :value="opt"
        :label="opt"
        density="compact"
        hide-details
        @update:model-value="v => (val = v as string[])"
      />
    </div>

    <!-- dropdown -->
    <VSelect v-else-if="question.type === 'dropdown'" :model-value="val as string" :items="question.options" label="اختر" hide-details @update:model-value="v => (val = v as string)" />

    <!-- text -->
    <VTextField v-else-if="question.type === 'text'" :model-value="val as string" placeholder="اكتب إجابتك…" hide-details @update:model-value="v => (val = v)" />

    <!-- longtext -->
    <VTextarea v-else-if="question.type === 'longtext'" :model-value="val as string" placeholder="اكتب إجابتك بالتفصيل…" rows="3" auto-grow hide-details @update:model-value="v => (val = v)" />

    <!-- rating -->
    <div v-else-if="question.type === 'rating'" class="text-center py-2">
      <VRating :model-value="Number(val) || 0" color="warning" hover size="42" @update:model-value="v => (val = Number(v))" />
    </div>

    <!-- nps -->
    <div v-else-if="question.type === 'nps'">
      <div class="d-flex flex-wrap ga-1 justify-center py-2">
        <VBtn
          v-for="n in NPS"
          :key="n"
          size="small"
          width="40"
          :color="Number(val) === n ? npsColor(n) : undefined"
          :variant="Number(val) === n ? 'flat' : 'outlined'"
          @click="val = n"
        >
          {{ n }}
        </VBtn>
      </div>
      <div class="d-flex justify-space-between text-caption text-medium-emphasis px-1">
        <span>غير محتمل إطلاقًا</span>
        <span>محتمل جدًا</span>
      </div>
    </div>

    <!-- scale -->
    <div v-else-if="question.type === 'scale'">
      <div class="d-flex flex-wrap ga-1 justify-center py-2">
        <VBtn
          v-for="n in SCALE"
          :key="n"
          size="small"
          width="36"
          :color="Number(val) === n ? 'primary' : undefined"
          :variant="Number(val) === n ? 'flat' : 'outlined'"
          @click="val = n"
        >
          {{ n }}
        </VBtn>
      </div>
      <div class="d-flex justify-space-between text-caption text-medium-emphasis px-1">
        <span>{{ question.scaleMin || 'ضعيف' }}</span>
        <span>{{ question.scaleMax || 'ممتاز' }}</span>
      </div>
    </div>

    <!-- matrix -->
    <div v-else-if="question.type === 'matrix'">
      <div v-for="row in question.rows" :key="row" class="d-flex align-center justify-space-between flex-wrap ga-2 py-2">
        <span class="text-body-2">{{ row }}</span>
        <VRating :model-value="matrixValue(row)" color="warning" density="compact" hover @update:model-value="v => setMatrix(row, Number(v))" />
      </div>
    </div>

    <!-- ranking -->
    <div v-else-if="question.type === 'ranking'">
      <p class="text-caption text-medium-emphasis mb-2">رتّب من الأهم (أعلى) إلى الأقل أهمية</p>
      <div v-for="(opt, i) in rankingOrder" :key="opt" class="d-flex align-center ga-2 pa-2 mb-1 rounded-lg ranking-row">
        <VChip size="x-small" color="primary" label>{{ i + 1 }}</VChip>
        <span class="text-body-2 flex-grow-1">{{ opt }}</span>
        <VBtn icon="mdi-chevron-up" size="x-small" variant="text" :disabled="i === 0" @click="move(i, -1)" />
        <VBtn icon="mdi-chevron-down" size="x-small" variant="text" :disabled="i === rankingOrder.length - 1" @click="move(i, 1)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ranking-row {
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>

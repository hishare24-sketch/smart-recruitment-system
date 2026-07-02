<script setup lang="ts">
import { computed } from 'vue'
import type { AdaptiveQuestion } from '@/services/ai'

const props = defineProps<{ question: AdaptiveQuestion }>()
const answer = defineModel<string>('answer', { default: '' })

// pull optional context bits without hard typing to each payload
const p = computed(() => props.question.payload as unknown as Record<string, unknown>)
const thread = computed(() => (p.value.thread as { from: string, text: string }[]) ?? [])
const tasks = computed(() => (p.value.tasks as string[]) ?? [])
const rows = computed(() => (p.value.rows as string[][]) ?? [])
const columns = computed(() => (p.value.columns as string[]) ?? [])
const issues = computed(() => (p.value.issues as string[]) ?? [])
const placeholder = computed(() => (p.value.placeholder as string) ?? 'اكتب إجابتك بتفصيل وأمثلة...')
</script>

<template>
  <div>
    <!-- Customer thread -->
    <div v-if="thread.length" class="mb-3">
      <div v-for="(m, i) in thread" :key="i" class="d-flex mb-2" :class="m.from === 'agent' ? 'justify-end' : 'justify-start'">
        <div
          class="pa-2 px-3 rounded-lg text-body-2"
          :class="m.from === 'agent' ? 'bg-primary' : 'bg-grey-lighten-3'"
          style="max-width: 80%"
        >
          {{ m.text }}
        </div>
      </div>
    </div>

    <!-- Reverse-plan tasks -->
    <div v-if="tasks.length" class="mb-3">
      <div class="text-caption font-weight-bold mb-1">المهام (رتّبها عكسيًا في إجابتك):</div>
      <div class="d-flex flex-wrap ga-1">
        <VChip v-for="t in tasks" :key="t" size="small" variant="tonal" color="secondary">{{ t }}</VChip>
      </div>
    </div>

    <!-- Dirty-data table -->
    <div v-if="rows.length" class="mb-3">
      <VTable density="compact" class="border rounded">
        <thead><tr><th v-for="c in columns" :key="c" class="text-caption font-weight-bold">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="(r, ri) in rows" :key="ri">
            <td v-for="(cell, ci) in r" :key="ci" class="text-caption">{{ cell || '—' }}</td>
          </tr>
        </tbody>
      </VTable>
      <div class="d-flex flex-wrap ga-1 mt-2">
        <VChip v-for="iss in issues" :key="iss" size="x-small" color="warning" variant="tonal" prepend-icon="mdi-alert-outline">{{ iss }}</VChip>
      </div>
    </div>

    <VTextarea v-model="answer" label="إجابتك" :placeholder="placeholder" rows="5" auto-grow />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AdaptiveQuestion, StrategicPayload } from '@/services/ai'

const props = defineProps<{ question: AdaptiveQuestion }>()
const answer = defineModel<string>('answer', { default: '' })

const payload = computed(() => props.question.payload as StrategicPayload)
const choice = ref('')
const justification = ref('')

// keep the serialized answer in sync for the engine to evaluate
watch([choice, justification], () => {
  const opt = payload.value.options.find(o => o.key === choice.value)
  answer.value = choice.value ? `الخيار (${opt?.label ?? choice.value}): ${justification.value}` : justification.value
})
</script>

<template>
  <div>
    <VAlert type="info" variant="tonal" density="compact" class="mb-3 text-body-2">
      {{ payload.context }}
    </VAlert>

    <div class="text-caption font-weight-bold mb-2">اختر المسار الأنسب</div>
    <VRow class="mb-2">
      <VCol v-for="o in payload.options" :key="o.key" cols="12" sm="4">
        <VCard
          :variant="choice === o.key ? 'flat' : 'outlined'"
          :color="choice === o.key ? 'primary' : undefined"
          class="pa-3 h-100 cursor-pointer"
          @click="choice = o.key"
        >
          <div class="d-flex align-center ga-1 mb-2">
            <VIcon :icon="choice === o.key ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'" size="18" />
            <span class="text-body-2 font-weight-bold">{{ o.label }}</span>
          </div>
          <div class="text-caption" :class="choice === o.key ? '' : 'text-success'">
            <VIcon icon="mdi-plus" size="12" /> {{ o.pros }}
          </div>
          <div class="text-caption" :class="choice === o.key ? '' : 'text-error'">
            <VIcon icon="mdi-minus" size="12" /> {{ o.cons }}
          </div>
        </VCard>
      </VCol>
    </VRow>

    <VTextarea
      v-model="justification"
      label="برّر قرارك (اربطه بأثر ملموس)"
      rows="3"
      auto-grow
    />

    <VAlert color="warning" variant="tonal" density="compact" class="mt-2 text-caption" border="start">
      <VIcon icon="mdi-shuffle-variant" size="15" class="me-1" /><strong>تحوّل مفاجئ:</strong> {{ payload.twist }}
    </VAlert>
  </div>
</template>

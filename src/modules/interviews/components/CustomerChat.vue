<script setup lang="ts">
import { computed } from 'vue'
import type { AdaptiveQuestion, AngryCustomerPayload } from '@/services/ai'

const props = defineProps<{ question: AdaptiveQuestion }>()
const answer = defineModel<string>('answer', { default: '' })
const payload = computed(() => props.question.payload as AngryCustomerPayload)
</script>

<template>
  <div>
    <div class="text-caption font-weight-bold mb-2">
      <VIcon icon="mdi-message-alert-outline" size="15" class="me-1" />{{ payload.channel }}
    </div>

    <!-- Conversation -->
    <div class="chat pa-3 rounded-lg mb-3">
      <div v-for="(m, i) in payload.thread" :key="i" class="d-flex mb-2" :class="m.from === 'agent' ? 'justify-end' : 'justify-start'">
        <div class="d-flex ga-2 align-end" :class="m.from === 'agent' ? 'flex-row-reverse' : ''" style="max-width: 82%">
          <VAvatar :color="m.from === 'agent' ? 'primary' : 'error'" size="26">
            <VIcon :icon="m.from === 'agent' ? 'mdi-headset' : 'mdi-account'" size="15" />
          </VAvatar>
          <div class="pa-2 px-3 rounded-lg text-body-2" :class="m.from === 'agent' ? 'bg-primary' : 'bubble-customer'">
            {{ m.text }}
          </div>
        </div>
      </div>
    </div>

    <VAlert type="warning" variant="tonal" density="compact" class="mb-2 text-caption">
      <strong>المطلوب:</strong> {{ payload.constraint }}
    </VAlert>

    <VTextarea
      v-model="answer"
      label="ردّك للعميل"
      placeholder="اكتب ردًّا احترافيًا يوازن التعاطف والحل..."
      rows="4"
      auto-grow
      prepend-inner-icon="mdi-reply"
    />
  </div>
</template>

<style scoped>
.chat {
  background: rgba(100, 116, 139, 0.08);
  border: 1px solid rgba(100, 116, 139, 0.18);
}
.bubble-customer {
  background: #fee2e2;
  color: #7f1d1d;
}
</style>

<script setup lang="ts">
import { nextTick, ref } from 'vue'

interface ChatMessage {
  from: 'user' | 'ai'
  text: string
}

const messages = ref<ChatMessage[]>([
  { from: 'ai', text: 'مرحباً! أنا مساعدك المهني الذكي. كيف يمكنني مساعدتك اليوم؟ يمكنني تحليل فرصك، تحسين ملفك، أو إنشاء سيرة ذاتية.' },
])

const suggestions = [
  'حلّل فرصي الحالية',
  'كيف أستعد للمقابلة؟',
  'أنشئ لي سيرة ذاتية',
  'ما المهارات المطلوبة في مجالي؟',
]

const input = ref('')
const isTyping = ref(false)
const listRef = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  if (listRef.value)
    listRef.value.scrollTop = listRef.value.scrollHeight
}

function mockReply(question: string): string {
  if (question.includes('سيرة'))
    return 'بالتأكيد! يمكنني إنشاء سيرة ذاتية احترافية من بيانات ملفك. توجّه إلى "منشئ السيرة الذاتية" واختر القالب المناسب، وسأتولّى الباقي مع إمكانية إعادة الصياغة الذكية.'
  if (question.includes('مقابلة'))
    return 'لتستعد للمقابلة: راجع المتطلبات الأساسية للفرصة، جهّز أمثلة STAR لإنجازاتك، وتدرّب على الأسئلة الشائعة في مجالك. أنصح أيضاً بإجراء اختبار محاكاة في مركز التقييم.'
  if (question.includes('فرص'))
    return 'بناءً على ملفك، لديك 3 فرص بنسبة تطابق أعلى من 85%. أبرزها "مطوّر واجهات أمامية" بنسبة 94%. هل تريد أن أرشّح لك خطوات لرفع نسبة التطابق؟'
  return 'سؤال ممتاز! بناءً على بياناتك، أنصحك بالتركيز على تطوير مهاراتك التقنية وإضافة توصيات موثّقة. هل تريد تفصيلاً أكثر؟'
}

async function send(text?: string) {
  const content = (text ?? input.value).trim()
  if (!content)
    return
  messages.value.push({ from: 'user', text: content })
  input.value = ''
  await scrollToBottom()

  isTyping.value = true
  setTimeout(async () => {
    messages.value.push({ from: 'ai', text: mockReply(content) })
    isTyping.value = false
    await scrollToBottom()
  }, 900)
}
</script>

<template>
  <div class="d-flex flex-column" style="height: calc(100vh - 116px)">
    <div class="d-flex align-center ga-3 mb-3">
      <VAvatar color="secondary" rounded="lg">
        <VIcon icon="mdi-robot-happy-outline" color="white" />
      </VAvatar>
      <div>
        <h1 class="text-h6 font-weight-bold mb-0">المساعد الذكي</h1>
        <div class="text-caption text-success">
          <VIcon icon="mdi-circle" size="8" /> متصل
        </div>
      </div>
    </div>

    <VCard class="flex-grow-1 d-flex flex-column overflow-hidden">
      <!-- Messages -->
      <div ref="listRef" class="flex-grow-1 overflow-y-auto pa-4">
        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="d-flex mb-3"
          :class="msg.from === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div class="d-flex ga-2" :class="msg.from === 'user' ? 'flex-row-reverse' : ''" style="max-width: 80%">
            <VAvatar :color="msg.from === 'user' ? 'primary' : 'secondary'" size="34">
              <VIcon :icon="msg.from === 'user' ? 'mdi-account' : 'mdi-robot-happy-outline'" color="white" size="18" />
            </VAvatar>
            <div
              class="pa-3 rounded-lg text-body-2"
              :class="msg.from === 'user' ? 'bg-primary text-white' : 'bg-grey-lighten-3'"
            >
              {{ msg.text }}
            </div>
          </div>
        </div>

        <div v-if="isTyping" class="d-flex ga-2 mb-3">
          <VAvatar color="secondary" size="34">
            <VIcon icon="mdi-robot-happy-outline" color="white" size="18" />
          </VAvatar>
          <div class="pa-3 rounded-lg bg-grey-lighten-3">
            <VProgressCircular indeterminate size="18" width="2" color="secondary" />
          </div>
        </div>
      </div>

      <VDivider />

      <!-- Suggestions -->
      <div class="d-flex flex-wrap ga-2 px-4 pt-3">
        <VChip
          v-for="s in suggestions"
          :key="s"
          color="primary"
          variant="tonal"
          size="small"
          class="cursor-pointer"
          @click="send(s)"
        >
          {{ s }}
        </VChip>
      </div>

      <!-- Input -->
      <div class="pa-4">
        <VTextField
          v-model="input"
          placeholder="اكتب رسالتك..."
          hide-details
          append-inner-icon="mdi-send"
          @click:append-inner="send()"
          @keyup.enter="send()"
        />
      </div>
    </VCard>
  </div>
</template>

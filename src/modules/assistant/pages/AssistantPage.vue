<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { ai } from '@/services/ai'
import { useTrustStore } from '@/stores/TrustStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { useInterviewsStore } from '@/stores/InterviewsStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseInput from '@/components/ui/BaseInput.vue'

interface ChatMessage { from: 'user' | 'ai', text: string, card?: import('@/services/ai').UploadAnalysis }
interface Conversation { id: number, title: string, messages: ChatMessage[] }

const trustStore = useTrustStore()
const profileStore = useProfileStore()
const interviewsStore = useInterviewsStore()

function colorVar(c: string) {
  return `rgb(var(--v-theme-${c === 'amber' ? 'warning' : c}))`
}

const conversations = ref<Conversation[]>([
  {
    id: 1,
    title: 'تحليل فرصي الحالية',
    messages: [
      { from: 'ai', text: 'مرحباً! أنا مساعدك المهني الذكي. كيف يمكنني مساعدتك اليوم؟ يمكنني تحليل فرصك، تحسين ملفك، أو إنشاء سيرة ذاتية.' },
    ],
  },
  {
    id: 2,
    title: 'نصائح تحضير المقابلة',
    messages: [
      { from: 'user', text: 'كيف أستعد للمقابلة؟' },
      { from: 'ai', text: 'راجع المتطلبات الأساسية للفرصة، جهّز أمثلة STAR لإنجازاتك، وتدرّب على الأسئلة الشائعة في مجالك.' },
    ],
  },
])

const activeId = ref(1)
const active = computed(() => conversations.value.find(c => c.id === activeId.value)!)

// Context-aware quick suggestions driven by real profile state
const suggestions = computed(() => ai.assistantSuggestions({
  unverifiedSkills: profileStore.unverifiedSkills,
  pendingProofs: profileStore.pendingProofRequests.length,
}))

// Proactive AI alerts grounded in the user's live data
const proactiveDismissed = ref(false)
const proactiveNudges = computed(() => ai.proactiveNudges({
  trust: trustStore.score,
  trustDelta: 5,
  pendingProofs: profileStore.pendingProofRequests.length,
  unverifiedSkills: profileStore.unverifiedSkills,
}))

const historySearch = ref('')
const filteredHistory = computed(() =>
  conversations.value.filter(c => !historySearch.value || c.title.includes(historySearch.value)),
)

const input = ref('')
const isTyping = ref(false)
const listRef = ref<HTMLElement | null>(null)
let nextConvId = 100

async function scrollToBottom() {
  await nextTick()
  if (listRef.value)
    listRef.value.scrollTop = listRef.value.scrollHeight
}

function aiReply(question: string): string {
  return ai.assistantReply(question, {
    trust: trustStore.score,
    unverifiedSkills: profileStore.unverifiedSkills,
    lastInterviewScore: interviewsStore.completed[0]?.result?.score ?? null,
  })
}

function newConversation() {
  const conv: Conversation = { id: nextConvId++, title: 'محادثة جديدة', messages: [{ from: 'ai', text: 'أهلاً! كيف أساعدك؟' }] }
  conversations.value.unshift(conv)
  activeId.value = conv.id
}

async function send(text?: string) {
  const content = (text ?? input.value).trim()
  if (!content)
    return
  active.value.messages.push({ from: 'user', text: content })
  if (active.value.title === 'محادثة جديدة')
    active.value.title = content.slice(0, 30)
  input.value = ''
  await scrollToBottom()
  isTyping.value = true
  setTimeout(async () => {
    active.value.messages.push({ from: 'ai', text: aiReply(content) })
    isTyping.value = false
    await scrollToBottom()
  }, 900)
}

// Real file upload → AI analysis
const fileInput = ref<HTMLInputElement | null>(null)
function triggerFilePick() {
  fileInput.value?.click()
}
async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file)
    return
  active.value.messages.push({ from: 'user', text: `📎 تم رفع ملف: ${file.name}` })
  await scrollToBottom()
  isTyping.value = true
  const analysis = ai.analyzeUpload(file.name)
  setTimeout(async () => {
    active.value.messages.push({ from: 'ai', text: analysis.summary, card: analysis })
    isTyping.value = false
    await scrollToBottom()
  }, 1000)
  ;(e.target as HTMLInputElement).value = ''
}
</script>

<template>
  <div class="flex gap-4" style="height: calc(100vh - 116px)">
    <!-- History sidebar -->
    <BaseCard :padded="false" class="hidden w-[260px] min-w-[260px] flex-col p-3 md:flex">
      <BaseButton variant="accent" class="mb-3" @click="newConversation"><BaseIcon name="mdi-plus" :size="16" />محادثة جديدة</BaseButton>
      <BaseInput v-model="historySearch" placeholder="بحث في السجل..." prefix-icon="mdi-magnify" class="mb-2" />
      <div class="mb-1 text-xs text-muted">سجل المحادثات</div>
      <div class="flex-1 overflow-y-auto">
        <button
          v-for="conv in filteredHistory"
          :key="conv.id"
          type="button"
          class="conv-row mb-1 rounded-ui"
          :class="{ 'is-active': conv.id === activeId }"
          @click="activeId = conv.id"
        >
          <BaseIcon name="mdi-message-outline" :size="18" />
          <span class="flex-1 truncate">{{ conv.title }}</span>
        </button>
      </div>
    </BaseCard>

    <!-- Chat -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <div class="mb-3 flex items-center gap-3">
        <BaseAvatar color="emerald" tonal square><BaseIcon name="mdi-robot-happy-outline" :size="20" /></BaseAvatar>
        <div>
          <h1 class="mb-0 text-lg font-bold text-content">المساعد الذكي</h1>
          <div class="flex items-center gap-1 text-xs" :style="{ color: 'rgb(var(--v-theme-success))' }"><BaseIcon name="mdi-circle" :size="8" /> متصل</div>
        </div>
      </div>

      <!-- Proactive AI alerts (context-aware) -->
      <div v-if="!proactiveDismissed && proactiveNudges.length" class="mb-3">
        <div
          class="flex flex-wrap items-center justify-between gap-2 rounded-ui border-s-4 p-3"
          :style="{ background: `rgba(var(--v-theme-${proactiveNudges[0].tone}), 0.14)`, borderColor: colorVar(proactiveNudges[0].tone) }"
        >
          <div class="flex items-center gap-2">
            <BaseIcon :name="proactiveNudges[0].icon" :size="20" :style="{ color: colorVar(proactiveNudges[0].tone) }" />
            <span class="text-sm text-content">{{ proactiveNudges[0].text }}</span>
          </div>
          <div class="flex items-center gap-1">
            <BaseButton v-if="proactiveNudges[0].action" size="sm" variant="accent" :to="{ name: proactiveNudges[0].action }">
              {{ proactiveNudges[0].actionLabel }}
            </BaseButton>
            <button class="icon-btn h-8 w-8" aria-label="إغلاق" @click="proactiveDismissed = true"><BaseIcon name="mdi-close" :size="18" /></button>
          </div>
        </div>
      </div>

      <BaseCard :padded="false" class="flex flex-1 flex-col overflow-hidden">
        <div ref="listRef" class="flex-1 overflow-y-auto p-4">
          <div v-for="(msg, i) in active.messages" :key="i" class="mb-3 flex" :class="msg.from === 'user' ? 'justify-end' : 'justify-start'">
            <div class="flex gap-2" :class="msg.from === 'user' ? 'flex-row-reverse' : ''" style="max-width: 80%">
              <BaseAvatar :color="msg.from === 'user' ? 'brand' : 'emerald'" tonal :size="34">
                <BaseIcon :name="msg.from === 'user' ? 'mdi-account' : 'mdi-robot-happy-outline'" :size="18" />
              </BaseAvatar>
              <div
                class="rounded-ui-lg p-3 text-sm"
                :class="msg.from === 'user' ? 'bg-brand text-on-brand' : 'border-ui bg-surfalt text-content'"
              >
                {{ msg.text }}

                <!-- Structured file-analysis card -->
                <div v-if="msg.card" class="mt-3">
                  <div class="mb-1 flex items-center gap-1">
                    <BaseIcon name="mdi-thumb-up-outline" :size="16" :style="{ color: 'rgb(var(--v-theme-success))' }" />
                    <span class="text-xs font-bold">نقاط القوة</span>
                  </div>
                  <ul class="mb-2 list-disc ps-5 text-xs">
                    <li v-for="s in msg.card.strengths" :key="s">{{ s }}</li>
                  </ul>
                  <div class="mb-1 flex items-center gap-1">
                    <BaseIcon name="mdi-arrow-up-circle-outline" :size="16" :style="{ color: 'rgb(var(--v-theme-warning))' }" />
                    <span class="text-xs font-bold">اقتراحات التحسين</span>
                  </div>
                  <ul class="mb-2 list-disc ps-5 text-xs">
                    <li v-for="s in msg.card.improvements" :key="s">{{ s }}</li>
                  </ul>
                  <div class="mb-1 flex items-center gap-1">
                    <BaseIcon name="mdi-tag-multiple-outline" :size="16" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />
                    <span class="text-xs font-bold">كلمات مفتاحية ATS مقترحة</span>
                  </div>
                  <div class="flex flex-wrap gap-1">
                    <BaseChip v-for="k in msg.card.atsKeywords" :key="k" color="emerald">{{ k }}</BaseChip>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="isTyping" class="mb-3 flex gap-2">
            <BaseAvatar color="emerald" tonal :size="34"><BaseIcon name="mdi-robot-happy-outline" :size="18" /></BaseAvatar>
            <div class="rounded-ui-lg border-ui bg-surfalt p-3">
              <span class="inline-block h-[18px] w-[18px] animate-spin rounded-full border-2 border-current border-t-transparent" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />
            </div>
          </div>
        </div>

        <hr class="border-ui">
        <div class="flex flex-wrap gap-2 px-4 pt-3">
          <button
            v-for="s in suggestions"
            :key="s"
            type="button"
            class="btn-tonal-brand cursor-pointer rounded-full px-2.5 py-1 text-sm font-medium"
            @click="send(s)"
          >
            {{ s }}
          </button>
        </div>

        <div class="flex items-center gap-2 p-4">
          <input ref="fileInput" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" hidden @change="onFileChange">
          <button class="icon-btn shrink-0" aria-label="إرفاق" @click="triggerFilePick"><BaseIcon name="mdi-paperclip" :size="20" /></button>
          <BaseInput
            v-model="input"
            placeholder="اكتب رسالتك..."
            class="flex-1"
            @keyup.enter="send()"
          >
            <template #suffix>
              <button class="icon-btn h-8 w-8" aria-label="إرسال" @click="send()"><BaseIcon name="mdi-send" :size="18" /></button>
            </template>
          </BaseInput>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<style scoped>
.conv-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  text-align: start;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  transition: background 0.15s;
}
.conv-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.05);
}
.conv-row.is-active {
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}
</style>

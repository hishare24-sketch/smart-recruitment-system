<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import { useAssistantChat } from '@/composables/useAssistantChat'
import { useChatWidgetStore } from '@/stores/ChatWidgetStore'
import { linkifyParts, nudgeRoute } from '@/utils/chatLinks'
import type { AssistantNudge } from '@/services/api'

const { t } = useI18n()
const store = useChatWidgetStore()
const router = useRouter()
const c = useAssistantChat()
const listRef = c.listRef // مرجع حاوية التمرير (نفس ref المُصدَّر من العقد)

// تهيئة كسولة + ضبط التبويب عند أوّل فتح، وتصفير الشارة.
watch(() => store.open, (open) => {
  if (open) {
    c.mode.value = store.initialTab
    c.init()
    store.markRead()
    c.scrollDown()
  }
})

const govOnline = computed(() => c.governance.value?.effectiveEnabled ?? false)
const showSuggestions = computed(() => c.mode.value === 'assistant' && c.messages.value.length <= 1 && c.suggestions.value.length > 0)

// الـnudges التي تحمل وجهة داخليّة قابلة للنقر (يرسل المساعد المستخدم لأقسام المنصّة).
const actionableNudges = computed(() => c.nudges.value.filter(n => nudgeRoute(n.action)).slice(0, 2))
function goNudge(n: AssistantNudge) {
  const r = nudgeRoute(n.action)
  if (r) { router.push(r); store.closeWidget() }
}

function onComposerKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); c.send() }
}
</script>

<template>
  <Teleport to="body">
    <!-- ===== المُطلِق العائم (FAB) ===== -->
    <button
      v-show="!store.open"
      type="button"
      class="group fixed bottom-5 end-5 z-[46] grid h-14 w-14 place-items-center rounded-full text-on-brand shadow-lg shadow-black/25 transition-transform hover:scale-105 active:scale-95"
      style="background: rgb(var(--v-theme-primary))"
      :aria-label="t('chat.open')"
      @click="store.openWidget()"
    >
      <BaseBadge :show="store.unread > 0" :content="store.unread" color="accent">
        <BaseIcon name="mdi-message-text-outline" :size="26" />
      </BaseBadge>
      <span class="absolute bottom-full end-0 mb-2 hidden whitespace-nowrap rounded-ui bg-surfalt px-2 py-1 text-xs text-content shadow group-hover:block">{{ t('chat.title') }}</span>
    </button>

    <!-- ===== خلفية الموبايل ===== -->
    <div
      class="fixed inset-0 z-[94] bg-black/40 transition-opacity duration-200 sm:hidden"
      :class="store.open ? 'opacity-100' : 'pointer-events-none opacity-0'"
      @click="store.closeWidget()"
    />

    <!-- ===== اللوحة ===== -->
    <transition
      enter-active-class="transition duration-200 ease-out" enter-from-class="translate-y-4 opacity-0" enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in" leave-from-class="translate-y-0 opacity-100" leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="store.open"
        class="fixed inset-x-0 bottom-0 z-[95] flex h-[86vh] flex-col overflow-hidden border-ui bg-surface text-content shadow-2xl shadow-black/40 sm:inset-x-auto sm:bottom-5 sm:end-5 sm:h-[min(620px,86vh)] sm:w-[400px] sm:rounded-2xl sm:border"
      >
        <!-- الرأس -->
        <header class="flex items-center gap-2.5 border-b border-ui px-3 py-2.5">
          <div class="relative">
            <BaseAvatar color="emerald" tonal square :size="38"><BaseIcon name="mdi-robot-happy-outline" :size="20" /></BaseAvatar>
            <span class="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface" :style="{ background: govOnline ? 'rgb(var(--v-theme-success))' : 'rgb(var(--v-theme-neutral, 120 120 120))' }" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-bold">{{ t('chat.title') }}</div>
            <div class="truncate text-[11px] text-muted">{{ govOnline ? t('chat.online') : t('chat.offline') }}</div>
          </div>
          <RouterLink :to="{ name: 'assistant' }" class="rounded-ui p-1.5 text-muted hover:bg-surfalt hover:text-content" :title="t('chat.expand')" @click="store.closeWidget()">
            <BaseIcon name="mdi-arrow-expand" :size="18" />
          </RouterLink>
          <button type="button" class="rounded-ui p-1.5 text-muted hover:bg-surfalt hover:text-content" :aria-label="t('chat.close')" @click="store.closeWidget()">
            <BaseIcon name="mdi-close" :size="20" />
          </button>
        </header>

        <!-- التبويبان -->
        <div class="flex shrink-0 gap-1 border-b border-ui px-2 py-1.5">
          <button
            v-for="tab in (['assistant', 'support'] as const)" :key="tab" type="button"
            class="flex-1 rounded-ui px-2 py-1.5 text-xs font-semibold transition"
            :style="c.mode.value === tab ? { background: 'rgb(var(--v-theme-primary))', color: 'rgb(var(--v-theme-on-primary))' } : { color: 'rgba(var(--v-theme-on-surface),0.7)' }"
            @click="c.mode.value = tab"
          >
            <BaseIcon :name="tab === 'assistant' ? 'mdi-robot-happy-outline' : 'mdi-lifebuoy'" :size="14" />
            {{ tab === 'assistant' ? t('chat.tabAssistant') : t('chat.tabSupport') }}
          </button>
        </div>

        <!-- ============ المساعد ============ -->
        <template v-if="c.mode.value === 'assistant'">
          <div ref="listRef" class="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            <div v-for="(m, i) in c.messages.value" :key="i" class="flex gap-2" :class="m.role === 'user' ? 'flex-row-reverse' : ''">
              <BaseAvatar :color="m.role === 'user' ? 'brand' : 'emerald'" tonal :size="28" class="shrink-0"><BaseIcon :name="m.role === 'user' ? 'mdi-account' : 'mdi-robot-happy-outline'" :size="15" /></BaseAvatar>
              <div class="max-w-[80%] rounded-ui-lg px-3 py-2 text-sm" :class="m.role === 'user' ? 'bg-brand text-on-brand' : 'border border-ui bg-surfalt'">
                <span class="whitespace-pre-line break-words">
                  <template v-for="(p, pi) in linkifyParts(m.body)" :key="pi">
                    <a v-if="p.type === 'link'" :href="p.value" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2" :class="m.role === 'user' ? '' : 'text-brand'">{{ p.value }}</a>
                    <template v-else>{{ p.value }}</template>
                  </template>
                </span>
                <div v-if="m.meta && !m.meta.blocked && (m.meta.usedKnowledge?.length || m.meta.usedTools?.length)" class="mt-1.5 flex flex-wrap items-center gap-1 border-t border-ui pt-1">
                  <span v-for="k in (m.meta.usedKnowledge || [])" :key="`k${k}`" class="rounded-full px-1.5 py-0.5 text-[10px] text-brand" style="background: rgba(var(--v-theme-primary),0.1)">{{ k }}</span>
                  <span v-for="tl in (m.meta.usedTools || [])" :key="`t${tl}`" class="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] text-success" style="background: rgba(var(--v-theme-success),0.12)"><BaseIcon name="mdi-database-search-outline" :size="10" />{{ c.toolLabel(tl) }}</span>
                </div>
              </div>
            </div>
            <div v-if="c.sending.value" class="flex gap-2">
              <BaseAvatar color="emerald" tonal :size="28"><BaseIcon name="mdi-robot-happy-outline" :size="15" /></BaseAvatar>
              <div class="rounded-ui-lg border border-ui bg-surfalt px-3 py-2"><span class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" style="color: rgb(var(--v-theme-secondary))" /></div>
            </div>
          </div>

          <!-- أزرار إجراء الـnudges: يرسل المساعد المستخدم لأقسام المنصّة -->
          <div v-if="actionableNudges.length" class="shrink-0 space-y-1.5 px-3 pb-1">
            <button
              v-for="(n, ni) in actionableNudges" :key="ni" type="button"
              class="flex w-full items-center gap-2 rounded-ui border-s-4 p-2 text-start text-xs transition hover:brightness-105"
              :style="{ background: `rgba(var(--v-theme-${n.tone === 'amber' ? 'warning' : n.tone}),0.1)`, borderColor: c.toneColor(n.tone) }"
              @click="goNudge(n)"
            >
              <BaseIcon :name="n.icon" :size="16" :style="{ color: c.toneColor(n.tone) }" />
              <span class="flex-1 text-content">{{ n.text }}</span>
              <BaseChip color="brand">{{ n.actionLabel }}<BaseIcon name="mdi-arrow-left" :size="12" /></BaseChip>
            </button>
          </div>

          <!-- الاقتراحات -->
          <div v-if="showSuggestions" class="flex shrink-0 flex-wrap gap-1.5 px-3 pb-1">
            <button v-for="s in c.suggestions.value.slice(0, 3)" :key="s" type="button" class="rounded-full border border-ui px-2.5 py-1 text-[11px] text-muted transition hover:border-brand hover:text-brand" @click="c.send(s)">{{ s }}</button>
          </div>

          <!-- شريط التصعيد عند الحجب -->
          <div v-if="c.lastBlocked.value" class="mx-3 mb-1 flex items-center justify-between gap-2 rounded-ui border-s-4 p-2 text-xs" style="border-color: rgb(var(--v-theme-warning)); background: rgba(var(--v-theme-warning),0.1)">
            <span class="text-content">{{ t('chat.escalateHint') }}</span>
            <BaseButton variant="accent" size="sm" @click="c.escalate()">{{ t('chat.escalate') }}</BaseButton>
          </div>

          <!-- الملحّن -->
          <div class="flex shrink-0 items-end gap-1.5 border-t border-ui p-2">
            <button type="button" class="grid h-9 w-9 shrink-0 place-items-center rounded-ui text-muted hover:bg-surfalt hover:text-content" :title="t('chat.escalate')" @click="c.escalate()"><BaseIcon name="mdi-lifebuoy" :size="18" /></button>
            <BaseTextarea v-model="c.input.value" :rows="1" auto-grow :placeholder="t('chat.placeholder')" class="flex-1" @keydown="onComposerKey" />
            <BaseButton variant="brand" size="sm" :disabled="!c.input.value.trim() || c.sending.value" @click="c.send()"><BaseIcon name="mdi-send" :size="16" /></BaseButton>
          </div>
        </template>

        <!-- ============ الدعم ============ -->
        <template v-else>
          <!-- محادثة تذكرة مفتوحة -->
          <template v-if="c.activeTicket.value">
            <div class="flex shrink-0 items-center gap-2 border-b border-ui px-3 py-2">
              <button type="button" class="rounded-ui p-1 text-muted hover:bg-surfalt" @click="c.activeTicket.value = null"><BaseIcon name="mdi-arrow-right" :size="18" /></button>
              <div class="min-w-0 flex-1"><div class="truncate text-sm font-semibold">{{ c.activeTicket.value.subject }}</div></div>
              <BaseChip :color="c.STATUS_COLOR[c.activeTicket.value.status] || 'neutral'">{{ t(`assistant.st_${c.activeTicket.value.status}`) }}</BaseChip>
            </div>
            <div ref="listRef" class="flex-1 space-y-3 overflow-y-auto px-3 py-3">
              <div v-for="r in c.activeTicket.value.replies" :key="r.id" class="flex gap-2" :class="r.isStaff ? '' : 'flex-row-reverse'">
                <BaseAvatar :color="r.isStaff ? 'info' : 'brand'" tonal :size="28" class="shrink-0"><BaseIcon :name="r.isStaff ? 'mdi-headset' : 'mdi-account'" :size="15" /></BaseAvatar>
                <div class="max-w-[80%] rounded-ui-lg px-3 py-2 text-sm" :class="r.isStaff ? 'border border-ui bg-surfalt' : 'bg-brand text-on-brand'">
                  <span class="whitespace-pre-line break-words">
                    <template v-for="(p, pi) in linkifyParts(r.body)" :key="pi">
                      <a v-if="p.type === 'link'" :href="p.value" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2" :class="r.isStaff ? 'text-brand' : ''">{{ p.value }}</a>
                      <template v-else>{{ p.value }}</template>
                    </template>
                  </span>
                </div>
              </div>
            </div>
            <div class="flex shrink-0 items-end gap-1.5 border-t border-ui p-2">
              <BaseTextarea v-model="c.ticketInput.value" :rows="1" auto-grow :placeholder="t('chat.replyPlaceholder')" class="flex-1" @keydown.enter.exact.prevent="c.replyTicket()" />
              <BaseButton variant="brand" size="sm" :disabled="!c.ticketInput.value.trim()" @click="c.replyTicket()"><BaseIcon name="mdi-send" :size="16" /></BaseButton>
            </div>
          </template>

          <!-- إنشاء تذكرة -->
          <template v-else-if="c.creatingTicket.value">
            <div class="flex-1 space-y-2.5 overflow-y-auto p-3">
              <BaseInput v-model="c.newTicket.value.subject" :label="t('chat.ticketSubject')" :placeholder="t('chat.ticketSubjectPh')" />
              <div class="grid grid-cols-2 gap-2">
                <BaseSelect v-model="c.newTicket.value.category" :items="c.CATEGORIES.value" :label="t('chat.ticketCategory')" />
                <BaseSelect v-model="c.newTicket.value.priority" :items="c.PRIORITIES.value" :label="t('chat.ticketPriority')" />
              </div>
              <BaseTextarea v-model="c.newTicket.value.body" :rows="4" :label="t('chat.ticketBody')" :placeholder="t('chat.ticketBodyPh')" />
            </div>
            <div class="flex shrink-0 gap-2 border-t border-ui p-2">
              <BaseButton variant="ghost" size="sm" class="flex-1" @click="c.creatingTicket.value = false">{{ t('common.cancel') }}</BaseButton>
              <BaseButton variant="brand" size="sm" class="flex-1" :disabled="!c.newTicket.value.subject.trim() || !c.newTicket.value.body.trim()" @click="c.createTicket()">{{ t('chat.ticketSend') }}</BaseButton>
            </div>
          </template>

          <!-- قائمة التذاكر -->
          <template v-else>
            <div class="flex-1 space-y-2 overflow-y-auto p-3">
              <button v-for="tk in c.tickets.value" :key="tk.id" type="button" class="flex w-full items-center gap-2 rounded-ui border border-ui p-2.5 text-start transition hover:border-brand" @click="c.openTicket(tk.id)">
                <BaseIcon name="mdi-ticket-confirmation-outline" :size="18" class="shrink-0 text-muted" />
                <div class="min-w-0 flex-1"><div class="truncate text-sm font-medium text-content">{{ tk.subject }}</div><div class="text-[11px] text-muted">{{ t(`assistant.cat${tk.category.charAt(0).toUpperCase() + tk.category.slice(1)}`) }}</div></div>
                <BaseChip :color="c.STATUS_COLOR[tk.status] || 'neutral'">{{ t(`assistant.st_${tk.status}`) }}</BaseChip>
              </button>
              <p v-if="!c.tickets.value.length" class="py-8 text-center text-sm text-muted">{{ t('chat.noTickets') }}</p>
            </div>
            <div class="shrink-0 border-t border-ui p-2">
              <BaseButton variant="brand" size="sm" block @click="c.startNewTicket()"><BaseIcon name="mdi-plus" :size="16" />{{ t('chat.newTicket') }}</BaseButton>
            </div>
          </template>
        </template>
      </div>
    </transition>

    <BaseSnackbar v-model="c.snack.value.show" :color="c.snack.value.color">{{ c.snack.value.text }}</BaseSnackbar>
  </Teleport>
</template>

import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * حالة ويدجت الشات العائم (المساعد + الدعم): مفتوح/مغلق + عدّاد غير-مقروء
 * (يتراكم من ردود الدعم اللحظيّة حين يكون الويدجت مغلقًا). مركزيّ كي يتشارك المُطلِق
 * واللوحة والبثّ نفس الحالة.
 */
export const useChatWidgetStore = defineStore('chatWidget', () => {
  const open = ref(false)
  const unread = ref(0)
  const initialTab = ref<'assistant' | 'support'>('assistant')

  function openWidget(tab: 'assistant' | 'support' = 'assistant') {
    initialTab.value = tab
    open.value = true
    unread.value = 0
  }
  function closeWidget() { open.value = false }
  function toggle() { open.value ? closeWidget() : openWidget() }
  function markRead() { unread.value = 0 }
  function bumpUnread(n = 1) { if (!open.value) unread.value += n }

  return { open, unread, initialTab, openWidget, closeWidget, toggle, markRead, bumpUnread }
})

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// قائمة منسدلة أساس — مُشغّل + لوحة تُفتح أسفله. الإغلاق بالنقر خارجها يتم عبر
// طبقة شفّافة كاملة الشاشة (backdrop) خلف اللوحة — أمتن من مُصغي مستندي يتسابق
// مع نقرة المُشغّل. تحاكي VMenu: closeOnContent + محاذاة RTL + Escape.
const props = withDefaults(defineProps<{
  closeOnContent?: boolean
  align?: 'start' | 'end'
  panelClass?: string
}>(), { closeOnContent: true, align: 'end' })

const open = ref(false)

function toggle() {
  open.value = !open.value
}
function close() {
  open.value = false
}
function onContentClick() {
  if (props.closeOnContent)
    close()
}

function onKey(e: KeyboardEvent) {
  if (open.value && e.key === 'Escape')
    close()
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="relative inline-flex">
    <slot name="trigger" :toggle="toggle" :open="open" :close="close" />

    <!-- طبقة الإغلاق: تلتقط أي نقرة خارج اللوحة -->
    <div v-if="open" class="fixed inset-0 z-40" @click="close" />

    <div
      v-if="open"
      class="border-ui rounded-ui-lg dd-panel absolute top-full z-50 mt-2 overflow-hidden bg-surface text-content shadow-xl shadow-black/25"
      :class="[align === 'end' ? 'end-0' : 'start-0', panelClass]"
      @click="onContentClick"
    >
      <slot :close="close" />
    </div>
  </div>
</template>

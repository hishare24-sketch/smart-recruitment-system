<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

// درج جانبي أساس يحاكي VNavigationDrawer temporary — مُنقول لـ <body>، يظهر من
// الجهة المنطقية end (يمين في LTR / يسار في RTL)، يُغلق بالخلفية أو Escape.
const props = withDefaults(defineProps<{
  modelValue: boolean
  width?: number
}>(), { width: 330 })
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function close() {
  emit('update:modelValue', false)
}
function onKey(e: KeyboardEvent) {
  if (props.modelValue && e.key === 'Escape')
    close()
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <!-- backdrop (v-if فوري بلا Transition تفاديًا لتعلّق الإزالة) -->
    <div v-if="modelValue" class="fixed inset-0 z-[90] bg-black/50" @click="close" />
    <!-- panel -->
    <div
      class="fixed inset-y-0 end-0 z-[95] flex flex-col overflow-y-auto border-ui bg-surface text-content shadow-2xl shadow-black/40 transition-transform duration-200"
      :class="modelValue ? 'translate-x-0' : 'rtl:-translate-x-full ltr:translate-x-full'"
      :style="{ width: `${width}px` }"
    >
      <slot />
    </div>
  </Teleport>
</template>

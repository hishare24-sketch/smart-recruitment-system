<script setup lang="ts">
import { ref } from 'vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

// إدخال وسوم حرّ يحاكي VCombobox (multiple + chips) — يكتب المستخدم نصًّا ويضيفه
// بـEnter أو فاصلة، والرقائق قابلة للإزالة. لتحرير خيارات/عناصر حرّة (لا قائمة ثابتة).
const props = defineProps<{ modelValue: string[], label?: string, placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const draft = ref('')

function add() {
  const v = draft.value.trim()
  if (v && !props.modelValue.includes(v))
    emit('update:modelValue', [...props.modelValue, v])
  draft.value = ''
}
function remove(tag: string) {
  emit('update:modelValue', props.modelValue.filter(t => t !== tag))
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    add()
  }
  else if (e.key === 'Backspace' && !draft.value && props.modelValue.length) {
    emit('update:modelValue', props.modelValue.slice(0, -1))
  }
}
</script>

<template>
  <div>
    <label v-if="label" class="mb-1 block text-sm font-medium text-muted">{{ label }}</label>
    <div class="input-wrap rounded-ui flex flex-wrap items-center gap-1 bg-surface px-2 py-1.5">
      <span
        v-for="tag in modelValue"
        :key="tag"
        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
        style="background: rgba(var(--v-theme-primary), 0.14); color: rgb(var(--v-theme-primary))"
      >
        {{ tag }}
        <button type="button" class="leading-none" aria-label="إزالة" @click="remove(tag)">
          <BaseIcon name="mdi-close" :size="13" />
        </button>
      </span>
      <input
        v-model="draft"
        :placeholder="placeholder ?? 'اكتب ثم Enter…'"
        class="h-7 min-w-[6rem] flex-1 bg-transparent text-sm text-content outline-none placeholder:text-muted"
        @keydown="onKeydown"
        @blur="add"
      >
    </div>
  </div>
</template>

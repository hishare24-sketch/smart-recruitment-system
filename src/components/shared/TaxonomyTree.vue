<script setup lang="ts">
import { computed, ref } from 'vue'
import { TAXONOMY, categorizeSkill } from '@/services/taxonomy'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

// Each item carries its skills (for category counting), a text blob (for
// sub-category keyword counting), and an optional resolved `sector` slug
// (from a department/field) so items classify by sector even without a
// recognized skill.
const props = defineProps<{ items: { skills: string[], text: string, sector?: string }[] }>()
const selection = defineModel<{ category?: string, sub?: string }>({ default: () => ({}) })

const catSearch = ref('')
const expanded = ref<Set<string>>(new Set())
const showAll = ref(false)
const LIMIT = 8

// عنصر ينتمي لقطاع إن صنّفت إحدى مهاراته إليه أو كان قطاعه المشتقّ هو نفسه
function inCategory(it: { skills: string[], sector?: string }, catId: string): boolean {
  return it.sector === catId || it.skills.some(s => categorizeSkill(s) === catId)
}

const tree = computed(() => {
  return TAXONOMY.map((cat) => {
    const inCat = props.items.filter(it => inCategory(it, cat.id))
    const subs = cat.subcategories
      .map(name => ({ name, count: inCat.filter(it => it.text.includes(name)).length }))
      .filter(s => s.count > 0)
    return { id: cat.id, label: cat.label, icon: cat.icon, color: cat.color, count: inCat.length, subs }
  }).filter(c => c.count > 0)
})

const visibleTree = computed(() => {
  const q = catSearch.value.trim()
  if (!q)
    return tree.value
  return tree.value.filter(c => c.label.includes(q) || c.subs.some(s => s.name.includes(q)))
})

// أولوية العرض: أهمّ LIMIT قطاعًا أولًا (TAXONOMY مرتّبة بالأولوية S01..S21) + «المزيد»
const displayTree = computed(() => (showAll.value || catSearch.value.trim() ? visibleTree.value : visibleTree.value.slice(0, LIMIT)))
const hiddenCount = computed(() => Math.max(0, visibleTree.value.length - LIMIT))

const total = computed(() => props.items.length)

function toggleExpand(id: string) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}
function selectCategory(id: string) {
  if (selection.value.category === id && !selection.value.sub)
    selection.value = {}
  else
    selection.value = { category: id }
  toggleExpandOpen(id)
}
function toggleExpandOpen(id: string) {
  if (!expanded.value.has(id))
    expanded.value = new Set(expanded.value).add(id)
}
function selectSub(id: string, sub: string) {
  if (selection.value.category === id && selection.value.sub === sub)
    selection.value = { category: id }
  else
    selection.value = { category: id, sub }
}
function clearAll() {
  selection.value = {}
  catSearch.value = ''
}
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <span class="flex items-center gap-1 text-sm font-bold"><BaseIcon name="mdi-file-tree-outline" :size="18" /> التصنيفات</span>
      <span class="text-xs text-muted">{{ total }}</span>
    </div>

    <BaseInput v-model="catSearch" prefix-icon="mdi-magnify" placeholder="بحث في التصنيفات" class="mb-2">
      <template #suffix>
        <button v-if="catSearch" type="button" class="text-muted" aria-label="مسح" @click="catSearch = ''">
          <BaseIcon name="mdi-close" :size="18" />
        </button>
      </template>
    </BaseInput>

    <div class="space-y-0.5">
      <template v-for="cat in displayTree" :key="cat.id">
        <button
          class="flex w-full items-center gap-1 rounded-ui px-2 py-1.5 text-start transition"
          :class="selection.category === cat.id && !selection.sub ? '' : 'hover:bg-surfalt'"
          :style="selection.category === cat.id && !selection.sub ? { background: 'rgba(var(--v-theme-primary), 0.16)', color: 'rgb(var(--v-theme-primary))' } : {}"
          @click="selectCategory(cat.id)"
        >
          <span class="shrink-0" @click.stop="toggleExpand(cat.id)">
            <BaseIcon :name="expanded.has(cat.id) ? 'mdi-menu-down' : 'mdi-menu-left'" :size="18" class="text-muted" />
          </span>
          <BaseIcon :name="cat.icon" :size="18" :style="{ color: `rgb(var(--v-theme-${cat.color}))` }" />
          <span class="flex-1 truncate text-sm font-medium">{{ cat.label }}</span>
          <BaseChip color="neutral">{{ cat.count }}</BaseChip>
        </button>

        <template v-if="expanded.has(cat.id)">
          <button
            v-for="sub in cat.subs"
            :key="`${cat.id}-${sub.name}`"
            class="flex w-full items-center gap-1 rounded-ui py-1.5 pe-2 ps-9 text-start transition"
            :class="selection.category === cat.id && selection.sub === sub.name ? '' : 'hover:bg-surfalt'"
            :style="selection.category === cat.id && selection.sub === sub.name ? { background: 'rgba(var(--v-theme-primary), 0.16)', color: 'rgb(var(--v-theme-primary))' } : {}"
            @click="selectSub(cat.id, sub.name)"
          >
            <span class="flex-1 text-xs">{{ sub.name }}</span>
            <span class="text-xs text-muted">{{ sub.count }}</span>
          </button>
        </template>
      </template>
    </div>

    <button
      v-if="!catSearch && hiddenCount > 0"
      type="button"
      class="mt-1 flex w-full items-center justify-center gap-1 rounded-ui py-1.5 text-xs font-medium text-brand transition hover:bg-surfalt"
      @click="showAll = !showAll"
    >
      <BaseIcon :name="showAll ? 'mdi-chevron-up' : 'mdi-chevron-down'" :size="16" />
      {{ showAll ? 'عرض أقل' : `المزيد (+${hiddenCount})` }}
    </button>

    <div v-if="!visibleTree.length" class="py-3 text-center text-xs text-muted">لا تصنيفات مطابقة</div>

    <BaseButton
      v-if="selection.category || catSearch"
      variant="ghost"
      size="sm"
      block
      class="mt-2"
      style="color: rgb(var(--v-theme-error))"
      @click="clearAll"
    >
      <BaseIcon name="mdi-close" :size="18" /> إزالة الكل
    </BaseButton>
  </div>
</template>

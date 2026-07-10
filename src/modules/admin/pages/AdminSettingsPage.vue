<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseTabs from '@/components/ui/BaseTabs.vue'
import { type AdminSetting, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission('manage_settings'))

const settings = ref<AdminSetting[]>([])
const values = ref<Record<string, string | number | boolean>>({})
const original = ref<Record<string, string | number | boolean>>({})
const loading = ref(true)
const saving = ref(false)
const activeGroup = ref('general')

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }

const GROUP_ICON: Record<string, string> = { general: 'mdi-cog-outline', registration: 'mdi-account-plus-outline', finance: 'mdi-cash-multiple', surveys: 'mdi-clipboard-text-outline' }

const groups = computed(() => {
  const set = new Set(settings.value.map(s => s.group))
  return [...set]
})
const tabs = computed(() => groups.value.map(g => ({ value: g, label: t(`admin.settings.group_${g}`), icon: GROUP_ICON[g] || 'mdi-tune' })))
const groupSettings = computed(() => settings.value.filter(s => s.group === activeGroup.value))
const dirtyCount = computed(() => Object.keys(values.value).filter(k => values.value[k] !== original.value[k]).length)

function hydrate(list: AdminSetting[]) {
  settings.value = list
  const v: Record<string, string | number | boolean> = {}
  for (const s of list) v[s.key] = s.value
  values.value = { ...v }
  original.value = { ...v }
  if (!groups.value.includes(activeGroup.value) && groups.value.length)
    activeGroup.value = groups.value[0]
}
async function load() {
  loading.value = true
  try { hydrate(await api.admin.settings()) }
  finally { loading.value = false }
}
onMounted(load)

async function save() {
  if (!dirtyCount.value)
    return
  saving.value = true
  const changed: Record<string, string | number | boolean> = {}
  for (const k of Object.keys(values.value)) {
    if (values.value[k] !== original.value[k])
      changed[k] = values.value[k]
  }
  try {
    const updated = await api.admin.updateSettings(changed)
    hydrate(updated)
    toast(t('admin.settings.saved'))
  }
  catch (e) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }
  finally { saving.value = false }
}
function reset() { values.value = { ...original.value } }
</script>

<template>
  <div>
    <PageHeader :title="t('admin.settings.title')" :subtitle="t('admin.settings.subtitle')" icon="mdi-cog-outline">
      <template #actions>
        <div class="flex items-center gap-2">
          <BaseButton v-if="dirtyCount" variant="ghost" size="sm" @click="reset">{{ t('admin.settings.reset') }}</BaseButton>
          <BaseButton variant="brand" size="sm" :disabled="!canManage || !dirtyCount || saving" @click="save">
            <BaseIcon name="mdi-content-save-outline" :size="18" />{{ t('admin.settings.save') }}<span v-if="dirtyCount"> ({{ dirtyCount }})</span>
          </BaseButton>
        </div>
      </template>
    </PageHeader>

    <BaseCard>
      <BaseTabs v-model="activeGroup" :tabs="tabs" />

      <div class="mt-4 divide-y divide-ui">
        <div v-for="s in groupSettings" :key="s.key" class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="sm:max-w-[55%]">
            <div class="font-medium text-content">{{ s.label }}</div>
            <div v-if="s.description" class="text-xs text-muted">{{ s.description }}</div>
            <div class="mt-0.5 font-mono text-[10px] text-muted" dir="ltr">{{ s.key }}</div>
          </div>
          <div class="sm:w-64">
            <BaseSwitch v-if="s.type === 'boolean'" :model-value="!!values[s.key]" :disabled="!canManage" @update:model-value="v => values[s.key] = v" />
            <BaseSelect
              v-else-if="s.type === 'select'"
              :model-value="String(values[s.key])"
              :items="s.options.map(o => ({ value: o.value, title: o.label }))"
              :disabled="!canManage"
              @update:model-value="v => values[s.key] = v ?? ''"
            />
            <BaseInput
              v-else
              :model-value="values[s.key] as string | number"
              :type="s.type === 'number' ? 'number' : 'text'"
              :disabled="!canManage"
              @update:model-value="v => values[s.key] = v"
            />
          </div>
        </div>
        <p v-if="!groupSettings.length && !loading" class="py-8 text-center text-sm text-muted">—</p>
      </div>
    </BaseCard>

    <p class="mt-3 flex items-center gap-1.5 text-xs text-muted">
      <BaseIcon name="mdi-information-outline" :size="15" />{{ t('admin.settings.note') }}
    </p>

    <BaseSnackbar v-model="snack.show" :color="snack.color">{{ snack.text }}</BaseSnackbar>
  </div>
</template>

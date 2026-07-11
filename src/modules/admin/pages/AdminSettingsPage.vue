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
import { type AdminSetting, type AdminSettingsOverview, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission('manage_settings'))

const settings = ref<AdminSetting[]>([])
const values = ref<Record<string, string | number | boolean>>({})
const original = ref<Record<string, string | number | boolean>>({})
const overview = ref<AdminSettingsOverview | null>(null)
const loading = ref(true)
const saving = ref(false)
const resetting = ref(false)
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
async function loadOverview() { try { overview.value = await api.admin.settingsOverview() } catch { /* تجاهل */ } }
async function load() {
  loading.value = true
  try { hydrate(await api.admin.settings()); await loadOverview() }
  finally { loading.value = false }
}
onMounted(load)

// عدد المُعدَّل عن الافتراضيّ في المجموعة النشطة (لإتاحة إعادة ضبط المجموعة)
const groupModifiedCount = computed(() => groupSettings.value.filter(s => s.modified).length)

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

/** إعادة ضبط حقيقيّة للافتراضيّ المصنعيّ (مفتاح واحد أو المجموعة النشطة) عبر الخادم. */
async function resetToDefault(payload: { keys?: string[], group?: string }) {
  if (resetting.value)
    return
  resetting.value = true
  try {
    hydrate(await api.admin.resetSettings(payload))
    await loadOverview()
    toast(t('admin.settings.resetDone'))
  }
  catch (e) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }
  finally { resetting.value = false }
}
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

    <!-- نظرة إحصائيّة مدمجة -->
    <div v-if="overview" class="mb-4 grid grid-cols-3 gap-3">
      <div class="ov-card"><span class="ov-val">{{ overview.total }}</span><span class="ov-lbl">{{ t('admin.settings.ovTotal') }}</span></div>
      <div class="ov-card"><span class="ov-val">{{ overview.groups }}</span><span class="ov-lbl">{{ t('admin.settings.ovGroups') }}</span></div>
      <div class="ov-card" :class="overview.modified ? 'ov-warn' : ''"><span class="ov-val">{{ overview.modified }}</span><span class="ov-lbl">{{ t('admin.settings.ovModified') }}</span></div>
    </div>

    <BaseCard>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <BaseTabs v-model="activeGroup" :tabs="tabs" />
        <BaseButton
          v-if="canManage && groupModifiedCount"
          variant="ghost"
          size="sm"
          :disabled="resetting"
          @click="resetToDefault({ group: activeGroup })"
        >
          <BaseIcon name="mdi-backup-restore" :size="16" />{{ t('admin.settings.resetGroup') }} ({{ groupModifiedCount }})
        </BaseButton>
      </div>

      <div class="mt-4 divide-y divide-ui">
        <div v-for="s in groupSettings" :key="s.key" class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="sm:max-w-[55%]">
            <div class="flex items-center gap-2">
              <span class="font-medium text-content">{{ s.label }}</span>
              <span v-if="s.modified" class="mod-badge">{{ t('admin.settings.modified') }}</span>
              <button
                v-if="s.modified && canManage"
                class="reset-key"
                :disabled="resetting"
                :title="t('admin.settings.resetKey')"
                @click="resetToDefault({ keys: [s.key] })"
              >
                <BaseIcon name="mdi-backup-restore" :size="14" />
              </button>
            </div>
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

<style scoped>
.ov-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  background: rgba(var(--v-theme-on-surface), 0.02);
}
.ov-val { font-size: 1.5rem; font-weight: 800; color: rgb(var(--v-theme-on-surface)); }
.ov-lbl { font-size: 0.72rem; color: rgba(var(--v-theme-on-surface), 0.6); }
.ov-warn { border-color: rgba(var(--v-theme-warning), 0.5); background: rgba(var(--v-theme-warning), 0.08); }
.mod-badge {
  font-size: 0.62rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  color: rgb(var(--v-theme-warning));
  background: rgba(var(--v-theme-warning), 0.14);
}
.reset-key {
  display: inline-flex;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.reset-key:hover { color: rgb(var(--v-theme-primary)); }
.reset-key:disabled { opacity: 0.5; }
</style>

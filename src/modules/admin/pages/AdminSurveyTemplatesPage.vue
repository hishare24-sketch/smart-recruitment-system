<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseTagInput from '@/components/ui/BaseTagInput.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { FilterDef } from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { confirm } from '@/components/ui/confirm'
import { type AdminSurveyTemplate, type AdminSurveyTemplatesStats, type AdminTemplateQuestion, api } from '@/services/api'
import { QUESTION_TYPE_META, type SurveyQuestionType } from '@/stores/SurveysStore'

const { t } = useI18n()
const r = useAdminResource<AdminSurveyTemplate>({ fetcher: params => api.admin.surveyTemplates(params), initialSort: 'sort' })
const { items, meta, loading, sortKey, search, filters } = r

const stats = ref<AdminSurveyTemplatesStats | null>(null)
async function loadStats() { try { stats.value = await api.admin.surveyTemplatesStats() } catch { /* تجاهل */ } }
onMounted(loadStats)
function refreshAll() { r.refresh(); loadStats() }

const CATEGORIES = ['satisfaction', 'feedback', 'nps', 'poll', 'assessment', 'custom']
const catLabel = (c: string) => t(`admin.templates.cat_${c}`)
const catColor: Record<string, 'brand' | 'success' | 'info' | 'warning' | 'accent' | 'neutral'> = {
  satisfaction: 'success', nps: 'accent', feedback: 'info', poll: 'warning', assessment: 'brand', custom: 'neutral',
}
const CHOICE_TYPES = ['single', 'multiple', 'dropdown', 'ranking']
const TYPE_KEYS = Object.keys(QUESTION_TYPE_META) as SurveyQuestionType[]
const qMeta = (ty: string) => QUESTION_TYPE_META[ty as SurveyQuestionType] ?? { label: ty, icon: 'mdi-help', hint: '' }

const columns: TableColumn[] = [
  { key: 'name', label: t('admin.templates.colName'), sortable: true },
  { key: 'category', label: t('admin.templates.colCategory'), sortable: true, align: 'center' },
  { key: 'questionsCount', label: t('admin.templates.colQuestions'), align: 'center' },
  { key: 'is_system', label: t('admin.templates.colKind'), align: 'center' },
  { key: 'active', label: t('admin.templates.colActive'), align: 'center' },
]
const filterDefs: FilterDef[] = [
  { key: 'category', label: t('admin.templates.colCategory'), options: CATEGORIES.map(c => ({ value: c, label: catLabel(c) })) },
]

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }

// ——— بنّاء النموذج (إنشاء/تحرير) ———
const editorOpen = ref(false)
const mode = ref<'create' | 'edit'>('create')
const target = ref<AdminSurveyTemplate | null>(null)
const form = ref<{ name: string, category: string, description: string, active: boolean, questions: AdminTemplateQuestion[] }>({
  name: '', category: 'custom', description: '', active: true, questions: [],
})
const saving = ref(false)

function openCreate() {
  mode.value = 'create'
  target.value = null
  form.value = { name: '', category: 'custom', description: '', active: true, questions: [] }
  editorOpen.value = true
}
function openEdit(tpl: AdminSurveyTemplate) {
  mode.value = 'edit'
  target.value = tpl
  form.value = {
    name: tpl.name,
    category: tpl.category,
    description: tpl.description ?? '',
    active: tpl.active,
    questions: tpl.questions.map(q => ({ ...q, options: q.options ? [...q.options] : undefined })),
  }
  editorOpen.value = true
}
function addQuestion(type: SurveyQuestionType) {
  const q: AdminTemplateQuestion = { text: '', type }
  if (CHOICE_TYPES.includes(type))
    q.options = ['خيار 1', 'خيار 2']
  form.value.questions.push(q)
}
function removeQuestion(i: number) { form.value.questions.splice(i, 1) }
function moveQuestion(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= form.value.questions.length)
    return
  const arr = form.value.questions
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}
async function save() {
  saving.value = true
  const payload = {
    name: form.value.name.trim(),
    category: form.value.category,
    description: form.value.description.trim() || undefined,
    active: form.value.active,
    questions: form.value.questions.filter(q => q.text.trim()),
  }
  try {
    if (mode.value === 'create')
      await api.admin.createSurveyTemplate(payload)
    else if (target.value)
      await api.admin.updateSurveyTemplate(target.value.id, payload)
    toast(mode.value === 'create' ? t('admin.templates.created') : t('admin.toast.updated'))
    editorOpen.value = false
    refreshAll()
  }
  catch (e) { fail(e) }
  finally { saving.value = false }
}
async function remove(tpl: AdminSurveyTemplate) {
  const ok = await confirm({
    title: t('admin.templates.confirmDeleteTitle'),
    message: t('admin.templates.confirmDeleteMsg', { name: tpl.name }),
    confirmText: t('admin.templates.delete'),
    tone: 'danger',
    icon: 'mdi-delete-outline',
  })
  if (!ok)
    return
  try { await api.admin.deleteSurveyTemplate(tpl.id); toast(t('admin.toast.updated')); refreshAll() }
  catch (e) { fail(e) }
}

// ——— معاينة ———
const previewOpen = ref(false)
const preview = ref<AdminSurveyTemplate | null>(null)
function openPreview(tpl: AdminSurveyTemplate) { preview.value = tpl; previewOpen.value = true }
</script>

<template>
  <div>
    <PageHeader :title="t('admin.templates.title')" :subtitle="t('admin.templates.subtitle')" icon="mdi-file-document-multiple-outline" />

    <!-- شريط الإحصاءات -->
    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="grid grid-cols-2 gap-3 lg:col-span-2">
        <StatCard icon="mdi-file-document-multiple-outline" :value="stats?.total ?? 0" :title="t('admin.templates.statTotal')" color="primary" />
        <StatCard icon="mdi-check-decagram-outline" :value="stats?.active ?? 0" :title="t('admin.templates.statActive')" color="success" />
        <StatCard icon="mdi-shield-star-outline" :value="stats?.system ?? 0" :title="t('admin.templates.statSystem')" color="info" />
        <StatCard icon="mdi-pencil-plus-outline" :value="stats?.custom ?? 0" :title="t('admin.templates.statCustom')" color="accent" />
      </div>
      <BaseCard>
        <div class="mb-2 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.templates.byCategory') }}</h2>
        </div>
        <DonutChart v-if="stats?.distribution?.length" :data="stats.distribution.map(d => ({ label: catLabel(d.label), value: d.value }))" :size="150" :center-label="t('admin.templates.statTotal')" />
        <p v-else class="py-6 text-center text-xs text-muted">—</p>
      </BaseCard>
    </div>

    <ResourceScaffold
      :columns="columns"
      :items="items"
      :loading="loading"
      :meta="meta"
      :sort-key="sortKey"
      :search="search"
      :filters="filterDefs"
      :active-filters="filters"
      :search-placeholder="t('admin.templates.searchPlaceholder')"
      export-name="survey-templates"
      @update:sort-key="r.setSort"
      @update:search="r.setSearch"
      @filter="r.setFilter"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
    >
      <template #toolbar>
        <BaseButton variant="brand" size="sm" @click="openCreate">
          <BaseIcon name="mdi-plus" :size="18" />{{ t('admin.templates.newTemplate') }}
        </BaseButton>
      </template>

      <template #cell-name="{ row }">
        <div class="flex items-center gap-2">
          <BaseIcon :name="row.icon || 'mdi-file-document-outline'" :size="18" class="text-brand" />
          <div>
            <div class="font-medium text-content">{{ row.name }}</div>
            <div v-if="row.description" class="text-[11px] text-muted">{{ row.description }}</div>
          </div>
        </div>
      </template>
      <template #cell-category="{ row }">
        <BaseChip :color="catColor[row.category] || 'neutral'">{{ catLabel(row.category) }}</BaseChip>
      </template>
      <template #cell-is_system="{ row }">
        <BaseChip :color="row.is_system ? 'info' : 'neutral'">{{ row.is_system ? t('admin.templates.system') : t('admin.templates.custom') }}</BaseChip>
      </template>
      <template #cell-active="{ row }">
        <BaseChip :color="row.active ? 'success' : 'neutral'">{{ row.active ? t('admin.templates.statusActive') : t('admin.templates.statusInactive') }}</BaseChip>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <BaseTooltip :text="t('admin.templates.preview')">
            <button class="row-act" style="color: rgb(var(--v-theme-info))" :aria-label="t('admin.templates.preview')" @click="openPreview(row)"><BaseIcon name="mdi-eye-outline" :size="18" /></button>
          </BaseTooltip>
          <BaseTooltip :text="t('admin.templates.edit')">
            <button class="row-act text-brand" :aria-label="t('admin.templates.edit')" @click="openEdit(row)"><BaseIcon name="mdi-pencil-outline" :size="18" /></button>
          </BaseTooltip>
          <BaseTooltip v-if="!row.is_system" :text="t('admin.templates.delete')">
            <button class="row-act" style="color: rgb(var(--v-theme-error))" :aria-label="t('admin.templates.delete')" @click="remove(row)"><BaseIcon name="mdi-delete-outline" :size="18" /></button>
          </BaseTooltip>
        </div>
      </template>
    </ResourceScaffold>

    <!-- بنّاء النموذج -->
    <BaseModal v-model="editorOpen" :title="mode === 'create' ? t('admin.templates.newTemplate') : t('admin.templates.editTitle', { name: target?.name })" :max-width="680">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <BaseInput v-model="form.name" :label="t('admin.templates.fieldName')" />
          <BaseSelect v-model="form.category" :label="t('admin.templates.fieldCategory')" :items="CATEGORIES.map(c => ({ value: c, title: catLabel(c) }))" />
        </div>
        <BaseInput v-model="form.description" :label="t('admin.templates.fieldDescription')" />

        <!-- الأسئلة -->
        <div>
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-bold text-content">{{ t('admin.templates.questions') }} ({{ form.questions.length }})</span>
          </div>
          <div class="space-y-2">
            <div v-for="(q, i) in form.questions" :key="i" class="rounded-ui border-ui p-2.5">
              <div class="mb-1.5 flex items-center gap-1.5">
                <BaseChip :color="'brand'"><BaseIcon :name="qMeta(q.type).icon" :size="12" />{{ qMeta(q.type).label }}</BaseChip>
                <span class="flex-1" />
                <button class="mv" :disabled="i === 0" :aria-label="'up'" @click="moveQuestion(i, -1)"><BaseIcon name="mdi-chevron-up" :size="16" /></button>
                <button class="mv" :disabled="i === form.questions.length - 1" :aria-label="'down'" @click="moveQuestion(i, 1)"><BaseIcon name="mdi-chevron-down" :size="16" /></button>
                <button class="mv" style="color: rgb(var(--v-theme-error))" :aria-label="t('admin.templates.removeQuestion')" @click="removeQuestion(i)"><BaseIcon name="mdi-close" :size="16" /></button>
              </div>
              <BaseInput v-model="q.text" :label="t('admin.templates.questionText')" />
              <div v-if="q.options" class="mt-2">
                <BaseTagInput v-model="q.options" :label="t('admin.templates.options')" :placeholder="t('admin.templates.addOption')" />
              </div>
            </div>
            <p v-if="!form.questions.length" class="rounded-ui border border-dashed border-ui py-4 text-center text-xs text-muted">{{ t('admin.templates.noQuestions') }}</p>
          </div>

          <!-- إضافة سؤال بنوع -->
          <div class="mt-2">
            <p class="mb-1 text-[11px] text-muted">{{ t('admin.templates.addQuestionType') }}</p>
            <div class="flex flex-wrap gap-1.5">
              <button v-for="ty in TYPE_KEYS" :key="ty" class="type-pill" @click="addQuestion(ty)">
                <BaseIcon :name="QUESTION_TYPE_META[ty].icon" :size="14" />{{ QUESTION_TYPE_META[ty].label }}
              </button>
            </div>
          </div>
        </div>

        <BaseSwitch v-model="form.active" :label="t('admin.templates.fieldActive')" />
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="editorOpen = false">{{ t('admin.users.cancel') }}</BaseButton>
        <BaseButton variant="brand" :disabled="saving || !form.name.trim()" @click="save">
          <BaseIcon name="mdi-check" :size="18" />{{ mode === 'create' ? t('admin.templates.create') : t('admin.templates.save') }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- معاينة -->
    <BaseDrawer v-model="previewOpen" :width="400">
      <div v-if="preview" class="p-4">
        <div class="mb-1 flex items-center gap-2">
          <BaseIcon :name="preview.icon || 'mdi-file-document-outline'" :size="22" class="text-brand" />
          <h3 class="text-base font-bold text-content">{{ preview.name }}</h3>
        </div>
        <BaseChip :color="catColor[preview.category] || 'neutral'" class="mb-3">{{ catLabel(preview.category) }}</BaseChip>
        <ol class="space-y-2">
          <li v-for="(q, i) in preview.questions" :key="i" class="rounded-ui border-ui p-2.5">
            <div class="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
              <BaseIcon :name="qMeta(q.type).icon" :size="13" />{{ qMeta(q.type).label }}
            </div>
            <div class="text-sm text-content">{{ i + 1 }}. {{ q.text }}</div>
            <ul v-if="q.options?.length" class="mt-1 space-y-0.5 ps-4 text-xs text-muted">
              <li v-for="(o, oi) in q.options" :key="oi">• {{ o }}</li>
            </ul>
          </li>
        </ol>
      </div>
    </BaseDrawer>

    <BaseSnackbar v-model="snack.show" :color="snack.color">{{ snack.text }}</BaseSnackbar>
  </div>
</template>

<style scoped>
.row-act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}
.row-act:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.mv {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  color: rgb(var(--v-theme-on-surface));
}
.mv:hover:not(:disabled) {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.mv:disabled {
  opacity: 0.35;
}
.type-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  font-size: 0.72rem;
  color: rgb(var(--v-theme-on-surface));
  transition: all 0.15s ease;
}
.type-pill:hover {
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>

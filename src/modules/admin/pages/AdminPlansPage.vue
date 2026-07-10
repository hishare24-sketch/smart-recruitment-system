<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { confirm } from '@/components/ui/confirm'
import { type AdminPlan, type AdminPlansStats, api } from '@/services/api'

const { t } = useI18n()
const r = useAdminResource<AdminPlan>({ fetcher: params => api.admin.plans(params), initialSort: 'sort' })
const { items, meta, loading, sortKey, search } = r

// ——— الإحصاءات ———
const stats = ref<AdminPlansStats | null>(null)
async function loadStats() { try { stats.value = await api.admin.plansStats() } catch { /* تجاهل */ } }
onMounted(loadStats)
function refreshAll() { r.refresh(); loadStats() }

const columns: TableColumn[] = [
  { key: 'name', label: t('admin.plans.colName'), sortable: true },
  { key: 'key', label: t('admin.plans.colKey'), sortable: true },
  { key: 'price', label: t('admin.plans.colPrice'), sortable: true, align: 'center' },
  { key: 'survey_limit', label: t('admin.plans.colSurveyLimit'), align: 'center' },
  { key: 'features', label: t('admin.plans.colFeatures'), align: 'center' },
  { key: 'subscribers', label: t('admin.plans.colSubscribers'), align: 'center' },
  { key: 'active', label: t('admin.plans.colActive'), align: 'center' },
]

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }

// ——— نموذج إنشاء/تحرير ———
const modalOpen = ref(false)
const mode = ref<'create' | 'edit'>('edit')
const target = ref<AdminPlan | null>(null)
const form = ref({ key: '', name: '', price: 0 as number, surveyLimit: null as number | null, unlimited: false, featuresText: '', active: true })
const saving = ref(false)

function openCreate() {
  mode.value = 'create'
  target.value = null
  form.value = { key: '', name: '', price: 0, surveyLimit: null, unlimited: false, featuresText: '', active: true }
  modalOpen.value = true
}
function openEdit(p: AdminPlan) {
  mode.value = 'edit'
  target.value = p
  form.value = {
    key: p.key,
    name: p.name,
    price: p.price,
    surveyLimit: p.survey_limit,
    unlimited: p.survey_limit === null,
    featuresText: p.features.join('\n'),
    active: p.active,
  }
  modalOpen.value = true
}
async function save() {
  saving.value = true
  const payload = {
    name: form.value.name.trim(),
    price: Number(form.value.price) || 0,
    survey_limit: form.value.unlimited ? null : (Number(form.value.surveyLimit) || 0),
    features: form.value.featuresText.split('\n').map(s => s.trim()).filter(Boolean),
    active: form.value.active,
  }
  try {
    if (mode.value === 'create')
      await api.admin.createPlan({ key: form.value.key.trim(), ...payload })
    else if (target.value)
      await api.admin.updatePlan(target.value.id, payload)
    toast(mode.value === 'create' ? t('admin.plans.created') : t('admin.toast.updated'))
    modalOpen.value = false
    refreshAll()
  }
  catch (e) { fail(e) }
  finally { saving.value = false }
}
async function remove(p: AdminPlan) {
  const ok = await confirm({
    title: t('admin.plans.confirmDeleteTitle'),
    message: t('admin.plans.confirmDeleteMsg', { name: p.name }),
    confirmText: t('admin.plans.delete'),
    tone: 'danger',
    icon: 'mdi-delete-outline',
  })
  if (!ok)
    return
  try { await api.admin.deletePlan(p.id); toast(t('admin.toast.updated')); refreshAll() }
  catch (e) { fail(e) }
}

const canSave = () => form.value.name.trim() && (mode.value === 'edit' || /^[\w-]+$/.test(form.value.key.trim()))
</script>

<template>
  <div>
    <PageHeader :title="t('admin.plans.title')" :subtitle="t('admin.plans.subtitle')" icon="mdi-tag-multiple-outline" />

    <!-- شريط الإحصاءات -->
    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="grid grid-cols-2 gap-3 lg:col-span-2">
        <StatCard icon="mdi-tag-multiple-outline" :value="stats?.totalPlans ?? 0" :title="t('admin.plans.statTotal')" color="primary" />
        <StatCard icon="mdi-check-decagram-outline" :value="stats?.activePlans ?? 0" :title="t('admin.plans.statActive')" color="success" />
        <StatCard icon="mdi-account-group-outline" :value="stats?.subscribers ?? 0" :title="t('admin.plans.statSubscribers')" color="info" />
        <StatCard icon="mdi-cash-multiple" :value="`${(stats?.mrr ?? 0).toLocaleString()} ر.س`" :title="t('admin.plans.statMrr')" color="accent" />
      </div>
      <BaseCard>
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.plans.subscribersByPlan') }}</h2>
        </div>
        <DonutChart v-if="stats?.distribution?.length" :data="stats.distribution" :size="170" :center-label="t('admin.plans.statSubscribers')" />
        <p v-else class="py-8 text-center text-xs text-muted">{{ t('admin.plans.noSubscribers') }}</p>
      </BaseCard>
    </div>

    <ResourceScaffold
      :columns="columns"
      :items="items"
      :loading="loading"
      :meta="meta"
      :sort-key="sortKey"
      :search="search"
      :search-placeholder="t('admin.plans.searchPlaceholder')"
      export-name="plans"
      @update:sort-key="r.setSort"
      @update:search="r.setSearch"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
    >
      <template #toolbar>
        <BaseButton variant="brand" size="sm" @click="openCreate">
          <BaseIcon name="mdi-plus" :size="18" />{{ t('admin.plans.newPlan') }}
        </BaseButton>
      </template>

      <template #cell-price="{ row }">
        <span class="font-bold text-content">{{ row.price.toLocaleString() }} <span class="text-xs text-muted">ر.س</span></span>
      </template>
      <template #cell-survey_limit="{ row }">
        <span class="text-content">{{ row.survey_limit === null ? t('admin.plans.unlimited') : row.survey_limit }}</span>
      </template>
      <template #cell-features="{ row }">
        <span class="text-muted">{{ row.features.length }}</span>
      </template>
      <template #cell-subscribers="{ row }">
        <span class="text-content">{{ row.subscribers.toLocaleString() }}</span>
      </template>
      <template #cell-active="{ row }">
        <BaseChip :color="row.active ? 'success' : 'neutral'">{{ row.active ? t('admin.plans.statusActive') : t('admin.plans.statusInactive') }}</BaseChip>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <BaseTooltip :text="t('admin.plans.edit')">
            <button class="row-act text-brand" :aria-label="t('admin.plans.edit')" @click="openEdit(row)">
              <BaseIcon name="mdi-pencil-outline" :size="18" />
            </button>
          </BaseTooltip>
          <BaseTooltip :text="t('admin.plans.delete')">
            <button class="row-act" style="color: rgb(var(--v-theme-error))" :aria-label="t('admin.plans.delete')" @click="remove(row)">
              <BaseIcon name="mdi-delete-outline" :size="18" />
            </button>
          </BaseTooltip>
        </div>
      </template>
    </ResourceScaffold>

    <!-- إنشاء/تحرير باقة -->
    <BaseModal v-model="modalOpen" :title="mode === 'create' ? t('admin.plans.newPlan') : (target ? t('admin.plans.editTitle', { name: target.name }) : '')" :max-width="520">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <BaseInput v-model="form.name" :label="t('admin.plans.fieldName')" />
          <BaseInput v-model="form.key" :label="t('admin.plans.fieldKey')" :disabled="mode === 'edit'" placeholder="team" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <BaseInput v-model.number="form.price" :label="t('admin.plans.fieldPrice')" type="number" />
          <BaseInput v-model.number="form.surveyLimit" :label="t('admin.plans.fieldSurveyLimit')" type="number" :disabled="form.unlimited" />
        </div>
        <BaseSwitch v-model="form.unlimited" :label="t('admin.plans.unlimitedSurveys')" />

        <div>
          <label class="mb-1 block text-sm text-muted">{{ t('admin.plans.fieldFeatures') }}</label>
          <textarea
            v-model="form.featuresText"
            rows="5"
            class="w-full rounded-ui border-ui bg-surface px-3 py-2 text-sm text-content"
            :placeholder="t('admin.plans.featuresHint')"
          />
        </div>

        <BaseSwitch v-model="form.active" :label="t('admin.plans.fieldActive')" />
      </div>

      <template #actions>
        <BaseButton variant="ghost" @click="modalOpen = false">{{ t('admin.users.cancel') }}</BaseButton>
        <BaseButton variant="brand" :disabled="saving || !canSave()" @click="save">
          <BaseIcon name="mdi-check" :size="18" />{{ mode === 'create' ? t('admin.plans.create') : t('admin.plans.save') }}
        </BaseButton>
      </template>
    </BaseModal>

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
</style>

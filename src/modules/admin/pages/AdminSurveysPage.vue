<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { FilterDef } from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { confirm } from '@/components/ui/confirm'
import { type AdminSurvey, type AdminSurveysStats, api } from '@/services/api'

const { t } = useI18n()
const r = useAdminResource<AdminSurvey>({ fetcher: params => api.admin.surveys(params), initialSort: '-id' })
const { items, meta, loading, sortKey, selected, search, filters } = r

const stats = ref<AdminSurveysStats | null>(null)
async function loadStats() { try { stats.value = await api.admin.surveysStats() } catch { /* تجاهل */ } }
onMounted(loadStats)

const columns: TableColumn[] = [
  { key: 'title', label: t('admin.surveys.colTitle'), sortable: true },
  { key: 'owner', label: t('admin.surveys.colOwner') },
  { key: 'state', label: t('admin.surveys.colState'), sortable: true, align: 'center' },
  { key: 'points_pool', label: t('admin.surveys.colPoints'), sortable: true, align: 'center' },
  { key: 'responses', label: t('admin.surveys.colResponses'), align: 'center' },
  { key: 'created_at', label: t('admin.surveys.colCreated'), sortable: true },
]
const filterDefs: FilterDef[] = [
  { key: 'state', label: t('admin.surveys.filterState'), options: [
    { value: 'draft', label: 'draft' }, { value: 'active', label: 'active' }, { value: 'paused', label: 'paused' }, { value: 'closed', label: 'closed' },
  ] },
]
const stateColor: Record<string, 'neutral' | 'success' | 'warning' | 'error'> = { draft: 'neutral', active: 'success', paused: 'warning', closed: 'error' }

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }
function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleDateString() : '—' }

async function closeSurvey(s: AdminSurvey) {
  const ok = await confirm({
    title: t('admin.surveys.confirmCloseTitle'),
    message: t('admin.surveys.confirmCloseMsg', { title: s.title }),
    confirmText: t('admin.surveys.close'),
    tone: 'danger',
    icon: 'mdi-lock-outline',
  })
  if (!ok)
    return
  try { await api.admin.closeSurvey(s.id); toast(t('admin.toast.closed')); r.refresh() }
  catch (e) { fail(e) }
}
async function remove(s: AdminSurvey) {
  const ok = await confirm({
    title: t('admin.surveys.confirmDeleteTitle'),
    message: t('admin.surveys.confirmDeleteMsg', { title: s.title }),
    confirmText: t('admin.surveys.delete'),
    tone: 'danger',
    icon: 'mdi-delete-outline',
  })
  if (!ok)
    return
  try { await api.admin.deleteSurvey(s.id); toast(t('admin.toast.updated')); r.refresh() }
  catch (e) { fail(e) }
}
</script>

<template>
  <div>
    <PageHeader :title="t('admin.surveys.title')" :subtitle="t('admin.surveys.subtitle')" icon="mdi-clipboard-text-outline" />

    <!-- شريط الإحصاءات -->
    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="grid grid-cols-3 gap-3 lg:col-span-2">
        <StatCard icon="mdi-clipboard-text-outline" :value="stats?.total ?? 0" :title="t('admin.surveys.statTotal')" color="primary" />
        <StatCard icon="mdi-play-circle-outline" :value="stats?.active ?? 0" :title="t('admin.surveys.statActive')" color="success" />
        <StatCard icon="mdi-comment-check-outline" :value="stats?.responses ?? 0" :title="t('admin.surveys.statResponses')" color="info" />
      </div>
      <BaseCard>
        <div class="mb-2 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.surveys.byState') }}</h2>
        </div>
        <DonutChart v-if="stats?.distribution?.length" :data="stats.distribution" :size="150" :center-label="t('admin.surveys.statTotal')" />
        <p v-else class="py-6 text-center text-xs text-muted">—</p>
      </BaseCard>
    </div>

    <ResourceScaffold
      :columns="columns"
      :items="items"
      :loading="loading"
      :meta="meta"
      :sort-key="sortKey"
      :selected="selected"
      :search="search"
      :filters="filterDefs"
      :active-filters="filters"
      :search-placeholder="t('admin.surveys.searchPlaceholder')"
      export-name="surveys"
      @update:sort-key="r.setSort"
      @update:search="r.setSearch"
      @filter="r.setFilter"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
    >
      <template #cell-state="{ row }">
        <BaseChip :color="stateColor[row.state] || 'neutral'">{{ row.state }}</BaseChip>
      </template>
      <template #cell-owner="{ row }">
        <span class="text-content">{{ row.owner ?? '—' }}</span>
      </template>
      <template #cell-created_at="{ row }">
        <span class="text-muted">{{ fmtDate(row.createdAt) }}</span>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <BaseTooltip v-if="row.state !== 'closed'" :text="t('admin.surveys.close')">
            <button class="row-act" style="color: rgb(var(--v-theme-warning))" :aria-label="t('admin.surveys.close')" @click="closeSurvey(row)">
              <BaseIcon name="mdi-lock-outline" :size="18" />
            </button>
          </BaseTooltip>
          <BaseTooltip :text="t('admin.surveys.delete')">
            <button class="row-act" style="color: rgb(var(--v-theme-error))" :aria-label="t('admin.surveys.delete')" @click="remove(row)">
              <BaseIcon name="mdi-delete-outline" :size="18" />
            </button>
          </BaseTooltip>
        </div>
      </template>
    </ResourceScaffold>

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

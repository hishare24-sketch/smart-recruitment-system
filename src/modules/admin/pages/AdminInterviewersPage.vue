<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { FilterDef } from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { confirm } from '@/components/ui/confirm'
import { type AdminInterviewer, api } from '@/services/api'

const { t } = useI18n()
const r = useAdminResource<AdminInterviewer>({ fetcher: params => api.admin.interviewers(params), initialSort: '-rating' })
const { items, meta, loading, sortKey, selected, search, filters } = r

const columns: TableColumn[] = [
  { key: 'name', label: t('admin.interviewers.colName'), sortable: true },
  { key: 'specialty', label: t('admin.interviewers.colSpecialty'), sortable: true },
  { key: 'account', label: t('admin.interviewers.colAccount') },
  { key: 'status', label: t('admin.interviewers.colStatus'), sortable: true, align: 'center' },
  { key: 'rating', label: t('admin.interviewers.colRating'), sortable: true, align: 'center' },
  { key: 'price_from', label: t('admin.interviewers.colPrice'), sortable: true, align: 'center' },
]
const filterDefs: FilterDef[] = [
  { key: 'status', label: t('admin.interviewers.filterStatus'), options: [
    { value: 'pending', label: t('admin.interviewers.statusPending') },
    { value: 'approved', label: t('admin.interviewers.statusApproved') },
    { value: 'rejected', label: t('admin.interviewers.statusRejected') },
  ] },
]
const statusColor: Record<string, 'neutral' | 'success' | 'warning' | 'error'> = { pending: 'warning', approved: 'success', rejected: 'error' }
const statusLabel: Record<string, string> = {
  pending: t('admin.interviewers.statusPending'),
  approved: t('admin.interviewers.statusApproved'),
  rejected: t('admin.interviewers.statusRejected'),
}

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }

async function approve(i: AdminInterviewer) {
  try { await api.admin.approveInterviewer(i.id); toast(t('admin.toast.approved')); r.refresh() }
  catch (e) { fail(e) }
}
async function reject(i: AdminInterviewer) {
  const ok = await confirm({
    title: t('admin.interviewers.confirmRejectTitle'),
    message: t('admin.interviewers.confirmRejectMsg', { name: i.name }),
    confirmText: t('admin.interviewers.reject'),
    tone: 'danger',
    icon: 'mdi-close-circle-outline',
  })
  if (!ok)
    return
  try { await api.admin.rejectInterviewer(i.id); toast(t('admin.toast.rejected')); r.refresh() }
  catch (e) { fail(e) }
}
async function remove(i: AdminInterviewer) {
  const ok = await confirm({
    title: t('admin.interviewers.confirmDeleteTitle'),
    message: t('admin.interviewers.confirmDeleteMsg', { name: i.name }),
    confirmText: t('admin.interviewers.delete'),
    tone: 'danger',
    icon: 'mdi-delete-outline',
  })
  if (!ok)
    return
  try { await api.admin.deleteInterviewer(i.id); toast(t('admin.toast.updated')); r.refresh() }
  catch (e) { fail(e) }
}
</script>

<template>
  <div>
    <PageHeader :title="t('admin.interviewers.title')" :subtitle="t('admin.interviewers.subtitle')" icon="mdi-account-tie-outline" />

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
      :search-placeholder="t('admin.interviewers.searchPlaceholder')"
      export-name="interviewers"
      @update:sort-key="r.setSort"
      @update:search="r.setSearch"
      @filter="r.setFilter"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
    >
      <template #cell-status="{ row }">
        <BaseChip :color="statusColor[row.status] || 'neutral'">{{ statusLabel[row.status] || row.status }}</BaseChip>
      </template>
      <template #cell-account="{ row }">
        <span class="text-content">{{ row.account ?? '—' }}</span>
      </template>
      <template #cell-rating="{ row }">
        <span class="text-content">{{ row.rating.toFixed(1) }}</span>
      </template>
      <template #cell-price_from="{ row }">
        <span class="text-muted">{{ row.price_from }}</span>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <BaseTooltip v-if="row.status !== 'approved'" :text="t('admin.interviewers.approve')">
            <button class="row-act" style="color: rgb(var(--v-theme-success))" :aria-label="t('admin.interviewers.approve')" @click="approve(row)">
              <BaseIcon name="mdi-check-circle-outline" :size="18" />
            </button>
          </BaseTooltip>
          <BaseTooltip v-if="row.status !== 'rejected'" :text="t('admin.interviewers.reject')">
            <button class="row-act" style="color: rgb(var(--v-theme-warning))" :aria-label="t('admin.interviewers.reject')" @click="reject(row)">
              <BaseIcon name="mdi-close-circle-outline" :size="18" />
            </button>
          </BaseTooltip>
          <BaseTooltip :text="t('admin.interviewers.delete')">
            <button class="row-act" style="color: rgb(var(--v-theme-error))" :aria-label="t('admin.interviewers.delete')" @click="remove(row)">
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

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
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { FilterDef } from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { confirm } from '@/components/ui/confirm'
import { type AdminInterviewer, type AdminInterviewersStats, api } from '@/services/api'

const { t } = useI18n()
const r = useAdminResource<AdminInterviewer>({ fetcher: params => api.admin.interviewers(params), initialSort: '-rating' })
const { items, meta, loading, sortKey, selected, search, filters } = r

const stats = ref<AdminInterviewersStats | null>(null)
async function loadStats() { try { stats.value = await api.admin.interviewersStats() } catch { /* تجاهل */ } }
onMounted(loadStats)
function refreshAll() { r.refresh(); loadStats() }

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
  try { await api.admin.approveInterviewer(i.id); toast(t('admin.toast.approved')); refreshAll() }
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
  try { await api.admin.rejectInterviewer(i.id); toast(t('admin.toast.rejected')); refreshAll() }
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
  try { await api.admin.deleteInterviewer(i.id); toast(t('admin.toast.updated')); refreshAll() }
  catch (e) { fail(e) }
}

// ——— إنشاء مقيّم ———
const createOpen = ref(false)
const creating = ref(false)
const cform = ref({ name: '', specialty: 'tech', status: 'approved', rating: 4.5 as number, price_from: 200 as number })
function openCreate() { cform.value = { name: '', specialty: 'tech', status: 'approved', rating: 4.5, price_from: 200 }; createOpen.value = true }
async function createInterviewer() {
  if (!cform.value.name.trim() || !cform.value.specialty.trim())
    return
  creating.value = true
  try {
    await api.admin.createInterviewer({ ...cform.value, rating: Number(cform.value.rating) || 0, price_from: Number(cform.value.price_from) || 0 })
    toast(t('admin.interviewers.created'))
    createOpen.value = false
    refreshAll()
  }
  catch (e) { fail(e) }
  finally { creating.value = false }
}
</script>

<template>
  <div>
    <PageHeader :title="t('admin.interviewers.title')" :subtitle="t('admin.interviewers.subtitle')" icon="mdi-account-tie-outline">
      <template #actions>
        <BaseButton variant="brand" size="sm" @click="openCreate">
          <BaseIcon name="mdi-account-plus-outline" :size="18" />{{ t('admin.interviewers.newInterviewer') }}
        </BaseButton>
      </template>
    </PageHeader>

    <!-- شريط الإحصاءات -->
    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="grid grid-cols-2 gap-3 lg:col-span-2">
        <StatCard icon="mdi-account-tie-outline" :value="stats?.total ?? 0" :title="t('admin.interviewers.statTotal')" color="primary" />
        <StatCard icon="mdi-check-decagram-outline" :value="stats?.approved ?? 0" :title="t('admin.interviewers.statApproved')" color="success" />
        <StatCard icon="mdi-clock-alert-outline" :value="stats?.pending ?? 0" :title="t('admin.interviewers.statPending')" color="warning" />
        <StatCard icon="mdi-star-outline" :value="stats?.avgRating ?? 0" :title="t('admin.interviewers.statRating')" color="accent" />
      </div>
      <BaseCard>
        <div class="mb-2 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.interviewers.byStatus') }}</h2>
        </div>
        <DonutChart v-if="stats?.byStatus?.length" :data="stats.byStatus.map(s => ({ label: statusLabel[s.label] || s.label, value: s.value }))" :size="150" :center-label="t('admin.interviewers.statTotal')" />
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

    <!-- إنشاء مقيّم -->
    <BaseModal v-model="createOpen" :title="t('admin.interviewers.newInterviewer')" :max-width="460">
      <div class="space-y-3">
        <BaseInput v-model="cform.name" :label="t('admin.interviewers.colName')" />
        <div class="grid grid-cols-2 gap-3">
          <BaseInput v-model="cform.specialty" :label="t('admin.interviewers.colSpecialty')" />
          <BaseSelect
            v-model="cform.status"
            :label="t('admin.interviewers.colStatus')"
            :items="[{ value: 'approved', title: t('admin.interviewers.statusApproved') }, { value: 'pending', title: t('admin.interviewers.statusPending') }, { value: 'rejected', title: t('admin.interviewers.statusRejected') }]"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <BaseInput v-model.number="cform.rating" :label="t('admin.interviewers.colRating')" type="number" />
          <BaseInput v-model.number="cform.price_from" :label="t('admin.interviewers.colPrice')" type="number" />
        </div>
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="createOpen = false">{{ t('admin.users.cancel') }}</BaseButton>
        <BaseButton variant="brand" :disabled="creating || !cform.name.trim()" @click="createInterviewer">
          <BaseIcon name="mdi-check" :size="18" />{{ t('admin.interviewers.create') }}
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

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import LineChart from '@/components/charts/LineChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { FilterDef } from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { confirm } from '@/components/ui/confirm'
import { type AdminUser, type AdminUserDetail, type AdminUserPatch, type AdminUsersStats, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'
import type { UserRole } from '@/interfaces/Auth'

const { t } = useI18n()
const auth = useAuthStore()
const canCreate = computed(() => auth.hasPermission('create_users'))

const r = useAdminResource<AdminUser>({ fetcher: params => api.admin.users(params), initialSort: '-id' })
const { items, meta, loading, sortKey, selected, search, filters } = r

const stats = ref<AdminUsersStats | null>(null)
async function loadStats() { try { stats.value = await api.admin.usersStats() } catch { /* تجاهل */ } }
onMounted(loadStats)
const signupData = computed(() => (stats.value?.series ?? []).map(s => ({ label: s.date.slice(5), value: s.value })))
const roleDist = computed(() => (stats.value?.byRole ?? []).map(x => ({ label: t(`roles.${x.label}`), value: x.value })))

const columns: TableColumn[] = [
  { key: 'name', label: t('admin.users.colName'), sortable: true },
  { key: 'email', label: t('admin.users.colEmail'), sortable: true },
  { key: 'role', label: t('admin.users.colRole'), sortable: true },
  { key: 'tier', label: t('admin.users.colTier'), sortable: true, align: 'center' },
  { key: 'status', label: t('admin.users.colStatus'), sortable: true, align: 'center' },
  { key: 'adminRoles', label: t('admin.users.colAdmin') },
  { key: 'created_at', label: t('admin.users.colCreated'), sortable: true },
]

const ROLE_OPTIONS: UserRole[] = ['seeker', 'company', 'interviewer', 'coach', 'trainer', 'consultant', 'endorser', 'content_reviewer', 'community_guide', 'admin']
const filterDefs: FilterDef[] = [
  { key: 'role', label: t('admin.users.filterRole'), options: ROLE_OPTIONS.map(role => ({ value: role, label: t(`roles.${role}`) })) },
  { key: 'tier', label: t('admin.users.filterTier'), options: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }, { value: 'elite', label: 'Elite' }] },
  { key: 'kind', label: t('admin.users.filterKind'), options: [{ value: 'individual', label: t('admin.users.individual') }, { value: 'organization', label: t('admin.users.organization') }] },
  { key: 'status', label: t('admin.users.filterStatus'), options: [{ value: 'active', label: t('admin.users.active') }, { value: 'suspended', label: t('admin.users.suspended') }] },
]

const tierColor: Record<string, 'neutral' | 'info' | 'accent'> = { free: 'neutral', pro: 'info', elite: 'accent' }
const ADMIN_ROLE_OPTIONS = [
  { value: '', title: t('admin.users.none') },
  { value: 'super_admin', title: 'super_admin' },
  { value: 'admin', title: 'admin' },
  { value: 'governance', title: 'governance' },
]

function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleDateString() : '—' }
const selfId = computed(() => auth.authUser?.id)

// ——— تغذية راجعة ———
const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }

// ——— استعراض عميق (النقر على صفّ) ———
const detailOpen = ref(false)
const detail = ref<AdminUserDetail | null>(null)
const detailLoading = ref(false)
async function openDetail(u: AdminUser) {
  detailOpen.value = true
  detail.value = null
  detailLoading.value = true
  try {
    detail.value = await api.admin.user(u.id)
  }
  catch (e) { fail(e) }
  finally { detailLoading.value = false }
}

// ——— تعليق / تفعيل ———
async function toggleSuspend(u: AdminUser) {
  if (u.status === 'active') {
    const ok = await confirm({
      title: t('admin.users.confirmSuspendTitle'),
      message: t('admin.users.confirmSuspendMsg', { name: u.name }),
      confirmText: t('admin.users.suspend'),
      tone: 'danger',
      icon: 'mdi-account-cancel-outline',
    })
    if (!ok)
      return
    try { await api.admin.suspendUser(u.id); toast(t('admin.toast.suspended')); detailOpen.value = false; r.refresh() }
    catch (e) { fail(e) }
  }
  else {
    try { await api.admin.activateUser(u.id); toast(t('admin.toast.activated')); detailOpen.value = false; r.refresh() }
    catch (e) { fail(e) }
  }
}

async function bulkStatus(suspend: boolean) {
  const ids = [...selected.value] as number[]
  try {
    await Promise.all(ids.map(id => suspend ? api.admin.suspendUser(id) : api.admin.activateUser(id)))
    toast(suspend ? t('admin.toast.suspended') : t('admin.toast.activated'))
    r.clearSelection()
    r.refresh()
  }
  catch (e) { fail(e) }
}

// ——— درج التعديل ———
const editOpen = ref(false)
const editing = ref<AdminUser | null>(null)
const form = ref<AdminUserPatch>({})
const formAdminRole = ref<string>('')
function openEdit(u: AdminUser) {
  editing.value = u
  form.value = { name: u.name, email: u.email, tier: u.tier, kind: u.kind }
  formAdminRole.value = u.adminRoles[0] ?? ''
  detailOpen.value = false
  editOpen.value = true
}
async function saveEdit() {
  if (!editing.value)
    return
  const id = editing.value.id
  try {
    await api.admin.updateUser(id, form.value)
    if ((editing.value.adminRoles[0] ?? '') !== formAdminRole.value)
      await api.admin.setAdminRole(id, formAdminRole.value || null)
    toast(t('admin.toast.updated'))
    editOpen.value = false
    r.refresh()
  }
  catch (e) { fail(e) }
}

// ——— إنشاء مستخدم ———
const createOpen = ref(false)
const creating = ref(false)
const cform = ref({ name: '', email: '', password: '', role: 'seeker', tier: 'free', kind: 'individual' })
function openCreate() {
  cform.value = { name: '', email: '', password: '', role: 'seeker', tier: 'free', kind: 'individual' }
  createOpen.value = true
}
async function createUser() {
  if (!cform.value.name.trim() || !cform.value.email.trim() || cform.value.password.length < 6)
    return
  creating.value = true
  try {
    await api.admin.createUser({ ...cform.value })
    toast(t('admin.users.created'))
    createOpen.value = false
    r.refresh(); loadStats()
  }
  catch (e) { fail(e) }
  finally { creating.value = false }
}
</script>

<template>
  <div>
    <PageHeader :title="t('admin.users.title')" :subtitle="t('admin.users.subtitle')" icon="mdi-account-multiple-outline">
      <template #actions>
        <BaseButton v-if="canCreate" variant="brand" size="sm" @click="openCreate">
          <BaseIcon name="mdi-account-plus-outline" :size="18" />{{ t('admin.users.newUser') }}
        </BaseButton>
      </template>
    </PageHeader>

    <!-- شريط الإحصاءات -->
    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="grid grid-cols-2 gap-3">
        <StatCard icon="mdi-account-multiple" :value="stats?.total ?? 0" :title="t('admin.users.statTotal')" color="primary" />
        <StatCard icon="mdi-account-cancel-outline" :value="stats?.suspended ?? 0" :title="t('admin.users.statSuspended')" color="error" />
        <StatCard icon="mdi-office-building-outline" :value="stats?.organizations ?? 0" :title="t('admin.users.statOrgs')" color="info" />
        <StatCard icon="mdi-shield-account-outline" :value="stats?.admins ?? 0" :title="t('admin.users.statAdmins')" color="accent" />
      </div>
      <BaseCard class="lg:col-span-2">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <div class="mb-2 flex items-center gap-2">
              <BaseIcon name="mdi-chart-line" :size="18" class="text-brand" />
              <h2 class="text-sm font-bold text-content">{{ t('admin.users.signups') }}</h2>
            </div>
            <LineChart v-if="signupData.length" :data="signupData" color="primary" :height="150" />
          </div>
          <div>
            <div class="mb-2 flex items-center gap-2">
              <BaseIcon name="mdi-chart-donut" :size="18" class="text-brand" />
              <h2 class="text-sm font-bold text-content">{{ t('admin.users.byRole') }}</h2>
            </div>
            <DonutChart v-if="roleDist.length" :data="roleDist" :size="140" :center-label="t('admin.users.statTotal')" />
          </div>
        </div>
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
      :search-placeholder="t('admin.users.searchPlaceholder')"
      selectable
      inspectable
      export-name="users"
      @update:sort-key="r.setSort"
      @update:selected="v => (selected = v)"
      @update:search="r.setSearch"
      @filter="r.setFilter"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
      @row-click="openDetail"
    >
      <template #cell-tier="{ row }">
        <BaseChip :color="tierColor[row.tier] || 'neutral'">{{ row.tier }}</BaseChip>
      </template>
      <template #cell-status="{ row }">
        <BaseChip :color="row.status === 'suspended' ? 'error' : 'success'">
          {{ row.status === 'suspended' ? t('admin.users.suspended') : t('admin.users.active') }}
        </BaseChip>
      </template>
      <template #cell-adminRoles="{ row }">
        <span v-if="!row.adminRoles.length" class="text-muted">{{ t('admin.users.none') }}</span>
        <BaseChip v-for="ar in row.adminRoles" v-else :key="ar" color="brand" class="me-1">{{ ar }}</BaseChip>
      </template>
      <template #cell-created_at="{ row }">
        <span class="text-muted">{{ fmtDate(row.createdAt) }}</span>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <BaseTooltip :text="t('admin.users.edit')">
            <button class="row-act" :aria-label="t('admin.users.edit')" @click="openEdit(row)">
              <BaseIcon name="mdi-pencil-outline" :size="18" />
            </button>
          </BaseTooltip>
          <BaseTooltip :text="row.status === 'active' ? t('admin.users.suspend') : t('admin.users.activate')">
            <button
              class="row-act"
              :disabled="row.id === selfId"
              :style="row.status === 'active' ? 'color: rgb(var(--v-theme-error))' : 'color: rgb(var(--v-theme-success))'"
              :aria-label="row.status === 'active' ? t('admin.users.suspend') : t('admin.users.activate')"
              @click="toggleSuspend(row)"
            >
              <BaseIcon :name="row.status === 'active' ? 'mdi-account-cancel-outline' : 'mdi-account-check-outline'" :size="18" />
            </button>
          </BaseTooltip>
        </div>
      </template>

      <template #bulk>
        <BaseButton size="sm" variant="ghost" @click="bulkStatus(false)">
          <BaseIcon name="mdi-account-check-outline" :size="16" style="color: rgb(var(--v-theme-success))" />{{ t('admin.users.bulkActivate') }}
        </BaseButton>
        <BaseButton size="sm" variant="ghost" @click="bulkStatus(true)">
          <BaseIcon name="mdi-account-cancel-outline" :size="16" style="color: rgb(var(--v-theme-error))" />{{ t('admin.users.bulkSuspend') }}
        </BaseButton>
      </template>
    </ResourceScaffold>

    <!-- ===== درج الاستعراض العميق ===== -->
    <BaseDrawer v-model="detailOpen" :width="440" side="end">
      <div class="flex h-full flex-col">
        <div class="flex items-center gap-2 border-b border-ui p-4">
          <BaseIcon name="mdi-account-details-outline" :size="22" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.users.detailTitle') }}</h2>
        </div>

        <div v-if="detailLoading" class="flex flex-1 items-center justify-center">
          <BaseIcon name="mdi-loading" :size="28" class="animate-spin text-brand" />
        </div>

        <div v-else-if="detail" class="flex-1 space-y-4 overflow-y-auto p-4">
          <!-- الهويّة -->
          <div class="flex items-center gap-3">
            <BaseAvatar :color="detail.status === 'suspended' ? 'error' : 'emerald'" :size="52">
              {{ detail.name.trim().charAt(0) }}
            </BaseAvatar>
            <div class="min-w-0">
              <div class="truncate text-lg font-bold text-content">{{ detail.name }}</div>
              <div class="truncate text-sm text-muted" dir="ltr">{{ detail.email }}</div>
            </div>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <BaseChip color="neutral">{{ t(`roles.${detail.role}`) }}</BaseChip>
            <BaseChip :color="tierColor[detail.tier] || 'neutral'">{{ detail.tier }}</BaseChip>
            <BaseChip :color="detail.status === 'suspended' ? 'error' : 'success'">{{ detail.status === 'suspended' ? t('admin.users.suspended') : t('admin.users.active') }}</BaseChip>
            <BaseChip v-for="ar in detail.adminRoles" :key="ar" color="brand">{{ ar }}</BaseChip>
          </div>

          <!-- الحقول -->
          <dl class="space-y-1.5 text-sm">
            <div class="flex justify-between gap-2">
              <dt class="text-muted">{{ t('admin.users.uuid') }}</dt>
              <dd class="truncate font-mono text-xs text-content" dir="ltr">{{ detail.uuid }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-muted">{{ t('admin.users.filterKind') }}</dt>
              <dd class="text-content">{{ detail.kind === 'organization' ? t('admin.users.organization') : t('admin.users.individual') }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-muted">{{ t('admin.users.joined') }}</dt>
              <dd class="text-content">{{ fmtDate(detail.createdAt) }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-muted">{{ t('admin.users.wallet') }}</dt>
              <dd class="font-bold text-content">{{ detail.wallet.toLocaleString() }} <span class="text-xs text-muted">ر.س</span></dd>
            </div>
          </dl>

          <!-- النشاط -->
          <div>
            <div class="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{{ t('admin.users.activity') }}</div>
            <div class="grid grid-cols-3 gap-2">
              <div v-for="s in [
                { label: t('admin.users.statOpportunities'), value: detail.stats.opportunities, icon: 'mdi-briefcase-outline' },
                { label: t('admin.users.statApplications'), value: detail.stats.applications, icon: 'mdi-file-send-outline' },
                { label: t('admin.users.statSurveys'), value: detail.stats.surveys, icon: 'mdi-clipboard-text-outline' },
              ]" :key="s.label" class="rounded-ui border-ui p-2.5 text-center">
                <BaseIcon :name="s.icon" :size="18" class="mb-1 text-brand" />
                <div class="text-lg font-bold text-content">{{ s.value }}</div>
                <div class="text-[11px] text-muted">{{ s.label }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- إجراءات -->
        <div v-if="detail" class="flex flex-wrap justify-end gap-2 border-t border-ui p-4">
          <BaseButton
            variant="ghost"
            :disabled="detail.id === selfId"
            @click="toggleSuspend(detail)"
          >
            <BaseIcon
              :name="detail.status === 'active' ? 'mdi-account-cancel-outline' : 'mdi-account-check-outline'"
              :size="18"
              :style="detail.status === 'active' ? 'color: rgb(var(--v-theme-error))' : 'color: rgb(var(--v-theme-success))'"
            />
            {{ detail.status === 'active' ? t('admin.users.suspend') : t('admin.users.activate') }}
          </BaseButton>
          <BaseButton variant="brand" @click="openEdit(detail)">
            <BaseIcon name="mdi-pencil-outline" :size="18" />{{ t('admin.users.edit') }}
          </BaseButton>
        </div>
      </div>
    </BaseDrawer>

    <!-- ===== درج التعديل ===== -->
    <BaseDrawer v-model="editOpen" :width="420" side="end">
      <div v-if="editing" class="flex h-full flex-col">
        <div class="flex items-center gap-2 border-b border-ui p-4">
          <BaseIcon name="mdi-account-edit-outline" :size="22" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.users.editTitle') }}</h2>
        </div>
        <div class="flex-1 space-y-3 overflow-y-auto p-4">
          <BaseInput v-model="form.name" :label="t('admin.users.colName')" />
          <BaseInput v-model="form.email" :label="t('admin.users.colEmail')" type="email" dir="ltr" />
          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="mb-1 text-xs text-muted">{{ t('admin.users.colTier') }}</p>
              <BaseSelect
                :model-value="form.tier"
                :items="[{ value: 'free', title: 'Free' }, { value: 'pro', title: 'Pro' }, { value: 'elite', title: 'Elite' }]"
                @update:model-value="v => (form.tier = v as AdminUserPatch['tier'])"
              />
            </div>
            <div>
              <p class="mb-1 text-xs text-muted">{{ t('admin.users.filterKind') }}</p>
              <BaseSelect
                :model-value="form.kind"
                :items="[{ value: 'individual', title: t('admin.users.individual') }, { value: 'organization', title: t('admin.users.organization') }]"
                @update:model-value="v => (form.kind = v as AdminUserPatch['kind'])"
              />
            </div>
          </div>
          <div>
            <p class="mb-1 text-xs text-muted">{{ t('admin.users.adminRole') }}</p>
            <BaseSelect v-model="formAdminRole" :items="ADMIN_ROLE_OPTIONS" />
          </div>
        </div>
        <div class="flex justify-end gap-2 border-t border-ui p-4">
          <BaseButton variant="ghost" @click="editOpen = false">{{ t('admin.users.cancel') }}</BaseButton>
          <BaseButton variant="brand" @click="saveEdit"><BaseIcon name="mdi-content-save-outline" :size="18" />{{ t('admin.users.save') }}</BaseButton>
        </div>
      </div>
    </BaseDrawer>

    <!-- ===== إنشاء مستخدم ===== -->
    <BaseModal v-model="createOpen" :title="t('admin.users.newUser')" :max-width="480">
      <div class="space-y-3">
        <BaseInput v-model="cform.name" :label="t('admin.users.colName')" />
        <BaseInput v-model="cform.email" :label="t('admin.users.colEmail')" type="email" dir="ltr" />
        <BaseInput v-model="cform.password" :label="t('admin.users.password')" type="password" dir="ltr" />
        <div class="grid grid-cols-3 gap-3">
          <BaseSelect v-model="cform.role" :label="t('admin.users.colRole')" :items="ROLE_OPTIONS.map(ro => ({ value: ro, title: t(`roles.${ro}`) }))" />
          <BaseSelect v-model="cform.tier" :label="t('admin.users.colTier')" :items="[{ value: 'free', title: 'Free' }, { value: 'pro', title: 'Pro' }, { value: 'elite', title: 'Elite' }]" />
          <BaseSelect v-model="cform.kind" :label="t('admin.users.filterKind')" :items="[{ value: 'individual', title: t('admin.users.individual') }, { value: 'organization', title: t('admin.users.organization') }]" />
        </div>
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="createOpen = false">{{ t('admin.users.cancel') }}</BaseButton>
        <BaseButton variant="brand" :disabled="creating || !cform.name.trim() || !cform.email.trim() || cform.password.length < 6" @click="createUser">
          <BaseIcon name="mdi-check" :size="18" />{{ t('admin.users.create') }}
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
  color: rgba(var(--v-theme-on-surface), 0.7);
  transition: background-color 0.15s ease;
}
.row-act:hover:not(:disabled) {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.row-act:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>

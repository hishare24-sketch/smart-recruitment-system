<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import {
  type AdverseImpact, type ComplianceFunnel, type ComplianceOverview, type ComplianceAuditRow, api,
} from '@/services/api'

const { t } = useI18n()

const overview = ref<ComplianceOverview | null>(null)
const impact = ref<AdverseImpact | null>(null)
const funnel = ref<ComplianceFunnel | null>(null)
const audit = ref<ComplianceAuditRow[]>([])
const dimension = ref<'category' | 'tier' | 'kind'>('category')

const dimOptions = computed(() => (['category', 'tier', 'kind'] as const).map(d => ({ value: d, title: t(`admin.compliance.dim_${d}`) })))
const dimLabel = (d: string) => t(`admin.compliance.dim_${d}`)

async function loadDimension() {
  try { [impact.value, funnel.value] = await Promise.all([api.admin.complianceAdverseImpact(dimension.value), api.admin.complianceFunnel(dimension.value)]) }
  catch { /* تجاهل */ }
}
onMounted(async () => {
  try { overview.value = await api.admin.complianceOverview() } catch { /* تجاهل */ }
  try { audit.value = await api.admin.complianceAuditTrail() } catch { /* تجاهل */ }
  loadDimension()
})
watch(dimension, loadDimension)

const rateColor = (n: number) => (n >= 50 ? 'var(--v-theme-success)' : n >= 25 ? 'var(--v-theme-warning)' : 'var(--v-theme-error)')
function ratioChip(g: { impactRatio: number | null, adverse: boolean, smallSample: boolean }): 'error' | 'warning' | 'success' | 'neutral' {
  if (g.smallSample)
    return 'neutral'
  if (g.adverse)
    return 'error'
  if (g.impactRatio !== null && g.impactRatio < 0.9)
    return 'warning'
  return 'success'
}
const ai = computed(() => overview.value?.aiOversight ?? null)
const statusColor = (s: number | null) => (!s ? 'neutral' : s >= 400 ? 'error' : 'success')
function fmtTime(iso: string | null) { return iso ? new Date(iso).toLocaleString() : '—' }
</script>

<template>
  <div>
    <PageHeader :title="t('admin.compliance.title')" :subtitle="t('admin.compliance.subtitle')" icon="mdi-scale-balance" />

    <!-- لافتة الحكم -->
    <div
      class="mb-5 flex items-center gap-3 rounded-ui border-s-4 p-4"
      :style="{ background: overview?.compliant ? 'rgba(var(--v-theme-success),0.1)' : 'rgba(var(--v-theme-warning),0.12)', borderColor: overview?.compliant ? 'rgb(var(--v-theme-success))' : 'rgb(var(--v-theme-warning))' }"
    >
      <BaseIcon :name="overview?.compliant ? 'mdi-shield-check' : 'mdi-shield-alert'" :size="26" :style="{ color: overview?.compliant ? 'rgb(var(--v-theme-success))' : 'rgb(var(--v-theme-warning))' }" />
      <div>
        <div class="font-bold text-content">{{ overview?.compliant ? t('admin.compliance.verdictOk') : t('admin.compliance.verdictFlag', { count: overview?.adverseFlags ?? 0 }) }}</div>
        <div class="text-xs text-muted">{{ t('admin.compliance.fourFifths') }}</div>
      </div>
    </div>

    <!-- الإحصاءات -->
    <div class="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard icon="mdi-account-multiple-outline" :value="overview?.totals.applicants ?? 0" :title="t('admin.compliance.statApplicants')" color="primary" />
      <StatCard icon="mdi-check-decagram-outline" :value="overview?.totals.hired ?? 0" :title="t('admin.compliance.statHired')" color="success" />
      <StatCard icon="mdi-percent-outline" :value="`${overview?.totals.hireRate ?? 0}%`" :title="t('admin.compliance.statHireRate')" color="info" />
      <StatCard icon="mdi-shield-alert-outline" :value="overview?.adverseFlags ?? 0" :title="t('admin.compliance.statFlags')" color="warning" />
    </div>

    <!-- مبدّل البُعد -->
    <div class="mb-4 flex items-center gap-2">
      <span class="text-sm font-medium text-content">{{ t('admin.compliance.groupBy') }}</span>
      <BaseSelect v-model="dimension" :items="dimOptions" class="w-48" />
    </div>

    <!-- الأثر التمييزيّ -->
    <BaseCard class="mb-5">
      <div class="mb-3 flex items-center gap-2">
        <BaseIcon name="mdi-scale-unbalanced" :size="18" class="text-brand" />
        <h2 class="text-sm font-bold text-content">{{ t('admin.compliance.adverseTitle') }} · {{ dimLabel(dimension) }}</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-xs text-muted">
            <tr class="border-b border-ui">
              <th class="py-2 text-start font-medium">{{ dimLabel(dimension) }}</th>
              <th class="py-2 text-center font-medium">{{ t('admin.compliance.colApplicants') }}</th>
              <th class="py-2 text-center font-medium">{{ t('admin.compliance.colHired') }}</th>
              <th class="py-2 text-start font-medium">{{ t('admin.compliance.colSelectionRate') }}</th>
              <th class="py-2 text-center font-medium">{{ t('admin.compliance.colImpactRatio') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in impact?.groups ?? []" :key="g.group" class="border-b border-ui/50">
              <td class="py-2 font-medium text-content">{{ g.group }}</td>
              <td class="py-2 text-center text-muted">{{ g.applicants }}</td>
              <td class="py-2 text-center text-content">{{ g.hired }}</td>
              <td class="py-2">
                <div class="flex items-center gap-2">
                  <div class="h-1.5 w-24 overflow-hidden rounded-full bg-ui">
                    <div class="h-full rounded-full" :style="{ width: `${g.selectionRate}%`, background: `rgb(${rateColor(g.selectionRate)})` }" />
                  </div>
                  <span class="font-mono text-xs text-content">{{ g.selectionRate }}%</span>
                </div>
              </td>
              <td class="py-2 text-center">
                <BaseChip :color="ratioChip(g)">
                  <BaseIcon v-if="g.adverse" name="mdi-alert" :size="12" />
                  {{ g.impactRatio ?? '—' }}<span v-if="g.smallSample"> · {{ t('admin.compliance.smallSample') }}</span>
                </BaseChip>
              </td>
            </tr>
            <tr v-if="!(impact?.groups?.length)"><td colspan="5" class="py-4 text-center text-xs text-muted">—</td></tr>
          </tbody>
        </table>
      </div>
      <p class="mt-2 text-[11px] text-muted">{{ t('admin.compliance.adverseNote') }}</p>
    </BaseCard>

    <!-- القمع + التمثيل -->
    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <BaseCard class="lg:col-span-2">
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-filter-variant" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.compliance.funnelTitle') }}</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-xs text-muted">
              <tr class="border-b border-ui">
                <th class="py-2 text-start font-medium">{{ dimLabel(dimension) }}</th>
                <th v-for="s in funnel?.stages ?? []" :key="s" class="py-2 text-center font-medium">{{ t(`admin.compliance.stage_${s}`) }}</th>
                <th class="py-2 text-center font-medium">{{ t('admin.compliance.colTotal') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in funnel?.groups ?? []" :key="g.group" class="border-b border-ui/50">
                <td class="py-2 font-medium text-content">{{ g.group }}</td>
                <td v-for="s in funnel?.stages ?? []" :key="s" class="py-2 text-center" :class="g.stages[s] ? 'text-content' : 'text-muted'">{{ g.stages[s] ?? 0 }}</td>
                <td class="py-2 text-center font-bold text-content">{{ g.total }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>
      <BaseCard>
        <div class="mb-2 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.compliance.representation') }}</h2>
        </div>
        <DonutChart v-if="funnel?.representation?.length" :data="funnel.representation" :size="150" :center-label="t('admin.compliance.statHired')" />
        <p v-else class="py-6 text-center text-xs text-muted">—</p>
      </BaseCard>
    </div>

    <!-- الإشراف على قرارات الذكاء -->
    <BaseCard v-if="ai" class="mb-5">
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <BaseIcon name="mdi-robot-outline" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.compliance.aiTitle') }}</h2>
        </div>
        <BaseChip :color="ai.boostEffective ? 'accent' : 'neutral'">
          {{ ai.boostEffective ? t('admin.compliance.aiBoostOn') : t('admin.compliance.aiBoostOff') }}
        </BaseChip>
      </div>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div class="rounded-ui border-ui p-2.5 text-center">
          <div class="text-lg font-bold text-content">{{ ai.weights.skills }}</div>
          <div class="text-[11px] text-muted">{{ t('admin.compliance.wSkills') }}</div>
        </div>
        <div class="rounded-ui border-ui p-2.5 text-center">
          <div class="text-lg font-bold text-content">{{ ai.weights.experience }}</div>
          <div class="text-[11px] text-muted">{{ t('admin.compliance.wExperience') }}</div>
        </div>
        <div class="rounded-ui border-ui p-2.5 text-center">
          <div class="text-lg font-bold text-content">{{ ai.weights.category }}</div>
          <div class="text-[11px] text-muted">{{ t('admin.compliance.wCategory') }}</div>
        </div>
        <div class="rounded-ui border-ui p-2.5 text-center">
          <div class="text-lg font-bold text-content">{{ ai.threshold }}</div>
          <div class="text-[11px] text-muted">{{ t('admin.compliance.threshold') }}</div>
        </div>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <BaseChip :color="ai.governed ? 'success' : 'warning'">
          <BaseIcon :name="ai.governed ? 'mdi-shield-check' : 'mdi-shield-off-outline'" :size="12" />
          {{ ai.governed ? t('admin.compliance.governed') : t('admin.compliance.ungoverned') }}
        </BaseChip>
        <RouterLink :to="{ name: 'admin-matching' }" class="gov-link"><BaseIcon name="mdi-target-account" :size="14" />{{ t('admin.compliance.tuneMatching') }}</RouterLink>
        <RouterLink :to="{ name: 'admin-ai' }" class="gov-link"><BaseIcon name="mdi-robot-outline" :size="14" />{{ t('admin.compliance.aiGovernance') }}</RouterLink>
      </div>
    </BaseCard>

    <!-- أثر تدقيق القرارات -->
    <BaseCard>
      <div class="mb-3 flex items-center gap-2">
        <BaseIcon name="mdi-history" :size="18" class="text-brand" />
        <h2 class="text-sm font-bold text-content">{{ t('admin.compliance.auditTitle') }}</h2>
      </div>
      <div class="space-y-1.5">
        <div v-for="row in audit" :key="row.id" class="flex items-center gap-2 rounded-ui border-ui px-3 py-2 text-xs">
          <BaseChip color="neutral">{{ row.resource }}</BaseChip>
          <span class="font-medium text-content">{{ row.action }}</span>
          <span v-if="row.targetId" class="text-muted">#{{ row.targetId }}</span>
          <span class="flex-1" />
          <BaseChip :color="statusColor(row.status)">{{ row.status }}</BaseChip>
          <span class="text-muted">{{ row.actor || '—' }}</span>
          <span class="text-muted">{{ fmtTime(row.at) }}</span>
        </div>
        <p v-if="!audit.length" class="rounded-ui border border-dashed border-ui py-4 text-center text-xs text-muted">—</p>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.gov-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  color: rgb(var(--v-theme-primary));
  transition: all 0.15s ease;
}
.gov-link:hover {
  background: rgba(var(--v-theme-primary), 0.06);
  border-color: rgb(var(--v-theme-primary));
}
</style>

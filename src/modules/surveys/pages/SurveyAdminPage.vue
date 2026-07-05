<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import type { SurveyStatus } from '@/stores/SurveysStore'
import { GENDER_META, STATUS_TRANSITIONS, SURVEY_REGIONS, SURVEY_STATUS_META, useSurveysStore } from '@/stores/SurveysStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseMultiSelect from '@/components/ui/BaseMultiSelect.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'

// ===== مركز إدارة الاستبيان — الدورة الإدارية الكاملة =====
const route = useRoute()
const store = useSurveysStore()
const notifications = useNotificationsStore()

const survey = computed(() => store.byId(Number(route.params.id)))
const admin = computed(() => store.adminFor(Number(route.params.id)))
const stats = computed(() => store.statsFor(Number(route.params.id)))

const snackbar = ref('')

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c?: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral', 'surface-variant': 'neutral', grey: 'neutral', orange: 'warning', amber: 'warning' } as Record<string, BaseColor>)[c ?? ''] ?? c ?? 'brand') as BaseColor
}
// اسم رمز ثيم صالح (تطبيع orange/surface-variant/grey)
function normVar(c: string) {
  return ({ orange: 'warning', 'surface-variant': 'on-surface', grey: 'on-surface', 'medium-emphasis': 'on-surface' } as Record<string, string>)[c] ?? c
}
function tonalStyle(c: string) {
  const n = normVar(c)
  return { background: `rgba(var(--v-theme-${n}), 0.16)`, color: `rgb(var(--v-theme-${n}))` }
}
function solidStyle(c: string) {
  const n = normVar(c)
  return { background: `rgb(var(--v-theme-${n}))`, color: n === 'on-surface' ? 'rgb(var(--v-theme-surface))' : `rgb(var(--v-theme-on-${n}))`, borderColor: 'transparent' }
}
const outlineStyle = { background: 'transparent', color: 'rgba(var(--v-theme-on-surface), 0.7)', borderColor: 'rgba(var(--v-theme-on-surface), 0.2)' }

// —— دورة الحالة ——
const LIFECYCLE: SurveyStatus[] = ['draft', 'scheduled', 'active', 'paused', 'closed', 'archived']
const allowedNext = computed(() => (survey.value ? STATUS_TRANSITIONS[survey.value.status] : []))
function transition(to: SurveyStatus) {
  if (!survey.value)
    return
  const ok = store.setStatus(survey.value.id, to)
  snackbar.value = ok ? `انتقل الاستبيان إلى «${SURVEY_STATUS_META[to].label}»` : 'انتقال غير مسموح في دورة الحياة'
}

// —— استيراد المستبينين (شيت CSV) ——
const importDialog = ref(false)
const importSource = ref<'internal' | 'external'>('external')
const csvText = ref('')
const fileError = ref('')

/** يقرأ صفوف CSV: عمودان (اسم، بريد/جوال) بفواصل أو فواصل منقوطة أو Tab */
function parseCsv(text: string): { name: string, contact: string }[] {
  return text
    .split(/\r?\n/)
    .map(line => line.split(/[,;\t]/).map(c => c.trim()))
    .filter(cols => cols.length >= 2 && cols[0] && cols[1])
    .filter(cols => !/^(الاسم|name)$/i.test(cols[0])) // تخطي صف العناوين
    .map(cols => ({ name: cols[0], contact: cols[1] }))
}

function onFile(e: Event) {
  fileError.value = ''
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file)
    return
  if (!/\.csv$|\.txt$/i.test(file.name)) {
    fileError.value = 'ملفات Excel: صدّر الشيت بصيغة CSV أولًا (حفظ باسم ← CSV) ثم ارفعه هنا.'
    return
  }
  const reader = new FileReader()
  reader.onload = () => (csvText.value = String(reader.result ?? ''))
  reader.readAsText(file)
}

function doImport() {
  if (!survey.value)
    return
  const rows = parseCsv(csvText.value)
  const added = store.importInvitees(survey.value.id, rows, importSource.value)
  importDialog.value = false
  csvText.value = ''
  snackbar.value = added
    ? `استُورد ${added} مستبينًا (${importSource.value === 'internal' ? 'من داخل المنصة' : 'من خارج المنصة'})`
    : 'لا صفوف صالحة — تأكد من عمودَي الاسم وجهة الاتصال'
}

function downloadTemplate() {
  const csv = 'الاسم,البريد أو الجوال\nسارة العتيبي,sara@mail.com\nمحمد الحارثي,0551234567\n'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
  a.download = 'respondents-template.csv'
  a.click()
}

function sendInvites() {
  if (!survey.value)
    return
  const n = store.inviteAll(survey.value.id)
  snackbar.value = n ? `أُرسلت ${n} دعوة — تابع الاستجابات هنا` : 'لا مدعوين معلّقين'
}

const INVITEE_STATUS_META = {
  pending: { label: 'معلّق', color: 'warning' },
  invited: { label: 'دُعي', color: 'info' },
  responded: { label: 'استجاب', color: 'success' },
} as const

function saved() {
  notifications.push({
    icon: 'mdi-content-save-check-outline',
    color: 'success',
    title: 'حُفظت إعدادات الاستبيان',
    body: `«${survey.value?.title}» — الاستهداف والجدولة والحوافز محدّثة.`,
    category: 'system',
  })
}
</script>

<template>
  <div v-if="survey && admin">
    <PageHeader
      :title="`إدارة: ${survey.title}`"
      :subtitle="`${survey.type} · أُنشئ ${survey.createdAt}`"
      icon="mdi-cog-transfer-outline"
    >
      <template #actions>
        <BaseButton variant="ghost" size="sm" :to="{ name: 'survey-analysis', params: { id: survey.id } }"><BaseIcon name="mdi-chart-box-outline" :size="16" />التحليل</BaseButton>
        <BaseButton variant="tonal-emerald" size="sm" :to="{ name: 'surveys' }"><BaseIcon name="mdi-arrow-right" :size="16" />استبياناتي</BaseButton>
      </template>
    </PageHeader>

    <!-- دورة الحالة -->
    <BaseCard class="mb-4">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <BaseIcon name="mdi-sync-circle" :size="22" :style="{ color: 'rgb(var(--v-theme-primary))' }" />
        <h2 class="text-base font-bold text-content">دورة الحياة</h2>
        <BaseChip :color="mapColor(SURVEY_STATUS_META[survey.status].color)"><BaseIcon :name="SURVEY_STATUS_META[survey.status].icon" :size="13" />{{ SURVEY_STATUS_META[survey.status].label }}</BaseChip>
      </div>
      <div class="mb-3 flex flex-wrap items-center gap-1">
        <template v-for="(st, i) in LIFECYCLE" :key="st">
          <span
            class="inline-flex items-center gap-1 rounded-ui border px-2.5 py-1 text-sm font-medium"
            :style="survey.status === st ? solidStyle(SURVEY_STATUS_META[st].color) : outlineStyle"
          >
            <BaseIcon :name="SURVEY_STATUS_META[st].icon" :size="13" />{{ SURVEY_STATUS_META[st].label }}
          </span>
          <BaseIcon v-if="i < LIFECYCLE.length - 1" name="mdi-chevron-left" :size="16" :style="{ color: 'rgba(var(--v-theme-on-surface), 0.5)' }" />
        </template>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="to in allowedNext"
          :key="to"
          type="button"
          class="inline-flex items-center gap-1 rounded-ui px-3 py-1.5 text-sm font-medium transition"
          :style="tonalStyle(SURVEY_STATUS_META[to].color)"
          @click="transition(to)"
        >
          <BaseIcon :name="SURVEY_STATUS_META[to].icon" :size="16" />{{ to === 'active' && survey.status === 'closed' ? 'إعادة فتح' : SURVEY_STATUS_META[to].label }}
        </button>
        <span v-if="!allowedNext.length" class="text-xs text-muted">الأرشيف نهاية الدورة — انسخ الاستبيان لبدء دورة جديدة.</span>
      </div>
      <div v-if="survey.status === 'scheduled'" class="mt-3 flex items-start gap-2 rounded-ui border-s-4 p-2 text-xs text-content" style="background: rgba(var(--v-theme-info), 0.14); border-color: rgb(var(--v-theme-info))">
        سيُفعَّل تلقائيًا في {{ survey.settings.startsAt ?? 'موعد البداية' }} — ويُغلق تلقائيًا عند انتهاء الموعد أو اكتمال الحصة أو استنفاد المجمع.
      </div>
    </BaseCard>

    <!-- مؤشرات الإدارة -->
    <div class="mb-1 grid grid-cols-2 gap-4 md:grid-cols-4">
      <BaseCard>
        <div class="mb-1 text-xs text-muted">حصة المستبينين</div>
        <div class="text-lg font-bold text-content">{{ admin.quota.used }}<span v-if="admin.quota.limit" class="text-sm text-muted"> / {{ admin.quota.limit }}</span></div>
        <BaseProgressBar v-if="admin.quota.pct !== null" :value="admin.quota.pct" color="primary" :height="6" class="mt-1" />
        <div v-else class="text-xs text-muted">بلا حد</div>
      </BaseCard>
      <BaseCard>
        <div class="mb-1 text-xs text-muted">مجمع النقاط</div>
        <div class="text-lg font-bold text-content">{{ admin.budget.spent }}<span v-if="admin.budget.total" class="text-sm text-muted"> / {{ admin.budget.total }}</span></div>
        <BaseProgressBar v-if="admin.budget.pct !== null" :value="admin.budget.pct" :color="admin.budget.pct > 85 ? 'error' : 'warning'" :height="6" class="mt-1" />
        <div v-else class="text-xs text-muted">بلا سقف</div>
      </BaseCard>
      <BaseCard>
        <div class="mb-1 text-xs text-muted">نسبة الإكمال</div>
        <div class="text-lg font-bold text-content">{{ stats.completion }}%</div>
        <div class="text-xs text-muted">{{ stats.internal }} داخلي · {{ stats.external }} خارجي</div>
      </BaseCard>
      <BaseCard>
        <div class="mb-1 text-xs text-muted">المهلة</div>
        <div class="text-lg font-bold text-content">{{ admin.daysLeft !== null ? `${admin.daysLeft} يومًا` : 'مفتوحة' }}</div>
        <div class="text-xs text-muted">{{ survey.settings.closesAt ? `تُغلق ${survey.settings.closesAt}` : 'بلا موعد إغلاق' }}</div>
      </BaseCard>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-12">
      <!-- الجدولة والحدود والحوافز -->
      <div class="md:col-span-5">
        <BaseCard class="mb-4">
          <h2 class="mb-3 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-calendar-range-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-info))' }" />الجدولة والحدود</h2>
          <div class="grid grid-cols-2 gap-3">
            <BaseInput v-model="survey.settings.startsAt" type="date" label="بداية المشاركة" @change="saved" />
            <BaseInput v-model="survey.settings.closesAt" type="date" label="نهاية المشاركة" @change="saved" />
            <BaseInput v-model.number="survey.settings.responseLimit" type="number" label="حد عدد المستبينين" placeholder="بلا حد" class="col-span-2" @change="saved" />
          </div>
          <div class="mt-3 rounded-ui border-s-4 p-2 text-xs text-content" style="background: rgba(var(--v-theme-secondary), 0.12); border-color: rgb(var(--v-theme-secondary))">
            عند بلوغ الحد أو انتهاء الموعد يُغلق الاستبيان تلقائيًا ويصلك إشعار.
          </div>
        </BaseCard>

        <BaseCard class="mb-4">
          <h2 class="mb-3 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-gift-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-warning))' }" />الحوافز</h2>
          <div class="grid grid-cols-2 gap-3">
            <BaseInput v-model.number="survey.settings.rewardPoints" type="number" label="نقاط لكل مشارك" @change="saved" />
            <BaseInput v-model.number="survey.settings.rewardBudget" type="number" label="مجمع النقاط (حد القيمة)" placeholder="بلا سقف" @change="saved" />
          </div>
          <p class="mb-0 mt-3 text-xs text-muted">
            المصروف حتى الآن: <b>{{ survey.rewardsSpent }}</b> نقطة
            <template v-if="survey.settings.rewardBudget"> — المتبقي {{ Math.max(0, survey.settings.rewardBudget - survey.rewardsSpent) }} تكفي
              {{ survey.settings.rewardPoints ? Math.floor(Math.max(0, survey.settings.rewardBudget - survey.rewardsSpent) / survey.settings.rewardPoints) : '∞' }} مشاركًا.</template>
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="mb-3 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-target-account" :size="20" :style="{ color: 'rgb(var(--v-theme-accent))' }" />الاستهداف</h2>
          <label class="mb-1 block text-sm font-medium text-muted">النطاق الجغرافي</label>
          <BaseMultiSelect v-model="survey.targeting.regions" :options="SURVEY_REGIONS" placeholder="كل المناطق" class="mb-2" @update:model-value="saved" />
          <div class="seg mb-3 w-full">
            <button
              v-for="(label, g) in GENDER_META"
              :key="g"
              type="button"
              class="seg-btn flex-1"
              :class="{ 'is-active': survey.targeting.gender === g }"
              @click="survey.targeting.gender = (g as typeof survey.targeting.gender); saved()"
            >{{ label }}</button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <BaseInput v-model.number="survey.targeting.ageMin" type="number" label="العمر من" placeholder="بلا حد" @change="saved" />
            <BaseInput v-model.number="survey.targeting.ageMax" type="number" label="العمر إلى" placeholder="بلا حد" @change="saved" />
          </div>
          <p class="mb-0 mt-3 text-xs text-muted">يظهر الاستبيان في «استبيانات للمشاركة» للجمهور المطابق، ويُعرض الاستهداف في صفحة الإجابة.</p>
        </BaseCard>
      </div>

      <!-- المستبينون -->
      <div class="md:col-span-7">
        <BaseCard>
          <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 class="flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-account-multiple-check-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-primary))' }" />المستبينون ({{ admin.invitees.total }})</h2>
            <div class="flex gap-2">
              <BaseButton size="sm" variant="tonal-emerald" @click="importDialog = true"><BaseIcon name="mdi-file-delimited-outline" :size="16" />استيراد شيت</BaseButton>
              <BaseButton size="sm" variant="brand" :disabled="!admin.invitees.pending || survey.status !== 'active'" @click="sendInvites">
                <BaseIcon name="mdi-email-fast-outline" :size="16" />دعوة المعلّقين ({{ admin.invitees.pending }})
              </BaseButton>
            </div>
          </div>

          <!-- قُمع الدعوات -->
          <div class="mb-3 flex flex-wrap gap-2">
            <BaseChip color="warning">معلّق: {{ admin.invitees.pending }}</BaseChip>
            <BaseChip color="info">دُعي: {{ admin.invitees.invited }}</BaseChip>
            <BaseChip color="success">استجاب: {{ admin.invitees.responded }}</BaseChip>
          </div>

          <div v-if="survey.invitees.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-ui text-start text-xs text-muted">
                  <th class="p-2 text-start font-medium">الاسم</th>
                  <th class="p-2 text-start font-medium">جهة الاتصال</th>
                  <th class="p-2 text-start font-medium">المصدر</th>
                  <th class="p-2 text-start font-medium">الحالة</th>
                  <th class="p-2" />
                </tr>
              </thead>
              <tbody>
                <tr v-for="i in survey.invitees" :key="i.id" class="border-b border-ui">
                  <td class="p-2 font-bold text-content">{{ i.name }}</td>
                  <td class="p-2 text-start text-content" dir="ltr">{{ i.contact }}</td>
                  <td class="p-2"><BaseChip :color="i.source === 'internal' ? 'brand' : 'emerald'">{{ i.source === 'internal' ? 'داخل المنصة' : 'خارجها' }}</BaseChip></td>
                  <td class="p-2"><BaseChip :color="mapColor(INVITEE_STATUS_META[i.status].color)">{{ INVITEE_STATUS_META[i.status].label }}</BaseChip></td>
                  <td class="p-2"><button class="icon-btn h-8 w-8" style="color: rgb(var(--v-theme-error))" aria-label="حذف" @click="store.removeInvitee(survey.id, i.id)"><BaseIcon name="mdi-delete-outline" :size="16" /></button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="py-6 text-center text-muted">
            <BaseIcon name="mdi-account-multiple-plus-outline" :size="40" />
            <p class="mb-0 mt-1 text-sm">استورد قائمة مستبينين من شيت CSV/Excel — من داخل المنصة أو خارجها.</p>
          </div>
        </BaseCard>
      </div>
    </div>

    <!-- استيراد شيت -->
    <BaseModal v-model="importDialog" title="استيراد المستبينين من شيت" :max-width="560">
      <div class="seg mb-3 w-full">
        <button type="button" class="seg-btn flex flex-1 items-center justify-center gap-1" :class="{ 'is-active': importSource === 'internal' }" @click="importSource = 'internal'"><BaseIcon name="mdi-account-check-outline" :size="16" />من داخل المنصة</button>
        <button type="button" class="seg-btn flex flex-1 items-center justify-center gap-1" :class="{ 'is-active': importSource === 'external' }" @click="importSource = 'external'"><BaseIcon name="mdi-account-arrow-left-outline" :size="16" />من خارج المنصة</button>
      </div>
      <label class="mb-1 block text-sm font-medium text-muted">ملف CSV (من Excel: حفظ باسم ← CSV)</label>
      <input type="file" accept=".csv,.txt" class="mb-2 block w-full text-sm text-content file:me-3 file:rounded-ui file:border-0 file:bg-surfalt file:px-3 file:py-1.5 file:text-content" @change="onFile">
      <div v-if="fileError" class="mb-2 rounded-ui border-s-4 p-2 text-xs text-content" style="background: rgba(var(--v-theme-warning), 0.14); border-color: rgb(var(--v-theme-warning))">{{ fileError }}</div>
      <BaseTextarea v-model="csvText" label="أو الصق الصفوف مباشرة" :rows="5" placeholder="الاسم,البريد أو الجوال&#10;سارة العتيبي,sara@mail.com&#10;محمد الحارثي,0551234567" dir="ltr" />
      <div class="mt-2 flex items-center justify-between">
        <BaseButton size="sm" variant="ghost" @click="downloadTemplate"><BaseIcon name="mdi-download-outline" :size="16" :style="{ color: 'rgb(var(--v-theme-secondary))' }" /><span :style="{ color: 'rgb(var(--v-theme-secondary))' }">تحميل قالب جاهز</span></BaseButton>
        <span class="text-xs text-muted">{{ parseCsv(csvText).length }} صفًا صالحًا</span>
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="importDialog = false">إلغاء</BaseButton>
        <BaseButton variant="brand" :disabled="!parseCsv(csvText).length" @click="doImport"><BaseIcon name="mdi-import" :size="16" />استيراد</BaseButton>
      </template>
    </BaseModal>

    <BaseSnackbar :model-value="!!snackbar" :timeout="2600" color="secondary" @update:model-value="snackbar = ''">{{ snackbar }}</BaseSnackbar>
  </div>

  <BaseCard v-else class="m-4 py-8 text-center">
    <BaseIcon name="mdi-help-circle-outline" :size="48" :style="{ color: 'rgba(var(--v-theme-on-surface), 0.5)' }" />
    <p class="text-content">الاستبيان غير موجود.</p>
    <BaseButton variant="tonal-brand" :to="{ name: 'surveys' }">عودة لاستبياناتي</BaseButton>
  </BaseCard>
</template>

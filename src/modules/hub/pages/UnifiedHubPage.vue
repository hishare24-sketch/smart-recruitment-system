<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import type { UserRole } from '@/interfaces/Auth'
import { ROLE_META } from '@/services/roles'
import { useAuthStore } from '@/stores/AuthStore'
import type { HubGroupKey, HubSortKey, WorkItem, WorkItemUrgency } from '@/stores/UnifiedHubStore'
import { KIND_META, URGENCY_META, filterItems, groupItems, sortItems, useUnifiedHubStore } from '@/stores/UnifiedHubStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'

// ===== المركز الموحّد — كل أدوارك في شاشة واحدة: قرارات، مواعيد، ومؤشرات =====
const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const hub = useUnifiedHubStore()
const notifications = useNotificationsStore()

const roleLabel = (r: UserRole) => t(`roles.${r}`)

// —— حالة التحكم (تقسيم/فلترة/فرز/كثافة) ——
const groupBy = ref<HubGroupKey>('urgency')
const sortBy = ref<HubSortKey>('priority')
const roleFilter = ref<UserRole[]>([])
const urgencyFilter = ref<WorkItemUrgency[]>([])
const query = ref('')
const density = ref<'comfortable' | 'compact'>('comfortable')

const GROUP_OPTIONS: { value: HubGroupKey, label: string, icon: string }[] = [
  { value: 'urgency', label: 'حسب الاستعجال', icon: 'mdi-fire' },
  { value: 'role', label: 'حسب الدور', icon: 'mdi-account-convert-outline' },
  { value: 'kind', label: 'حسب النوع', icon: 'mdi-shape-outline' },
  { value: 'none', label: 'بلا تجميع', icon: 'mdi-view-list-outline' },
]
const SORT_OPTIONS: { value: HubSortKey, label: string }[] = [
  { value: 'priority', label: 'الأولوية' },
  { value: 'amount', label: 'القيمة المالية' },
  { value: 'recent', label: 'الأحدث' },
]

const ownedRoles = computed(() => hub.roleSummaries.map(r => r.role))

const visibleItems = computed(() => {
  const filtered = filterItems(hub.allItems, {
    roles: roleFilter.value,
    urgencies: urgencyFilter.value,
    query: query.value,
  })
  return sortItems(filtered, sortBy.value)
})
const groups = computed(() => groupItems(visibleItems.value, groupBy.value))

function groupLabel(key: string): string {
  if (groupBy.value === 'role')
    return roleLabel(key as UserRole)
  if (groupBy.value === 'urgency')
    return URGENCY_META[key as WorkItemUrgency].label
  if (groupBy.value === 'kind')
    return KIND_META[key as keyof typeof KIND_META].label
  return 'كل العناصر'
}

// —— طرق العرض المحفوظة ——
interface SavedView {
  id: number
  name: string
  groupBy: HubGroupKey
  sortBy: HubSortKey
  roles: UserRole[]
  urgencies: WorkItemUrgency[]
  density: 'comfortable' | 'compact'
}
const VIEWS_KEY = 'hubViews'
function loadViews(): SavedView[] {
  try {
    return JSON.parse(localStorage.getItem(VIEWS_KEY) ?? '[]')
  }
  catch {
    return []
  }
}
const savedViews = ref<SavedView[]>(loadViews())
watch(savedViews, v => localStorage.setItem(VIEWS_KEY, JSON.stringify(v)), { deep: true })

const viewDialog = ref(false)
const newViewName = ref('')
const activeViewId = ref<number | null>(null)
function saveCurrentView() {
  if (!newViewName.value.trim())
    return
  const v: SavedView = {
    id: Date.now(),
    name: newViewName.value.trim(),
    groupBy: groupBy.value,
    sortBy: sortBy.value,
    roles: [...roleFilter.value],
    urgencies: [...urgencyFilter.value],
    density: density.value,
  }
  savedViews.value.push(v)
  activeViewId.value = v.id
  viewDialog.value = false
  newViewName.value = ''
}
function applyView(v: SavedView) {
  groupBy.value = v.groupBy
  sortBy.value = v.sortBy
  roleFilter.value = [...v.roles]
  urgencyFilter.value = [...v.urgencies]
  density.value = v.density
  activeViewId.value = v.id
}
function removeView(id: number) {
  savedViews.value = savedViews.value.filter(v => v.id !== id)
  if (activeViewId.value === id)
    activeViewId.value = null
}
function resetControls() {
  groupBy.value = 'urgency'
  sortBy.value = 'priority'
  roleFilter.value = []
  urgencyFilter.value = []
  query.value = ''
  activeViewId.value = null
}

// —— تخصيص الأقسام (إظهار/إخفاء) ——
const SECTIONS_KEY = 'hubSections'
interface SectionPrefs { kpis: boolean, inbox: boolean, roleCards: boolean }
function loadSections(): SectionPrefs {
  try {
    return { kpis: true, inbox: true, roleCards: true, ...JSON.parse(localStorage.getItem(SECTIONS_KEY) ?? '{}') }
  }
  catch {
    return { kpis: true, inbox: true, roleCards: true }
  }
}
const sections = ref<SectionPrefs>(loadSections())
watch(sections, v => localStorage.setItem(SECTIONS_KEY, JSON.stringify(v)), { deep: true })

// —— الإجراء المباشر من الصندوق ——
function resolve(item: WorkItem, accept: boolean) {
  const handled = hub.resolveItem(item, accept)
  if (!handled) {
    router.push(item.actionTo)
    return
  }
  notifications.push({
    icon: item.icon,
    color: accept ? 'success' : 'error',
    title: accept ? `قبلت: ${KIND_META[item.kind].label}` : `اعتذرت: ${KIND_META[item.kind].label}`,
    body: `${item.party} — ${item.title}`,
    category: 'system',
    actionTo: item.actionTo,
    actionLabel: 'فتح التفاصيل',
  })
}
function open(item: WorkItem) {
  router.push(item.actionTo)
}
/** الأنواع التي تقبل قرارًا فوريًا من الصندوق */
const DECIDABLE: WorkItem['kind'][] = ['interview_request', 'peer_request', 'consulting_request', 'wish_incoming', 'offer_incoming', 'role_approval']
function isDecidable(item: WorkItem) {
  return DECIDABLE.includes(item.kind) && item.urgency === 'action'
}

const kpiCards = computed(() => [
  { label: 'يحتاج قرارك', value: hub.kpis.actionCount, icon: 'mdi-gesture-tap-button', color: 'error' },
  { label: 'مواعيد قادمة', value: hub.kpis.upcomingCount, icon: 'mdi-calendar-clock-outline', color: 'info' },
  { label: 'قيمة معلّقة', value: `${hub.kpis.pendingMoney} ﷼`, icon: 'mdi-cash-clock', color: 'warning' },
  { label: 'أرباحك عبر الأدوار', value: `${hub.kpis.earnings} ﷼`, icon: 'mdi-cash-multiple', color: 'success' },
])
</script>

<template>
  <div>
    <PageHeader
      title="المركز الموحّد"
      :subtitle="`كل أدوارك (${hub.kpis.activeRoles}) في شاشة واحدة — قرارات ومواعيد ومؤشرات`"
      icon="mdi-view-dashboard-variant-outline"
    >
      <template #actions>
        <VMenu :close-on-content-click="false" location="bottom end">
          <template #activator="{ props }">
            <VBtn v-bind="props" variant="text" icon="mdi-cog-outline" />
          </template>
          <VCard class="pa-3" min-width="240">
            <div class="text-body-2 font-weight-bold mb-2">أقسام المركز</div>
            <VSwitch v-model="sections.kpis" label="المؤشرات" color="primary" hide-details density="compact" />
            <VSwitch v-model="sections.inbox" label="صندوق العمل" color="primary" hide-details density="compact" />
            <VSwitch v-model="sections.roleCards" label="بطاقات الأدوار" color="primary" hide-details density="compact" />
          </VCard>
        </VMenu>
      </template>
    </PageHeader>

    <!-- KPIs عابرة للأدوار -->
    <VRow v-if="sections.kpis" class="mb-1">
      <VCol v-for="k in kpiCards" :key="k.label" cols="6" lg="3">
        <VCard class="pa-4 d-flex align-center ga-3">
          <VAvatar :color="k.color" variant="tonal" rounded="lg" size="44">
            <VIcon :icon="k.icon" size="22" />
          </VAvatar>
          <div>
            <div class="text-h6 font-weight-bold">{{ k.value }}</div>
            <div class="text-caption text-medium-emphasis">{{ k.label }}</div>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <!-- بطاقات الأدوار النشطة -->
    <VRow v-if="sections.roleCards" class="mb-1">
      <VCol v-for="r in hub.roleSummaries" :key="r.role" cols="12" sm="6" lg="4">
        <VCard class="pa-4 h-100">
          <div class="d-flex align-center ga-2 mb-2">
            <VAvatar color="primary" variant="tonal" size="36">
              <VIcon :icon="ROLE_META[r.role].icon" size="18" />
            </VAvatar>
            <span class="text-body-1 font-weight-bold flex-grow-1">{{ roleLabel(r.role) }}</span>
            <VChip v-if="auth.role === r.role" size="x-small" color="success" variant="tonal" label>النشط</VChip>
          </div>
          <div class="d-flex flex-wrap ga-1 mb-3">
            <VChip v-for="f in r.facts" :key="f" size="x-small" variant="tonal" color="secondary" label>{{ f }}</VChip>
          </div>
          <VBtn size="small" variant="tonal" color="primary" block prepend-icon="mdi-open-in-app" :to="{ name: r.home }">
            افتح اللوحة الكاملة
          </VBtn>
        </VCard>
      </VCol>
    </VRow>

    <!-- صندوق العمل الموحّد + التحكم المتقدم -->
    <VCard v-if="sections.inbox" class="pa-4">
      <div class="d-flex align-center ga-2 mb-3 flex-wrap">
        <VIcon icon="mdi-inbox-full-outline" color="primary" />
        <h2 class="text-subtitle-1 font-weight-bold">صندوق العمل الموحّد ({{ visibleItems.length }})</h2>
        <VSpacer />
        <VBtnToggle v-model="density" mandatory density="compact" variant="outlined" color="primary">
          <VBtn value="comfortable" size="x-small" icon="mdi-view-agenda-outline" />
          <VBtn value="compact" size="x-small" icon="mdi-view-headline" />
        </VBtnToggle>
      </div>

      <!-- شريط الفلاتر -->
      <VRow dense class="mb-2">
        <VCol cols="12" md="4">
          <VTextField v-model="query" placeholder="بحث بالاسم أو الموضوع..." prepend-inner-icon="mdi-magnify" density="compact" hide-details clearable />
        </VCol>
        <VCol cols="12" sm="6" md="4">
          <VSelect
            v-model="roleFilter"
            :items="ownedRoles.map(r => ({ title: roleLabel(r), value: r }))"
            label="الأدوار"
            multiple chips closable-chips clearable
            density="compact" hide-details
          />
        </VCol>
        <VCol cols="6" sm="3" md="2">
          <VSelect
            v-model="urgencyFilter"
            :items="Object.entries(URGENCY_META).map(([v, m]) => ({ title: m.label, value: v }))"
            label="الحالة"
            multiple clearable
            density="compact" hide-details
          />
        </VCol>
        <VCol cols="6" sm="3" md="2">
          <VSelect v-model="sortBy" :items="SORT_OPTIONS.map(o => ({ title: o.label, value: o.value }))" label="فرز" density="compact" hide-details />
        </VCol>
      </VRow>

      <!-- التجميع + طرق العرض المحفوظة -->
      <div class="d-flex align-center ga-2 flex-wrap mb-3">
        <VBtnToggle v-model="groupBy" mandatory color="primary" variant="outlined" density="compact">
          <VBtn v-for="g in GROUP_OPTIONS" :key="g.value" :value="g.value" size="small" :prepend-icon="g.icon">{{ g.label }}</VBtn>
        </VBtnToggle>
        <VSpacer />
        <VChip
          v-for="v in savedViews"
          :key="v.id"
          size="small"
          :color="activeViewId === v.id ? 'primary' : 'secondary'"
          :variant="activeViewId === v.id ? 'flat' : 'tonal'"
          label closable
          @click="applyView(v)"
          @click:close="removeView(v.id)"
        >
          <VIcon icon="mdi-bookmark-outline" start size="14" />{{ v.name }}
        </VChip>
        <VBtn size="x-small" variant="tonal" color="secondary" prepend-icon="mdi-bookmark-plus-outline" @click="viewDialog = true">حفظ العرض</VBtn>
        <VBtn size="x-small" variant="text" prepend-icon="mdi-backup-restore" @click="resetControls">إعادة الضبط</VBtn>
      </div>

      <!-- المجموعات -->
      <template v-for="g in groups" :key="g.key">
        <div class="d-flex align-center ga-2 mt-4 mb-2">
          <VChip size="small" color="primary" variant="tonal" label>{{ groupLabel(g.key) }}</VChip>
          <span class="text-caption text-medium-emphasis">{{ g.items.length }} عنصرًا</span>
          <VDivider class="flex-grow-1" />
        </div>
        <div class="d-flex flex-column" :class="density === 'compact' ? 'ga-1' : 'ga-2'">
          <VCard
            v-for="item in g.items"
            :key="item.id"
            variant="outlined"
            class="work-item"
            :class="density === 'compact' ? 'pa-2' : 'pa-3'"
          >
            <div class="d-flex align-center ga-3 flex-wrap">
              <VAvatar :color="item.color" variant="tonal" :size="density === 'compact' ? 32 : 42">
                <VIcon :icon="item.icon" :size="density === 'compact' ? 16 : 20" />
              </VAvatar>
              <div class="flex-grow-1" style="min-width: 200px">
                <div class="d-flex align-center ga-2 flex-wrap">
                  <span class="text-body-2 font-weight-bold">{{ item.party }}</span>
                  <VChip size="x-small" variant="tonal" :color="item.color" label>{{ KIND_META[item.kind].label }}</VChip>
                  <VChip size="x-small" variant="tonal" color="secondary" label>{{ roleLabel(item.role) }}</VChip>
                </div>
                <div class="text-caption text-medium-emphasis text-truncate" style="max-width: 520px">{{ item.title }}</div>
                <div v-if="density === 'comfortable'" class="text-caption text-medium-emphasis">
                  {{ item.dateLabel }}<template v-if="item.amountLabel"> · <b>{{ item.amountLabel }}</b></template>
                </div>
              </div>
              <VChip size="x-small" :color="item.statusColor" label>{{ item.status }}</VChip>
              <div class="d-flex ga-1">
                <template v-if="isDecidable(item)">
                  <VBtn size="small" color="success" variant="tonal" prepend-icon="mdi-check" @click="resolve(item, true)">قبول</VBtn>
                  <VBtn icon="mdi-close" size="small" variant="text" color="error" @click="resolve(item, false)" />
                </template>
                <VBtn icon="mdi-arrow-left-circle-outline" size="small" variant="text" color="primary" @click="open(item)" />
              </div>
            </div>
          </VCard>
        </div>
      </template>

      <div v-if="!visibleItems.length" class="pa-10 text-center text-medium-emphasis">
        <VIcon icon="mdi-inbox-remove-outline" size="48" />
        <div class="mt-2 text-body-2">لا عناصر مطابقة — عدّل الفلاتر أو أعد الضبط.</div>
      </div>
    </VCard>

    <!-- حفظ طريقة عرض -->
    <VDialog v-model="viewDialog" max-width="400">
      <VCard class="pa-2">
        <VCardTitle>حفظ طريقة العرض الحالية</VCardTitle>
        <VCardText>
          <VTextField v-model="newViewName" label="اسم طريقة العرض" placeholder="قرارات اليوم / أموالي المعلّقة..." @keyup.enter="saveCurrentView" />
          <p class="text-caption text-medium-emphasis mb-0">تُحفظ الفلاتر والفرز والتجميع والكثافة الحالية وتظهر كاختصار دائم.</p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="viewDialog = false">إلغاء</VBtn>
          <VBtn color="primary" variant="flat" :disabled="!newViewName.trim()" prepend-icon="mdi-bookmark-plus-outline" @click="saveCurrentView">حفظ</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.work-item {
  border-color: rgba(140, 163, 150, 0.25);
  transition: border-color 0.15s ease;
}
.work-item:hover {
  border-color: rgb(var(--v-theme-primary));
}
</style>

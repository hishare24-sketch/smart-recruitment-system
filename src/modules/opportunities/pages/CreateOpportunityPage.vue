<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import { usePostedOpportunitiesStore } from '@/stores/PostedOpportunitiesStore'
import { useGamificationStore } from '@/stores/GamificationStore'
import { ai } from '@/services/ai'
import { OPPORTUNITY_TYPES, classifyText, getSector, visibleSectors } from '@/services/sectors'
import { useReviewQueueStore } from '@/stores/ReviewQueueStore'
import { useSectorContext } from '@/composables/useSectorContext'

const store = usePostedOpportunitiesStore()
const gamification = useGamificationStore()
const review = useReviewQueueStore()
const sector = useSectorContext()

// اقتراح القطاع الافتراضيّ من سياق المستخدم (تسمية القطاع الأبرز) — بذر لا قفل.
// يتكامل مع autoClassify (الذي يقترح مهارات/تصنيفًا من النصّ) دون تصادم.
function defaultDepartment(): string | null {
  return sector.primary.value ? (getSector(sector.primary.value)?.label ?? null) : null
}

const title = ref('')
const department = ref<string | null>(defaultDepartment())
const location = ref('')
const type = ref<string>('full_time')
const skills = ref<string[]>([])
const educationLevel = ref<string | null>(null)
const experienceYears = ref<number | null>(null)
const salaryFrom = ref<number | null>(null)
const salaryTo = ref<number | null>(null)
const benefits = ref<string[]>([])
const channels = ref<string[]>(['internal_chat'])
const blindReview = ref(false)
const description = ref('')

// نوع الفرصة من المصدر المعتمد الموحّد (services/sectors.ts)
const typeOptions = OPPORTUNITY_TYPES.map(o => ({ value: o.id, title: o.label }))
// المجال/القطاع من المصدر المعتمد الموحّد (يُخفي «أخرى» افتراضيًّا)
const departmentOptions = visibleSectors().map(s => s.label)
const educationOptions = ['ثانوي', 'دبلوم', 'بكالوريوس', 'ماجستير', 'دكتوراه']
const benefitOptions = ['سكن', 'مواصلات', 'تأمين طبي', 'تذاكر سفر', 'بدل اتصالات']
const channelOptions = [
  { value: 'internal_chat', title: 'دردشة داخلية' },
  { value: 'email', title: 'بريد إلكتروني' },
  { value: 'whatsapp', title: 'واتساب' },
  { value: 'phone', title: 'هاتف' },
]

const previewDialog = ref(false)
const snackbar = ref('')
const errorMsg = ref('')

const typeLabel = computed(() => typeOptions.find(t => t.value === type.value)?.title ?? '')

// تلميح يظهر فقط ما دام القطاع على القيمة المبذورة من السياق (يختفي عند تعديله)
const departmentHint = computed(() =>
  (sector.has.value && department.value === defaultDepartment())
    ? 'مبدئيًّا من قطاعات اهتمامك — عدّله بحرّية'
    : '',
)

// AI auto-classification of the posted opportunity
const classification = computed(() => ai.autoClassify(`${title.value} ${description.value} ${skills.value.join(' ')}`))
const suggestedSkills = computed(() => classification.value.suggestedSkills.filter(s => !skills.value.includes(s)))
const hasInput = computed(() => !!(title.value.trim() || description.value.trim()))

// حوكمة التصنيف: تنبيه حيّ إن كانت الفرصة تحتاج مراجعة إدارية (غامضة/عامة/بلا تطابق)
const governance = computed(() => classifyText(`${title.value} ${description.value} ${skills.value.join(' ')}`))
function addSuggestedSkill(s: string) {
  if (!skills.value.includes(s))
    skills.value = [...skills.value, s]
}
const salaryRange = computed(() => {
  if (salaryFrom.value && salaryTo.value)
    return `${salaryFrom.value.toLocaleString('en-US')} - ${salaryTo.value.toLocaleString('en-US')} ريال`
  return 'حسب الاتفاق'
})

function validate(): boolean {
  if (!title.value.trim()) {
    errorMsg.value = 'المسمى الوظيفي مطلوب'
    return false
  }
  if (!department.value) {
    errorMsg.value = 'اختر القسم'
    return false
  }
  errorMsg.value = ''
  return true
}

function resetForm() {
  title.value = ''
  department.value = defaultDepartment()
  location.value = ''
  type.value = 'full_time'
  skills.value = []
  educationLevel.value = null
  experienceYears.value = null
  salaryFrom.value = null
  salaryTo.value = null
  benefits.value = []
  description.value = ''
}

function publish() {
  if (!validate())
    return
  store.add({
    title: title.value,
    department: department.value!,
    location: location.value || 'غير محدد',
    type: typeLabel.value,
    status: 'published',
    salaryRange: salaryRange.value,
  })
  // حوكمة: وجّه الفرص الغامضة/العامة لطابور المراجعة الإدارية بدل قبولها بصمت
  const g = governance.value
  if (g.needsReview)
    review.flag({ kind: 'opportunity', title: title.value, reason: g.reason ?? 'تحتاج مراجعة تصنيف', suggestedSector: g.sectorId })
  gamification.record('postOpportunity', `نشرت فرصة «${title.value}»`)
  snackbar.value = g.needsReview ? 'نُشرت الفرصة — وأُحيلت لمراجعة التصنيف' : 'تم نشر الفرصة بنجاح!'
  resetForm()
}

function saveDraft() {
  if (!validate())
    return
  store.add({
    title: title.value,
    department: department.value!,
    location: location.value || 'غير محدد',
    type: typeLabel.value,
    status: 'draft',
    salaryRange: salaryRange.value,
  })
  snackbar.value = 'تم حفظ المسودة'
  resetForm()
}

function openPreview() {
  if (!validate())
    return
  previewDialog.value = true
}
</script>

<template>
  <div>
    <PageHeader title="نشر فرصة جديدة" subtitle="أنشئ طلب احتياج ديناميكي لاستقطاب أفضل المرشحين" icon="mdi-briefcase-plus-outline" />

    <VRow>
      <!-- Form -->
      <VCol cols="12" lg="8">
        <VAlert v-if="errorMsg" type="error" variant="tonal" density="compact" class="mb-4">{{ errorMsg }}</VAlert>

        <VForm @submit.prevent="publish">
          <VCard class="pa-5 mb-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-4">
              <VIcon icon="mdi-information-outline" color="primary" class="me-1" /> المعلومات الأساسية
            </h3>
            <VRow dense>
              <VCol cols="12" md="6"><VTextField v-model="title" label="المسمى الوظيفي *" /></VCol>
              <VCol cols="12" md="6"><VSelect v-model="department" label="المجال / القطاع *" :items="departmentOptions" :hint="departmentHint" persistent-hint /></VCol>
              <VCol cols="12" md="6"><VTextField v-model="location" label="الموقع" prepend-inner-icon="mdi-map-marker-outline" /></VCol>
              <VCol cols="12" md="6"><VSelect v-model="type" label="نوع الفرصة" :items="typeOptions" /></VCol>
              <VCol cols="12"><VTextarea v-model="description" label="وصف الفرصة" rows="3" /></VCol>
            </VRow>
          </VCard>

          <VCard class="pa-5 mb-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-4">
              <VIcon icon="mdi-checkbox-marked-circle-outline" color="primary" class="me-1" /> المتطلبات
            </h3>
            <VRow dense>
              <VCol cols="12"><VCombobox v-model="skills" label="المهارات المطلوبة" multiple chips closable-chips /></VCol>
              <VCol cols="12" md="6"><VSelect v-model="educationLevel" label="المستوى التعليمي" :items="educationOptions" /></VCol>
              <VCol cols="12" md="6"><VTextField v-model.number="experienceYears" label="سنوات الخبرة المطلوبة" type="number" /></VCol>
            </VRow>

            <!-- AI auto-classification -->
            <VAlert v-if="hasInput && classification.category" color="secondary" variant="tonal" density="comfortable" class="mt-2" border="start">
              <div class="d-flex align-center ga-2 mb-1">
                <VIcon icon="mdi-robot-happy-outline" size="20" />
                <span class="text-body-2">صنّف الـAI هذه الفرصة تلقائيًا تحت: <strong>{{ classification.categoryLabel }}</strong></span>
              </div>
              <div v-if="suggestedSkills.length" class="d-flex align-center flex-wrap ga-1 mt-2">
                <span class="text-caption text-medium-emphasis">مهارات مقترحة:</span>
                <VChip v-for="s in suggestedSkills" :key="s" size="x-small" color="secondary" @click="addSuggestedSkill(s)">
                  <VIcon icon="mdi-plus" start size="12" />{{ s }}
                </VChip>
              </div>
            </VAlert>

            <!-- حوكمة التصنيف: تنبيه المراجعة الإدارية -->
            <VAlert v-if="hasInput && governance.needsReview" color="warning" variant="tonal" density="comfortable" class="mt-2" border="start" icon="mdi-alert-outline">
              <span class="text-body-2">هذه الفرصة قد تحتاج مراجعة تصنيف: <strong>{{ governance.reason }}</strong>. ستُحال تلقائيًّا لطابور المراجعة عند النشر.</span>
            </VAlert>
          </VCard>

          <VCard class="pa-5 mb-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-4">
              <VIcon icon="mdi-cash-multiple" color="primary" class="me-1" /> المزايا والحوافز
            </h3>
            <VRow dense>
              <VCol cols="12" md="6"><VTextField v-model.number="salaryFrom" label="الراتب من" type="number" suffix="ريال" /></VCol>
              <VCol cols="12" md="6"><VTextField v-model.number="salaryTo" label="الراتب إلى" type="number" suffix="ريال" /></VCol>
              <VCol cols="12"><VSelect v-model="benefits" label="البدلات" :items="benefitOptions" multiple chips /></VCol>
            </VRow>
          </VCard>

          <VCard class="pa-5 mb-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-4">
              <VIcon icon="mdi-tune" color="primary" class="me-1" /> آلية التواصل وخيارات إضافية
            </h3>
            <VSelect v-model="channels" label="قنوات التواصل" :items="channelOptions" multiple chips class="mb-2" />
            <VSwitch v-model="blindReview" label="تفعيل التقييم الأعمى (إخفاء الأسماء والصور)" color="secondary" hide-details />
          </VCard>

          <div class="d-flex flex-wrap justify-end ga-2">
            <VBtn variant="outlined" color="primary" prepend-icon="mdi-eye-outline" @click="openPreview">معاينة</VBtn>
            <VBtn variant="tonal" color="secondary" prepend-icon="mdi-content-save-outline" @click="saveDraft">حفظ كمسودة</VBtn>
            <VBtn type="submit" color="accent" prepend-icon="mdi-publish">نشر الفرصة</VBtn>
          </div>
        </VForm>
      </VCol>

      <!-- Posted opportunities -->
      <VCol cols="12" lg="4">
        <VCard class="pa-4">
          <div class="d-flex align-center justify-space-between mb-3">
            <h3 class="text-subtitle-1 font-weight-bold">فرصك ({{ store.opportunities.length }})</h3>
            <div class="d-flex ga-1">
              <VChip size="x-small" color="success" label>{{ store.publishedCount }} منشورة</VChip>
              <VChip size="x-small" color="warning" label>{{ store.draftCount }} مسودة</VChip>
            </div>
          </div>
          <VList class="py-0">
            <template v-for="(o, i) in store.opportunities" :key="o.id">
              <VListItem class="px-1">
                <VListItemTitle class="text-body-2 font-weight-bold">{{ o.title }}</VListItemTitle>
                <VListItemSubtitle class="text-caption">
                  {{ o.type }} · {{ o.location }} · {{ o.applicants }} متقدم
                </VListItemSubtitle>
                <template #append>
                  <div class="d-flex flex-column align-end ga-1">
                    <VChip :color="o.status === 'published' ? 'success' : 'warning'" size="x-small" label>
                      {{ o.status === 'published' ? 'منشورة' : 'مسودة' }}
                    </VChip>
                    <div>
                      <VBtn v-if="o.status === 'draft'" icon="mdi-publish" variant="text" size="x-small" color="success" @click="store.publish(o.id)" />
                      <VBtn icon="mdi-delete-outline" variant="text" size="x-small" color="error" @click="store.remove(o.id)" />
                    </div>
                  </div>
                </template>
              </VListItem>
              <VDivider v-if="i < store.opportunities.length - 1" />
            </template>
          </VList>
        </VCard>
      </VCol>
    </VRow>

    <!-- Preview dialog -->
    <VDialog v-model="previewDialog" max-width="600">
      <VCard>
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>معاينة الفرصة (كما يراها المرشح)</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="previewDialog = false" />
        </VCardTitle>
        <VCardText>
          <div class="d-flex align-center ga-3 mb-3">
            <VAvatar color="primary" variant="tonal" rounded="lg" size="52"><VIcon icon="mdi-domain" /></VAvatar>
            <div>
              <div class="text-h6 font-weight-bold">{{ title }}</div>
              <div class="text-body-2 text-medium-emphasis">شركتك · {{ location || 'غير محدد' }}</div>
            </div>
          </div>
          <div class="d-flex flex-wrap ga-2 mb-3">
            <VChip size="small" variant="tonal" prepend-icon="mdi-briefcase-outline">{{ typeLabel }}</VChip>
            <VChip size="small" variant="tonal" prepend-icon="mdi-office-building-outline">{{ department }}</VChip>
            <VChip size="small" variant="tonal" prepend-icon="mdi-cash">{{ salaryRange }}</VChip>
          </div>
          <p v-if="description" class="text-body-2 text-medium-emphasis mb-3">{{ description }}</p>
          <div v-if="skills.length" class="d-flex flex-wrap ga-1">
            <VChip v-for="s in skills" :key="s" size="x-small" color="secondary" variant="tonal">{{ s }}</VChip>
          </div>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="previewDialog = false">إغلاق</VBtn>
          <VBtn color="accent" prepend-icon="mdi-publish" @click="previewDialog = false; publish()">نشر</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar :model-value="!!snackbar" color="success" timeout="2500" @update:model-value="snackbar = ''">
      {{ snackbar }}
    </VSnackbar>
  </div>
</template>

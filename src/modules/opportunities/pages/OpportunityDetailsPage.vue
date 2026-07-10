<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EMPLOYMENT_TYPE_LABELS, EXPERIENCE_LEVEL_LABELS, formatSalary } from '../interfaces/Opportunity'
import { getOpportunityById, mockOpportunities } from '../services/mockOpportunities'
import { useApplicationsStore } from '@/stores/ApplicationsStore'
import { useSavedStore } from '@/stores/SavedStore'
import { useResumesStore } from '@/stores/ResumesStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { matchScore } from '@/services/matching'
import { opportunityMatchProfile, seekerMatchProfile } from '@/services/matchProfile'
import { useSectorContext } from '@/composables/useSectorContext'
import type { Opportunity } from '../interfaces/Opportunity'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseProgressRing from '@/components/ui/BaseProgressRing.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'

const route = useRoute()
const router = useRouter()
const applicationsStore = useApplicationsStore()
const savedStore = useSavedStore()
const resumesStore = useResumesStore()

const opportunity = computed(() => getOpportunityById(Number(route.params.id)))
const similar = computed(() =>
  mockOpportunities
    .filter(o => o.id !== Number(route.params.id) && o.department === opportunity.value?.department)
    .slice(0, 3),
)

const applied = computed(() => (opportunity.value ? applicationsStore.hasApplied(opportunity.value.id) : false))
const isSaved = computed(() => (opportunity.value ? savedStore.isSaved(opportunity.value.id) : false))

// نسبة التطابق الحيّة (نفس محرّك بطاقة الفرصة)
const profile = useProfileStore()
const sector = useSectorContext()
const seeker = computed(() => seekerMatchProfile({
  skills: profile.skills.map(s => s.name),
  city: profile.prefs.location,
  opportunityType: profile.prefs.preferred_employment_types[0],
  ...sector.matchInput(),
}))
function liveMatch(o: Opportunity): number {
  return matchScore(seeker.value, opportunityMatchProfile(o)).score
}
const matchRate = computed(() => (opportunity.value ? liveMatch(opportunity.value) : 0))

const applyDialog = ref(false)
const appliedSnackbar = ref(false)
const resumes = computed(() => resumesStore.resumes)
const selectedResume = ref<number | null>(resumesStore.active?.id ?? null)

const breakdown = computed(() => {
  const b = opportunity.value?.matchBreakdown
  return [
    { label: 'المهارات', value: b?.skills ?? 0 },
    { label: 'الخبرات', value: b?.experience ?? 0 },
    { label: 'التعليم', value: b?.education ?? 0 },
    { label: 'الموقع', value: b?.location ?? 0 },
  ]
})

function openApply() {
  applyDialog.value = true
}
function confirmApply() {
  const resume = resumes.value.find(r => r.id === selectedResume.value)?.name ?? 'سيرة'
  if (opportunity.value)
    applicationsStore.apply(opportunity.value, resume)
  applyDialog.value = false
  appliedSnackbar.value = true
}
function askAboutOpportunity() {
  router.push({ name: 'messages' })
}
</script>

<template>
  <div v-if="opportunity">
    <BaseButton variant="ghost" size="sm" class="mb-3" @click="router.back()">
      <BaseIcon name="mdi-arrow-right" :size="18" /> رجوع
    </BaseButton>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      <!-- Main -->
      <div class="md:col-span-2">
        <BaseCard class="mb-4">
          <div class="mb-4 flex items-start justify-between">
            <div class="flex items-start gap-4">
              <BaseAvatar color="brand" :size="64" tonal square>
                <span class="text-3xl font-bold">{{ opportunity.companyInitial }}</span>
              </BaseAvatar>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h1 class="text-2xl font-bold">{{ opportunity.title }}</h1>
                  <BaseChip v-if="opportunity.isFeatured" color="accent">مميزة</BaseChip>
                </div>
                <div class="text-muted">{{ opportunity.company }}</div>
              </div>
            </div>
            <button
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-surfalt"
              :style="{ color: isSaved ? 'rgb(var(--v-theme-accent))' : 'rgba(var(--v-theme-on-surface), 0.6)' }"
              :aria-label="isSaved ? 'إزالة الحفظ' : 'حفظ'"
              @click="savedStore.toggle(opportunity.id)"
            >
              <BaseIcon :name="isSaved ? 'mdi-bookmark' : 'mdi-bookmark-outline'" :size="22" />
            </button>
          </div>

          <div class="mb-4 flex flex-wrap gap-2">
            <BaseChip color="neutral"><BaseIcon name="mdi-map-marker-outline" :size="14" /> {{ opportunity.location }}</BaseChip>
            <BaseChip color="neutral"><BaseIcon name="mdi-briefcase-outline" :size="14" /> {{ EMPLOYMENT_TYPE_LABELS[opportunity.type] }}</BaseChip>
            <BaseChip color="neutral"><BaseIcon name="mdi-chart-line" :size="14" /> {{ EXPERIENCE_LEVEL_LABELS[opportunity.level] }}</BaseChip>
            <BaseChip color="neutral"><BaseIcon name="mdi-cash" :size="14" /> {{ formatSalary(opportunity.salaryMin, opportunity.salaryMax) }}</BaseChip>
            <BaseChip color="neutral"><BaseIcon name="mdi-account-multiple-outline" :size="14" /> {{ opportunity.applicants }} متقدم</BaseChip>
          </div>

          <div class="mb-4 border-t border-ui" />

          <h3 class="mb-2 font-bold">وصف الفرصة</h3>
          <p class="mb-4 text-sm text-muted">{{ opportunity.description }}</p>

          <h3 class="mb-2 font-bold">المسؤوليات</h3>
          <ul class="mb-3 space-y-1">
            <li v-for="r in opportunity.responsibilities" :key="r" class="flex items-start gap-2 text-sm">
              <BaseIcon name="mdi-circle-small" :size="18" class="shrink-0 text-muted" /> <span>{{ r }}</span>
            </li>
          </ul>

          <h3 class="mb-2 font-bold">المتطلبات</h3>
          <ul class="mb-3 space-y-1">
            <li v-for="r in opportunity.requirements" :key="r" class="flex items-start gap-2 text-sm">
              <BaseIcon name="mdi-check-circle-outline" :size="18" class="shrink-0" style="color: rgb(var(--v-theme-success))" /> <span>{{ r }}</span>
            </li>
          </ul>

          <h3 class="mb-2 font-bold">المزايا</h3>
          <div class="mb-4 flex flex-wrap gap-2">
            <BaseChip v-for="b in opportunity.benefits" :key="b" color="success">
              <BaseIcon name="mdi-gift-outline" :size="14" /> {{ b }}
            </BaseChip>
          </div>

          <h3 class="mb-2 font-bold">المهارات المطلوبة</h3>
          <div class="flex flex-wrap gap-2">
            <BaseChip v-for="skill in opportunity.skills" :key="skill" color="emerald">{{ skill }}</BaseChip>
          </div>
        </BaseCard>

        <!-- Similar -->
        <template v-if="similar.length">
          <h3 class="mb-3 text-xl font-bold">فرص مشابهة</h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <BaseCard
              v-for="opp in similar"
              :key="opp.id"
              hover
              class="h-full cursor-pointer"
              @click="router.push({ name: 'opportunity-details', params: { id: opp.id } })"
            >
              <div class="truncate font-bold">{{ opp.title }}</div>
              <div class="text-xs text-muted">{{ opp.company }}</div>
              <BaseChip color="success" class="mt-2">{{ liveMatch(opp) }}% تطابق</BaseChip>
            </BaseCard>
          </div>
        </template>
      </div>

      <!-- Sidebar -->
      <div>
        <BaseCard class="mb-4">
          <div class="mb-3 text-center">
            <BaseProgressRing :value="matchRate" :size="110" :width="10" color="success" class="mx-auto">
              <span class="text-2xl font-bold">{{ matchRate }}%</span>
            </BaseProgressRing>
            <div class="mt-2 text-sm text-muted">نسبة تطابقك مع الفرصة</div>
          </div>

          <BaseButton variant="accent" size="lg" block :disabled="applied" @click="openApply">
            <BaseIcon :name="applied ? 'mdi-check' : 'mdi-send'" :size="18" /> {{ applied ? 'تم التقديم' : 'تقدّم الآن' }}
          </BaseButton>
          <BaseButton variant="outline" block class="mt-2" @click="askAboutOpportunity">
            <BaseIcon name="mdi-message-outline" :size="18" /> سؤال عن الفرصة
          </BaseButton>
        </BaseCard>

        <BaseCard>
          <div class="mb-3 font-bold">تحليل التطابق</div>
          <div v-for="item in breakdown" :key="item.label" class="mb-3">
            <div class="mb-1 flex justify-between text-sm">
              <span>{{ item.label }}</span>
              <span class="font-bold">{{ item.value }}%</span>
            </div>
            <BaseProgressBar :value="item.value" color="primary" :height="6" />
          </div>
          <div
            class="rounded-ui mt-2 border-s-4 p-3 text-xs"
            style="border-color: rgb(var(--v-theme-info)); background: rgba(var(--v-theme-info), 0.1)"
          >
            لتحسين تطابقك: أضف شهادة في {{ opportunity.skills[0] }} وأكمل اختبار المهارات ذي الصلة.
          </div>
        </BaseCard>
      </div>
    </div>

    <!-- Apply with resume dialog -->
    <BaseModal v-model="applyDialog" title="التقديم بسيرة ذاتية">
      <p class="mb-3 text-sm text-muted">اختر السيرة الذاتية التي تريد التقديم بها:</p>
      <button
        v-for="r in resumes"
        :key="r.id"
        class="rounded-ui mb-2 flex w-full items-center gap-3 border p-3 text-start transition"
        :class="selectedResume === r.id ? 'border-transparent' : 'border-ui hover:bg-surfalt'"
        :style="selectedResume === r.id ? { background: 'rgba(var(--v-theme-primary), 0.12)' } : {}"
        @click="selectedResume = r.id"
      >
        <BaseIcon
          :name="selectedResume === r.id ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
          :size="22"
          :style="selectedResume === r.id ? { color: 'rgb(var(--v-theme-primary))' } : { color: 'rgba(var(--v-theme-on-surface), 0.6)' }"
        />
        <div>
          <div class="text-sm font-bold">{{ r.name }}</div>
          <div class="text-xs text-muted">{{ r.template }} · {{ r.language }}</div>
        </div>
      </button>
      <BaseButton variant="tonal-emerald" block class="mt-2" :to="{ name: 'resume-builder' }">
        <BaseIcon name="mdi-plus" :size="18" /> إنشاء سيرة جديدة لهذه الفرصة
      </BaseButton>

      <template #actions>
        <BaseButton variant="ghost" @click="applyDialog = false">إلغاء</BaseButton>
        <BaseButton variant="accent" @click="confirmApply">
          <BaseIcon name="mdi-send" :size="18" /> تأكيد التقديم
        </BaseButton>
      </template>
    </BaseModal>

    <BaseSnackbar v-model="appliedSnackbar" color="success" :timeout="4000">
      تم إرسال طلبك بنجاح!
      <template #actions>
        <button class="font-bold underline" @click="router.push({ name: 'applications' })">عرض طلباتي</button>
      </template>
    </BaseSnackbar>
  </div>

  <BaseCard v-else class="py-12 text-center">
    <BaseIcon name="mdi-alert-circle-outline" :size="64" style="color: rgb(var(--v-theme-error))" />
    <div class="mt-3 text-xl font-bold">الفرصة غير موجودة</div>
    <BaseButton variant="brand" class="mt-3" :to="{ name: 'opportunities' }">العودة للفرص</BaseButton>
  </BaseCard>
</template>

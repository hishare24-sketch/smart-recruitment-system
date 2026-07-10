<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import { usePublicProfileStore } from '@/stores/PublicProfileStore'
import { useSectorContext } from '@/composables/useSectorContext'
import { dominantSector } from '@/services/matchProfile'
import { getSector } from '@/services/sectors'
import { sectorFacet } from '@/composables/sectorFacet'
import type { FacetSpec, SortSpec } from '@/composables/useFacetedList'
import FacetedList from '@/components/shared/FacetedList.vue'
import { uniq } from '@/utils/array'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

// ===== استكشاف الأشخاص — دليل الصفحات التعريفية العامة: بوابة هوية أهل المنصة =====
const { t } = useI18n()
const router = useRouter()
const pub = usePublicProfileStore()
const sector = useSectorContext()

// قطاع الشخص يُشتقّ من مهاراته (لا حقل قطاع صريح) ويُطبَّع إلى slug ليطابق الفاسِت
function personSector(skills: string[]): string | undefined {
  return getSector(dominantSector(skills))?.id
}

interface PersonCard {
  slug: string
  name: string
  initial: string
  headline: string
  location: string
  roles: string[]
  skills: string[]
  credibility: number
  followers: number
  rating: number
  /** صاحب الملف الحي في هذا العرض التجريبي */
  live?: boolean
}

/** دليل تجريبي — مع الربط الخلفي يصبح فهرس الصفحات العامة الحقيقي */
const people = computed<PersonCard[]>(() => [
  {
    slug: pub.state.slug,
    name: pub.displayName,
    initial: pub.displayName.trim().charAt(0),
    headline: pub.state.publicHeadline,
    location: pub.state.location,
    roles: ['باحث عن عمل', 'مقيّم معتمد'],
    skills: pub.publicSkills.map(s => s.name),
    credibility: 77,
    followers: pub.state.followersCount,
    rating: pub.avgRating,
    live: true,
  },
  { slug: 'reem-alqahtani', name: 'د. ريم القحطاني', initial: 'ر', headline: 'مستشارة قيادة وموارد بشرية · PMP', location: 'الرياض', roles: ['مستشارة', 'مقيّمة معتمدة'], skills: ['القيادة', 'الإدارة', 'التخطيط'], credibility: 91, followers: 482, rating: 4.8 },
  { slug: 'hind-alzahrani', name: 'أ. هند الزهراني', initial: 'ه', headline: 'مرشدة مسارات تقنية — التحول الوظيفي', location: 'جدة', roles: ['مرشدة مهنية'], skills: ['الإرشاد المهني', 'السير الذاتية', 'القيادة'], credibility: 84, followers: 356, rating: 4.9 },
  { slug: 'omar-bawazir', name: 'م. عمر باوزير', initial: 'ع', headline: 'مهندس بيانات أول · مستشار سوق البيانات', location: 'الظهران', roles: ['مستشار', 'مقيّم معتمد'], skills: ['هندسة البيانات', 'Python', 'SQL'], credibility: 88, followers: 267, rating: 4.5 },
  { slug: 'nouf-alshehri', name: 'م. نوف الشهري', initial: 'ن', headline: 'مدربة TypeScript معتمدة — ورش عملية', location: 'الرياض', roles: ['مدربة تقنية'], skills: ['TypeScript', 'Vue.js', 'الاختبارات'], credibility: 82, followers: 391, rating: 4.8 },
  { slug: 'sara-alotaibi', name: 'سارة العتيبي', initial: 'س', headline: 'مهندسة برمجيات — واجهات عالية الأداء', location: 'الرياض', roles: ['باحثة عن عمل'], skills: ['React', 'الأداء', 'إمكانية الوصول'], credibility: 73, followers: 128, rating: 4.4 },
  { slug: 'future-tech', name: 'شركة تقنية المستقبل', initial: 'ت', headline: 'نبني منتجات رقمية تخدم الملايين — نوظّف باستمرار', location: 'الرياض', roles: ['جهة توظيف'], skills: ['منتجات رقمية', 'React', 'Node.js'], credibility: 95, followers: 1240, rating: 4.6 },
  { slug: 'khalid-alharbi', name: 'خالد الحربي', initial: 'خ', headline: 'مطوّر ويب — شغوف بجودة الكود', location: 'مكة المكرمة', roles: ['باحث عن عمل'], skills: ['JavaScript', 'Node.js'], credibility: 61, followers: 54, rating: 4.1 },
])

// —— العقد الموحّد: القطاع (مشتقّ) + الدور + المدينة فاسِتات ——
const facets = computed<FacetSpec<PersonCard>[]>(() => [
  sectorFacet(p => personSector(p.skills), () => people.value),
  {
    key: 'role', label: t('discovery.people.facetRole'), kind: 'multi', value: p => p.roles,
    options: () => uniq(people.value.flatMap(p => p.roles)).map(r => ({ value: r, label: r })),
  },
  {
    key: 'city', label: t('discovery.city'), kind: 'multi', value: p => p.location,
    options: () => uniq(people.value.map(p => p.location)).map(c => ({ value: c, label: c })),
  },
])
const sorts = computed<SortSpec<PersonCard>[]>(() => [
  { key: 'followers', label: t('discovery.people.sortFollowers'), cmp: (a, b) => { const d = b.followers - a.followers; return d !== 0 ? d : sector.boost(personSector(b.skills)) - sector.boost(personSector(a.skills)) } },
  { key: 'credibility', label: t('discovery.people.sortCredibility'), cmp: (a, b) => b.credibility - a.credibility },
  { key: 'rating', label: t('discovery.sortRatingHigh'), cmp: (a, b) => b.rating - a.rating },
])
const primaryPreset = sector.mySectorsPreset
const personText = (p: PersonCard) => `${p.name} ${p.headline} ${p.skills.join(' ')}`

// —— فتح الملف: الحيّ يفتح صفحته، والتجريبي بطاقة معاينة ——
const previewPerson = ref<PersonCard | null>(null)
function open(p: PersonCard) {
  if (p.live)
    router.push(`/u/${p.slug}`)
  else
    previewPerson.value = p
}
</script>

<template>
  <div>
    <PageHeader
      :title="t('discovery.people.title')"
      :subtitle="t('discovery.people.subtitle')"
      icon="mdi-account-group-outline"
    />

    <FacetedList
      :items="people"
      :facets="facets"
      :sorts="sorts"
      :text="personText"
      :item-key="(p: PersonCard) => p.slug"
      view="grid"
      :primary-preset="primaryPreset"
      :noun="t('discovery.people.noun')"
      :search-placeholder="t('discovery.people.search')"
    >
      <template #item="{ item }">
        <template v-for="p in [item as PersonCard]" :key="p.slug">
          <BaseCard
            hover class="flex h-full cursor-pointer flex-col" role="button" tabindex="0"
            @click="open(p)"
            @keydown.enter="open(p)"
            @keydown.space.prevent="open(p)"
          >
            <div class="mb-2 flex items-center gap-3">
              <BaseAvatar color="brand" :size="48" tonal>
                <span class="text-lg font-bold">{{ p.initial }}</span>
              </BaseAvatar>
              <div class="flex-1">
                <div class="flex items-center gap-1">
                  <span class="font-bold text-content">{{ p.name }}</span>
                  <BaseChip v-if="p.live" color="success">{{ t('discovery.people.live') }}</BaseChip>
                </div>
                <div class="text-xs text-muted">{{ p.headline }}</div>
                <div class="text-xs text-muted"><BaseIcon name="mdi-map-marker-outline" :size="12" /> {{ p.location }}</div>
              </div>
            </div>

            <div class="mb-2 flex flex-wrap gap-1">
              <BaseChip v-for="r in p.roles" :key="r" color="emerald">{{ r }}</BaseChip>
            </div>
            <div class="mb-3 flex flex-wrap gap-1">
              <BaseChip v-for="sk in p.skills.slice(0, 3)" :key="sk" color="neutral">{{ sk }}</BaseChip>
            </div>

            <div class="mt-auto flex items-center gap-3 text-xs text-muted">
              <span :title="t('discovery.people.credibility')"><BaseIcon name="mdi-shield-check-outline" :size="14" style="color: rgb(var(--v-theme-primary))" /> {{ p.credibility }}%</span>
              <span :title="t('discovery.people.followers')"><BaseIcon name="mdi-account-group-outline" :size="14" style="color: rgb(var(--v-theme-accent))" /> {{ p.followers }}</span>
              <span :title="t('discovery.people.rating')"><BaseIcon name="mdi-star" :size="14" style="color: rgb(var(--v-theme-warning))" /> {{ p.rating }}</span>
              <BaseIcon name="mdi-arrow-left-circle-outline" :size="18" class="ms-auto" style="color: rgb(var(--v-theme-primary))" />
            </div>
          </BaseCard>
        </template>
      </template>
    </FacetedList>

    <!-- CTA: صفحتك أنت -->
    <div class="brand-gradient rounded-ui-lg mt-4 p-5 text-center">
      <p class="mb-3 text-white">{{ t('discovery.people.ctaBanner') }}</p>
      <BaseButton variant="accent" :to="{ name: 'public-profile-manage' }">{{ t('discovery.people.manageProfile') }}</BaseButton>
    </div>

    <!-- معاينة ملف تجريبي -->
    <BaseModal :model-value="!!previewPerson" :max-width="420" @update:model-value="previewPerson = null">
      <div v-if="previewPerson">
        <div class="mb-3 flex items-center gap-3">
          <BaseAvatar color="brand" :size="56" tonal><span class="text-xl font-bold">{{ previewPerson.initial }}</span></BaseAvatar>
          <div>
            <div class="font-bold text-content">{{ previewPerson.name }}</div>
            <div class="text-xs text-muted">{{ previewPerson.headline }}</div>
          </div>
        </div>
        <div class="mb-3 flex gap-3 text-xs text-muted">
          <span><BaseIcon name="mdi-shield-check-outline" :size="14" style="color: rgb(var(--v-theme-primary))" /> {{ t('discovery.people.credibilityValue', { value: previewPerson.credibility }) }}</span>
          <span><BaseIcon name="mdi-account-group-outline" :size="14" style="color: rgb(var(--v-theme-accent))" /> {{ t('discovery.people.followersCount', { count: previewPerson.followers }) }}</span>
          <span><BaseIcon name="mdi-star" :size="14" style="color: rgb(var(--v-theme-warning))" /> {{ previewPerson.rating }}</span>
        </div>
        <div class="mb-3 flex flex-wrap gap-1">
          <BaseChip v-for="sk in previewPerson.skills" :key="sk" color="brand">{{ sk }}</BaseChip>
        </div>
        <div class="rounded-ui mb-3 border-s-4 p-3 text-xs" style="border-color: rgb(var(--v-theme-secondary)); background: rgba(var(--v-theme-secondary), 0.1)">
          {{ t('discovery.people.demoNote') }}
        </div>
        <BaseButton variant="tonal-brand" block @click="previewPerson = null">{{ t('discovery.close') }}</BaseButton>
      </div>
    </BaseModal>
  </div>
</template>

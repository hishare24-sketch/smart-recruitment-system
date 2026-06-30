<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/AuthStore'

const authStore = useAuthStore()
const user = computed(() => authStore.authUser)
const tab = ref('skills')

const skills = ref([
  { name: 'Vue.js', level: 5 },
  { name: 'TypeScript', level: 4 },
  { name: 'UI/UX', level: 4 },
  { name: 'Node.js', level: 3 },
])

const experiences = [
  { title: 'مطوّر واجهات أمامية أول', company: 'شركة تقنية المستقبل', period: '2022 - الآن', desc: 'قيادة تطوير منصات الويب باستخدام Vue 3.' },
  { title: 'مطوّر ويب', company: 'استوديو رؤية', period: '2019 - 2022', desc: 'بناء واجهات تفاعلية وتحسين الأداء.' },
]

const certificates = [
  { name: 'Vue.js Professional', issuer: 'Vue School', date: '2023' },
  { name: 'TypeScript Deep Dive', issuer: 'Frontend Masters', date: '2022' },
]

const resumes = [
  { name: 'سيرة تقنية - حديث', template: 'حديث', lang: 'عربي', active: true },
  { name: 'Technical CV - Modern', template: 'Modern', lang: 'English', active: false },
]

const endorsements = [
  { name: 'أحمد المنصور', relation: 'مدير سابق', type: 'نص', trusted: true },
  { name: 'سارة العتيبي', relation: 'زميلة', type: 'فيديو', trusted: false },
]

const privacySettings = ref([
  { label: 'ظهور الملف الشخصي', value: 'public' },
  { label: 'ظهور التوصيات', value: 'companies' },
  { label: 'ظهور نتائج الاختبارات', value: 'private' },
  { label: 'ظهور الرغبات الواردة', value: 'private' },
  { label: 'ظهور السير الذاتية', value: 'public' },
  { label: 'إشعارات التواصل', value: 'public' },
  { label: 'مشاركة البيانات للتحليل', value: 'public' },
])

const privacyOptions = [
  { value: 'public', title: 'عام' },
  { value: 'companies', title: 'لأصحاب العمل' },
  { value: 'private', title: 'خاص' },
]

const initials = computed(() => user.value?.name?.charAt(0).toUpperCase() ?? '?')
</script>

<template>
  <div>
    <!-- Header card -->
    <VCard class="mb-5 overflow-hidden">
      <div class="brand-gradient" style="height: 110px" />
      <VCardText class="pt-0">
        <div class="d-flex align-end flex-wrap ga-4" style="margin-top: -48px">
          <VAvatar color="secondary" size="96" class="border-md" style="border: 4px solid white">
            <span class="text-h4 text-white font-weight-bold">{{ initials }}</span>
          </VAvatar>
          <div class="flex-grow-1 pb-2">
            <h1 class="text-h5 font-weight-bold">
              {{ user?.name }}
            </h1>
            <div class="text-body-2 text-medium-emphasis">
              مطوّر واجهات أمامية · الرياض
            </div>
          </div>
          <div class="d-flex ga-2 pb-2">
            <VBtn color="primary" variant="outlined" prepend-icon="mdi-share-variant-outline">
              مشاركة الملف
            </VBtn>
            <VBtn color="accent" prepend-icon="mdi-pencil">
              تعديل
            </VBtn>
          </div>
        </div>
        <p class="text-body-2 text-medium-emphasis mt-4 mb-0" style="max-width: 700px">
          مطوّر شغوف ببناء تجارب مستخدم سلسة وأنظمة قابلة للتوسّع. خبرة 5 سنوات في تطوير الواجهات الأمامية الحديثة.
        </p>
      </VCardText>
    </VCard>

    <VTabs v-model="tab" color="primary" class="mb-4" show-arrows>
      <VTab value="skills" prepend-icon="mdi-star-outline">المهارات</VTab>
      <VTab value="experience" prepend-icon="mdi-briefcase-outline">الخبرات</VTab>
      <VTab value="certificates" prepend-icon="mdi-certificate-outline">الشهادات</VTab>
      <VTab value="endorsements" prepend-icon="mdi-account-star-outline">التوصيات</VTab>
      <VTab value="resumes" prepend-icon="mdi-file-account-outline">السير الذاتية</VTab>
      <VTab value="privacy" prepend-icon="mdi-shield-lock-outline">الخصوصية</VTab>
    </VTabs>

    <VWindow v-model="tab">
      <!-- Skills -->
      <VWindowItem value="skills">
        <VCard class="pa-5">
          <div class="d-flex justify-space-between mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">المهارات</h3>
            <VBtn color="accent" size="small" prepend-icon="mdi-plus">إضافة مهارة</VBtn>
          </div>
          <div v-for="skill in skills" :key="skill.name" class="mb-3">
            <div class="d-flex justify-space-between mb-1">
              <span class="text-body-2 font-weight-medium">{{ skill.name }}</span>
              <VRating :model-value="skill.level" color="accent" density="compact" size="small" readonly />
            </div>
            <VProgressLinear :model-value="skill.level * 20" color="primary" height="6" rounded />
          </div>
        </VCard>
      </VWindowItem>

      <!-- Experience -->
      <VWindowItem value="experience">
        <VCard class="pa-5">
          <div class="d-flex justify-space-between mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">الخبرات العملية</h3>
            <VBtn color="accent" size="small" prepend-icon="mdi-plus">إضافة خبرة</VBtn>
          </div>
          <VTimeline side="end" density="compact" align="start">
            <VTimelineItem v-for="exp in experiences" :key="exp.title" dot-color="primary" size="small">
              <div class="text-subtitle-2 font-weight-bold">{{ exp.title }}</div>
              <div class="text-body-2 text-secondary">{{ exp.company }} · {{ exp.period }}</div>
              <div class="text-body-2 text-medium-emphasis mt-1">{{ exp.desc }}</div>
            </VTimelineItem>
          </VTimeline>
        </VCard>
      </VWindowItem>

      <!-- Certificates -->
      <VWindowItem value="certificates">
        <VCard class="pa-5">
          <div class="d-flex justify-space-between mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">الشهادات والدورات</h3>
            <VBtn color="accent" size="small" prepend-icon="mdi-plus">إضافة</VBtn>
          </div>
          <VRow>
            <VCol v-for="cert in certificates" :key="cert.name" cols="12" sm="6">
              <VCard variant="outlined" class="pa-3 d-flex align-center ga-3">
                <VAvatar color="success" variant="tonal" rounded="lg">
                  <VIcon icon="mdi-certificate-outline" />
                </VAvatar>
                <div>
                  <div class="text-body-2 font-weight-bold">{{ cert.name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ cert.issuer }} · {{ cert.date }}</div>
                </div>
              </VCard>
            </VCol>
          </VRow>
        </VCard>
      </VWindowItem>

      <!-- Endorsements -->
      <VWindowItem value="endorsements">
        <VCard class="pa-5">
          <div class="d-flex justify-space-between mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">التوصيات والتزكيات</h3>
            <VBtn color="accent" size="small" prepend-icon="mdi-plus">طلب توصية</VBtn>
          </div>
          <VRow>
            <VCol v-for="e in endorsements" :key="e.name" cols="12" sm="6">
              <VCard variant="outlined" class="pa-3">
                <div class="d-flex align-center ga-3">
                  <VAvatar color="secondary" variant="tonal">
                    <VIcon icon="mdi-account" />
                  </VAvatar>
                  <div class="flex-grow-1">
                    <div class="text-body-2 font-weight-bold">
                      {{ e.name }}
                      <VIcon v-if="e.trusted" icon="mdi-check-decagram" color="success" size="16" />
                    </div>
                    <div class="text-caption text-medium-emphasis">{{ e.relation }}</div>
                  </div>
                  <VChip size="x-small" label prepend-icon="mdi-format-quote-close">{{ e.type }}</VChip>
                </div>
              </VCard>
            </VCol>
          </VRow>
        </VCard>
      </VWindowItem>

      <!-- Resumes -->
      <VWindowItem value="resumes">
        <VCard class="pa-5">
          <div class="d-flex justify-space-between mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">السير الذاتية المنشأة</h3>
            <VBtn color="accent" size="small" prepend-icon="mdi-plus" :to="{ name: 'resume-builder' }">
              إنشاء سيرة
            </VBtn>
          </div>
          <VList>
            <VListItem v-for="r in resumes" :key="r.name" class="px-2">
              <template #prepend>
                <VAvatar color="primary" variant="tonal" rounded="lg">
                  <VIcon icon="mdi-file-account-outline" />
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-bold">
                {{ r.name }}
                <VChip v-if="r.active" color="success" size="x-small" label class="ms-1">نشطة</VChip>
              </VListItemTitle>
              <VListItemSubtitle>{{ r.template }} · {{ r.lang }}</VListItemSubtitle>
              <template #append>
                <VBtn icon="mdi-download" variant="text" size="small" />
                <VBtn icon="mdi-share-variant" variant="text" size="small" />
                <VBtn icon="mdi-pencil" variant="text" size="small" />
              </template>
            </VListItem>
          </VList>
        </VCard>
      </VWindowItem>

      <!-- Privacy -->
      <VWindowItem value="privacy">
        <VCard class="pa-5">
          <h3 class="text-subtitle-1 font-weight-bold mb-4">إعدادات الخصوصية</h3>
          <div v-for="(s, i) in privacySettings" :key="i" class="d-flex align-center justify-space-between py-2">
            <span class="text-body-2">{{ s.label }}</span>
            <VBtnToggle v-model="s.value" mandatory density="compact" color="primary" variant="outlined">
              <VBtn v-for="opt in privacyOptions" :key="opt.value" :value="opt.value" size="small">
                {{ opt.title }}
              </VBtn>
            </VBtnToggle>
          </div>
        </VCard>
      </VWindowItem>
    </VWindow>
  </div>
</template>

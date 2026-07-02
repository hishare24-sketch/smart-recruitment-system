<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { useEndorserStore } from '@/stores/EndorserStore'

const router = useRouter()
const route = useRoute()
const store = useEndorserStore()

const requestId = computed(() => (route.query.request ? Number(route.query.request) : null))
const candidate = computed(() => (requestId.value ? store.getRequest(requestId.value) : null))
const candidateName = computed(() => candidate.value?.name ?? 'أحمد المنصور')

const type = ref('text')
const content = ref('')
const relation = ref('')
const knownDuration = ref('')

const typeOptions = [
  { value: 'text', title: 'نصية', icon: 'mdi-format-text' },
  { value: 'audio', title: 'تسجيل صوتي', icon: 'mdi-microphone' },
  { value: 'video', title: 'فيديو', icon: 'mdi-video' },
  { value: 'document', title: 'مستند', icon: 'mdi-file-document' },
]

const aiQuestions = ref([
  { q: 'كيف يتعامل مع الضغط؟', a: '' },
  { q: 'اذكر إنجازاً مميزاً له', a: '' },
  { q: 'كيف هي علاقته بالفريق؟', a: '' },
])

const typeLabels: Record<string, string> = { text: 'نص', audio: 'صوت', video: 'فيديو', document: 'مستند' }
const snackbar = ref(false)

function submit() {
  store.submit(requestId.value, typeLabels[type.value] ?? 'نص')
  snackbar.value = true
  setTimeout(() => router.push({ name: 'endorser-home' }), 1200)
}
</script>

<template>
  <div>
    <VBtn variant="text" prepend-icon="mdi-arrow-right" class="mb-3" @click="router.back()">رجوع</VBtn>
    <PageHeader
      title="إضافة توصية"
      :subtitle="`لـ ${candidateName}`"
      icon="mdi-account-star-outline"
    />

    <VForm @submit.prevent="submit">
      <!-- Candidate info -->
      <VCard class="pa-5 mb-4">
        <div class="d-flex align-center ga-3 mb-4">
          <VAvatar color="secondary" size="48"><span class="font-weight-bold">{{ candidateName.charAt(0) }}</span></VAvatar>
          <div>
            <div class="text-subtitle-1 font-weight-bold">{{ candidateName }}</div>
            <div class="text-caption text-medium-emphasis">{{ candidate?.relation ?? 'مرشح' }}</div>
          </div>
        </div>
        <VRow dense>
          <VCol cols="12" md="6">
            <VTextField v-model="relation" label="علاقتك به" placeholder="مثال: مدير سابق" />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField v-model="knownDuration" label="مدة معرفتك به" placeholder="مثال: سنتان" />
          </VCol>
        </VRow>
      </VCard>

      <!-- Type -->
      <VCard class="pa-5 mb-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-3">نوع التوصية</h3>
        <VRow dense>
          <VCol v-for="opt in typeOptions" :key="opt.value" cols="6" md="3">
            <VCard
              :variant="type === opt.value ? 'flat' : 'outlined'"
              :color="type === opt.value ? 'primary' : undefined"
              class="pa-3 text-center cursor-pointer"
              @click="type = opt.value"
            >
              <VIcon :icon="opt.icon" size="28" :color="type === opt.value ? undefined : 'primary'" />
              <div class="text-caption mt-1">{{ opt.title }}</div>
            </VCard>
          </VCol>
        </VRow>

        <div class="mt-4">
          <VTextarea v-if="type === 'text'" v-model="content" label="نص التوصية" rows="4" />
          <VCard v-else variant="outlined" class="pa-6 text-center">
            <VIcon :icon="type === 'audio' ? 'mdi-microphone' : type === 'video' ? 'mdi-video' : 'mdi-cloud-upload-outline'" size="40" color="primary" />
            <div class="text-body-2 mt-2">
              {{ type === 'audio' ? 'اضغط للتسجيل الصوتي' : type === 'video' ? 'ارفع أو سجّل فيديو' : 'ارفع مستنداً (PDF/صورة)' }}
            </div>
            <VBtn color="primary" variant="tonal" size="small" class="mt-3">
              {{ type === 'document' ? 'اختيار ملف' : 'بدء' }}
            </VBtn>
          </VCard>
        </div>
      </VCard>

      <!-- AI questions -->
      <VCard class="pa-5 mb-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-1">
          <VIcon icon="mdi-robot-happy-outline" color="secondary" class="me-1" /> أسئلة تقييمية (اختيارية)
        </h3>
        <p class="text-caption text-medium-emphasis mb-3">تساعد الـ AI على بناء صورة أدق عن المرشح</p>
        <div v-for="(item, i) in aiQuestions" :key="i" class="mb-3">
          <VTextField v-model="item.a" :label="item.q" variant="outlined" density="comfortable" />
        </div>
      </VCard>

      <div class="d-flex justify-end">
        <VBtn type="submit" color="accent" size="large" prepend-icon="mdi-send">إرسال التوصية</VBtn>
      </div>
    </VForm>

    <VSnackbar v-model="snackbar" color="success" timeout="1200">
      تم إرسال التوصية بنجاح!
    </VSnackbar>
  </div>
</template>

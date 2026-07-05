<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { SEEKER_PERSONAS, SEEKER_PERSONA_META } from '@/services/personas'
import type { SeekerPersona } from '@/services/personas'
import { usePersonaStore } from '@/stores/PersonaStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'

const router = useRouter()
const personaStore = usePersonaStore()
const persona = ref<SeekerPersona>(personaStore.state.seekerPersona)

// الخطوة 0 تفاعلية (اختيار الشخصية)، والبقية تعريفية
const infoSteps = [
  { icon: 'mdi-account-edit-outline', title: 'أضف معلوماتك الأساسية', desc: 'أكمل ملفك الشخصي بصورة ونبذة تعريفية لتبرز أمام الجهات.' },
  { icon: 'mdi-star-plus-outline', title: 'أضف مهاراتك وخبراتك', desc: 'سجّل مهاراتك وخبراتك العملية لنرشّح لك الفرص الأنسب.' },
  { icon: 'mdi-account-star-outline', title: 'اطلب توصيات (اختياري)', desc: 'توصيات موثّقة من زملائك ترفع مصداقية ملفك.' },
  { icon: 'mdi-tune', title: 'اختر رغباتك المهنية', desc: 'حدّد نوع الوظائف والمجالات والمناطق المفضّلة لديك.' },
  { icon: 'mdi-file-account-outline', title: 'أنشئ سيرتك الذاتية الأولى', desc: 'استخدم المنشئ الذكي لإنشاء سيرة احترافية في دقائق.' },
  { icon: 'mdi-briefcase-search-outline', title: 'ابدأ باستكشاف الفرص', desc: 'تصفّح الفرص الموصى بها وتقدّم بنقرة واحدة.' },
]

const totalSteps = infoSteps.length + 1
const step = ref(0)
const isPersonaStep = computed(() => step.value === 0)
const isLast = computed(() => step.value === totalSteps - 1)
const info = computed(() => infoSteps[step.value - 1])

function next() {
  if (isPersonaStep.value)
    personaStore.setSeekerPersona(persona.value)
  if (isLast.value)
    finish()
  else step.value++
}
function skip() {
  finish()
}
function finish() {
  personaStore.setSeekerPersona(persona.value)
  localStorage.setItem('onboardingDone', '1')
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-bg p-4">
    <BaseCard class="w-full text-center" :class="isPersonaStep ? 'max-w-2xl' : 'max-w-lg'">
      <!-- progress dots -->
      <div class="mb-6 flex justify-center gap-1">
        <div
          v-for="i in totalSteps"
          :key="i"
          class="h-1.5 rounded-full transition-all"
          :style="{ width: (i - 1) === step ? '28px' : '10px', background: (i - 1) <= step ? 'rgb(var(--v-theme-accent))' : 'rgb(var(--v-theme-surface-variant))' }"
        />
      </div>

      <!-- الخطوة 0: اختيار شخصية الباحث -->
      <template v-if="isPersonaStep">
        <h1 class="mb-1 text-2xl font-bold">أيّ نوع باحث أنت؟</h1>
        <p class="mb-6 text-muted">نخصّص لك التجربة والفرص والشارات حسب اختيارك (يمكنك تغييره لاحقًا).</p>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button
            v-for="p in SEEKER_PERSONAS"
            :key="p"
            class="rounded-ui flex flex-col items-center gap-2 border p-4 text-center transition"
            :class="persona === p ? 'border-transparent' : 'border-ui hover:bg-surfalt'"
            :style="persona === p ? { background: 'rgba(var(--v-theme-primary), 0.12)' } : {}"
            @click="persona = p"
          >
            <BaseIcon :name="SEEKER_PERSONA_META[p].icon" :size="28" :style="{ color: persona === p ? 'rgb(var(--v-theme-primary))' : 'rgba(var(--v-theme-on-surface), 0.7)' }" />
            <span class="text-sm font-bold">{{ SEEKER_PERSONA_META[p].label }}</span>
          </button>
        </div>
        <p class="mt-4 text-xs text-muted">{{ SEEKER_PERSONA_META[persona].desc }}</p>
      </template>

      <!-- الخطوات التعريفية -->
      <template v-else>
        <BaseAvatar color="brand" :size="88" tonal square class="mx-auto mb-5">
          <BaseIcon :name="info.icon" :size="46" />
        </BaseAvatar>
        <h1 class="mb-2 text-2xl font-bold">{{ info.title }}</h1>
        <p class="mb-8 text-muted">{{ info.desc }}</p>
      </template>

      <BaseButton variant="accent" size="lg" block class="mt-6" @click="next">
        {{ isLast ? 'ابدأ الآن' : 'التالي' }} <BaseIcon :name="isLast ? 'mdi-check' : 'mdi-arrow-left'" :size="18" />
      </BaseButton>
      <BaseButton variant="ghost" class="mt-2" @click="skip">تخطّي</BaseButton>

      <div class="mt-4 text-xs text-muted">الخطوة {{ step + 1 }} من {{ totalSteps }}</div>
    </BaseCard>
  </div>
</template>

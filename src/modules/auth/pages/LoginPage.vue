<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { landingFor } from '@/services/roles'
import { useAuthStore } from '@/stores/AuthStore'
import { authService, realAuthEnabled } from '../services/AuthService'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(true)
const isLoading = ref(false)
const error = ref('')
const touched = ref(false)

// خطأ حقلي يظهر بعد أول محاولة إرسال (بديل :rules في Vuetify)
const emailError = computed(() => (touched.value && !/.+@.+\..+/.test(email.value) ? 'البريد الإلكتروني غير صحيح' : ''))

async function submit() {
  error.value = ''
  touched.value = true
  if (!email.value || !password.value) {
    error.value = 'يرجى إدخال البريد وكلمة المرور'
    return
  }
  isLoading.value = true
  try {
    const user = await authService.login({ email: email.value, password: password.value })
    authStore.setAuthUser(user)
    // مالك دورين نشطين فأكثر يهبط على المركز الموحّد؛ أحادي الدور على لوحته مباشرة
    const redirect = route.query.redirect as string | undefined
    if (redirect)
      router.push(redirect)
    else
      router.push({ name: landingFor(authStore.role, authStore.activeRoles.length) })
  }
  catch (e) {
    error.value = (e as Error).message || 'فشل تسجيل الدخول. تحقق من بياناتك.'
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="mb-1 text-3xl font-bold">
      {{ t('auth.login') }}
    </h2>
    <p class="mb-6 text-muted">
      {{ t('auth.loginSubtitle') }}
    </p>

    <div
      v-if="error"
      class="rounded-ui mb-4 border-s-4 p-3 text-sm"
      style="border-color: rgb(var(--v-theme-error)); background: rgba(var(--v-theme-error), 0.1); color: rgb(var(--v-theme-error))"
    >
      {{ error }}
    </div>

    <form class="space-y-3" @submit.prevent="submit">
      <BaseInput
        v-model="email"
        :label="t('auth.email')"
        type="email"
        prefix-icon="mdi-email-outline"
        :error="emailError"
        autocomplete="email"
      />

      <BaseInput
        v-model="password"
        :label="t('auth.password')"
        :type="showPassword ? 'text' : 'password'"
        prefix-icon="mdi-lock-outline"
        autocomplete="current-password"
      >
        <template #suffix>
          <button type="button" class="text-muted" :aria-label="showPassword ? 'إخفاء' : 'إظهار'" @click="showPassword = !showPassword">
            <BaseIcon :name="showPassword ? 'mdi-eye-off' : 'mdi-eye'" :size="20" />
          </button>
        </template>
      </BaseInput>

      <div class="flex items-center justify-between">
        <BaseCheckbox v-model="rememberMe" :label="t('auth.rememberMe')" />
        <a class="cursor-pointer text-sm" style="color: rgb(var(--v-theme-secondary))">
          {{ t('auth.forgotPassword') }}
        </a>
      </div>

      <BaseButton type="submit" variant="accent" size="lg" block :loading="isLoading" class="mt-2">
        {{ t('auth.login') }}
      </BaseButton>
    </form>

    <div class="mt-6 text-center text-sm">
      {{ t('auth.noAccount') }}
      <RouterLink :to="{ name: 'register' }" class="font-bold" style="color: rgb(var(--v-theme-secondary))">
        {{ t('auth.register') }}
      </RouterLink>
    </div>

    <div
      class="rounded-ui mt-6 border-s-4 p-3 text-xs"
      style="border-color: rgb(var(--v-theme-info)); background: rgba(var(--v-theme-info), 0.1)"
    >
      <template v-if="realAuthEnabled">
        الحسابات حقيقية الآن — أنشئ حسابًا جديدًا أو ادخل بحساب سجّلته سابقًا.
      </template>
      <template v-else>
        تجربة: أدخل أي بريد وكلمة مرور. لتجربة دور آخر اكتب كلمة company أو admin داخل البريد.
      </template>
    </div>
  </div>
</template>

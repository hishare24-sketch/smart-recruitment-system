<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { UserRole } from '@/interfaces/Auth'
import { useAuthStore } from '@/stores/AuthStore'
import { useInterviewerBrandStore } from '@/stores/InterviewerBrandStore'
import { authService } from '../services/AuthService'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const roleOptions: { value: UserRole, icon: string }[] = [
  { value: 'seeker', icon: 'mdi-account-search' },
  { value: 'company', icon: 'mdi-domain' },
  { value: 'endorser', icon: 'mdi-account-star' },
]

const role = ref<UserRole>('seeker')
// Optional extra professional roles requested at sign-up (doc: multi-role platform)
const extraRoles = ref<UserRole[]>([])
const extraOptions = computed<{ value: UserRole, approval: boolean }[]>(() => {
  if (role.value === 'endorser')
    return []
  return (['company', 'interviewer'] as UserRole[])
    .filter(r => r !== role.value)
    .map(r => ({ value: r, approval: r === 'interviewer' }))
})
const name = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!name.value || !email.value || !password.value) {
    error.value = 'يرجى تعبئة الحقول المطلوبة'
    return
  }
  if (password.value !== passwordConfirm.value) {
    error.value = 'كلمتا المرور غير متطابقتين'
    return
  }
  isLoading.value = true
  try {
    const user = await authService.register({
      name: name.value,
      email: email.value,
      phone: phone.value,
      password: password.value,
      password_confirmation: passwordConfirm.value,
      role: role.value,
    })
    authStore.setAuthUser(user)
    // Extra roles chosen at sign-up: instant ones activate, approval ones stay pending
    extraRoles.value.forEach(r => authStore.requestRole(r))
    // Referral program: joining via an interviewer invite link credits the inviter
    const brand = useInterviewerBrandStore()
    if (route.query.ref === brand.state.referralCode)
      brand.creditReferral()
    // New seekers see the onboarding wizard; others go to their dashboard
    if (user.role === 'seeker')
      router.push({ name: 'onboarding' })
    else
      router.push({ name: 'dashboard' })
  }
  catch (e) {
    error.value = (e as Error).message || 'تعذّر إنشاء الحساب. حاول مرة أخرى.'
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="mb-1 text-3xl font-bold">
      {{ t('auth.register') }}
    </h2>
    <p class="mb-5 text-muted">
      {{ t('auth.registerSubtitle') }}
    </p>

    <div
      v-if="error"
      class="rounded-ui mb-4 border-s-4 p-3 text-sm"
      style="border-color: rgb(var(--v-theme-error)); background: rgba(var(--v-theme-error), 0.1); color: rgb(var(--v-theme-error))"
    >
      {{ error }}
    </div>

    <!-- Role selector -->
    <div class="mb-2 text-sm font-bold">
      {{ t('auth.selectRole') }}
    </div>
    <div class="mb-2 grid grid-cols-3 gap-2">
      <button
        v-for="opt in roleOptions"
        :key="opt.value"
        type="button"
        class="rounded-ui border p-3 text-center transition"
        :class="role === opt.value ? 'bg-brand text-on-brand border-transparent' : 'border-ui hover:bg-surfalt'"
        @click="role = opt.value"
      >
        <BaseIcon :name="opt.icon" :size="28" :style="role === opt.value ? {} : { color: 'rgb(var(--v-theme-primary))' }" />
        <div class="mt-1 text-xs">
          {{ t(`roles.${opt.value}`) }}
        </div>
      </button>
    </div>
    <p class="mb-3 text-xs text-muted">
      {{ t(`roleSwitcher.${role}Desc`) }}
    </p>

    <!-- Optional extra roles (multi-role platform) -->
    <template v-if="extraOptions.length">
      <div class="mb-1 text-sm font-bold">
        {{ t('roleSwitcher.extraRoles') }}
      </div>
      <BaseCheckbox
        v-for="opt in extraOptions"
        :key="opt.value"
        v-model="extraRoles"
        :value="opt.value"
      >
        <span class="inline-flex items-center gap-2">
          {{ t(`roles.${opt.value}`) }}
          <BaseChip v-if="opt.approval" color="warning">{{ t('roleSwitcher.pending') }}</BaseChip>
        </span>
      </BaseCheckbox>
      <p class="mb-2 mt-1 text-xs text-muted">
        {{ t('roleSwitcher.extraRolesHint') }}
      </p>
    </template>

    <form class="mt-3 space-y-3" @submit.prevent="submit">
      <BaseInput v-model="name" :label="t('auth.name')" prefix-icon="mdi-account-outline" autocomplete="name" />
      <BaseInput v-model="email" :label="t('auth.email')" type="email" prefix-icon="mdi-email-outline" autocomplete="email" />
      <BaseInput v-model="phone" :label="t('auth.phone')" prefix-icon="mdi-phone-outline" autocomplete="tel" />
      <BaseInput
        v-model="password"
        :label="t('auth.password')"
        :type="showPassword ? 'text' : 'password'"
        prefix-icon="mdi-lock-outline"
        autocomplete="new-password"
      >
        <template #suffix>
          <button type="button" class="text-muted" :aria-label="showPassword ? 'إخفاء' : 'إظهار'" @click="showPassword = !showPassword">
            <BaseIcon :name="showPassword ? 'mdi-eye-off' : 'mdi-eye'" :size="20" />
          </button>
        </template>
      </BaseInput>
      <BaseInput
        v-model="passwordConfirm"
        :label="t('auth.confirmPassword')"
        :type="showPassword ? 'text' : 'password'"
        prefix-icon="mdi-lock-check-outline"
        autocomplete="new-password"
      />

      <BaseButton type="submit" variant="accent" size="lg" block :loading="isLoading" class="mt-4">
        {{ t('auth.register') }}
      </BaseButton>
    </form>

    <div class="mt-5 text-center text-sm">
      {{ t('auth.haveAccount') }}
      <RouterLink :to="{ name: 'login' }" class="font-bold" style="color: rgb(var(--v-theme-secondary))">
        {{ t('auth.login') }}
      </RouterLink>
    </div>
  </div>
</template>

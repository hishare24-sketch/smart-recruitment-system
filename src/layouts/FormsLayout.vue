<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

function toggleLocale() {
  locale.value = locale.value === 'ar' ? 'en' : 'ar'
}
</script>

<template>
  <VMain>
    <VRow no-gutters class="fill-height" style="min-height: 100vh">
      <!-- Brand panel -->
      <VCol cols="12" md="6" class="brand-gradient d-none d-md-flex align-center justify-center pa-12">
        <div class="text-center text-white" style="max-width: 460px">
          <VAvatar color="rgba(255,255,255,0.15)" size="88" rounded="xl" class="mb-6">
            <VIcon icon="mdi-briefcase-account" size="48" color="white" />
          </VAvatar>
          <h1 class="text-h4 font-weight-bold mb-4">
            {{ t('app.name') }}
          </h1>
          <p class="text-h6 font-weight-regular opacity-90">
            {{ t('app.tagline') }}
          </p>

          <VDivider class="my-8 opacity-25" />

          <div class="d-flex justify-space-around text-center">
            <div>
              <div class="text-h5 font-weight-bold">+12K</div>
              <div class="text-caption opacity-80">باحث</div>
            </div>
            <div>
              <div class="text-h5 font-weight-bold">+3K</div>
              <div class="text-caption opacity-80">فرصة</div>
            </div>
            <div>
              <div class="text-h5 font-weight-bold">+8K</div>
              <div class="text-caption opacity-80">توصية</div>
            </div>
          </div>
        </div>
      </VCol>

      <!-- Form panel -->
      <VCol cols="12" md="6" class="d-flex flex-column align-center justify-center pa-6 bg-background position-relative">
        <VBtn
          variant="text"
          class="font-weight-bold position-absolute"
          style="top: 16px; inset-inline-end: 16px"
          @click="toggleLocale"
        >
          {{ locale === 'ar' ? 'English' : 'العربية' }}
        </VBtn>

        <div style="width: 100%; max-width: 420px">
          <slot />
        </div>
      </VCol>
    </VRow>
  </VMain>
</template>

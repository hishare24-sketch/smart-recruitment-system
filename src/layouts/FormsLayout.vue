<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseIcon from '@/components/ui/BaseIcon.vue'

const { t, locale } = useI18n()

function toggleLocale() {
  locale.value = locale.value === 'ar' ? 'en' : 'ar'
}
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Brand panel -->
    <div class="brand-gradient hidden items-center justify-center p-12 md:flex md:w-1/2">
      <div class="text-center text-white" style="max-width: 460px">
        <div class="rounded-ui-lg mx-auto mb-6 flex items-center justify-center" style="width: 88px; height: 88px; background: rgba(255, 255, 255, 0.15)">
          <BaseIcon name="mdi-briefcase-account" :size="48" class="text-white" />
        </div>
        <h1 class="mb-4 text-3xl font-bold">
          {{ t('app.name') }}
        </h1>
        <p class="text-lg opacity-90">
          {{ t('app.tagline') }}
        </p>

        <div class="my-8 border-t border-white/25" />

        <div class="flex justify-around text-center">
          <div>
            <div class="text-2xl font-bold">+12K</div>
            <div class="text-xs opacity-80">باحث</div>
          </div>
          <div>
            <div class="text-2xl font-bold">+3K</div>
            <div class="text-xs opacity-80">فرصة</div>
          </div>
          <div>
            <div class="text-2xl font-bold">+8K</div>
            <div class="text-xs opacity-80">توصية</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Form panel -->
    <div class="relative flex w-full flex-col items-center justify-center bg-bg p-6 md:w-1/2">
      <button
        class="icon-btn absolute px-3 font-bold"
        style="top: 16px; inset-inline-end: 16px; width: auto"
        @click="toggleLocale"
      >
        {{ locale === 'ar' ? 'English' : 'العربية' }}
      </button>

      <div class="w-full" style="max-width: 420px">
        <slot />
      </div>
    </div>
  </div>
</template>

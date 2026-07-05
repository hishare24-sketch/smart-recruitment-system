<script setup lang="ts">
import { useTheme } from 'vuetify'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'

// معرض مكوّنات الأساس (Tailwind) — أداة تحقّق أثناء ترحيل المرحلة 5.
// نعرضها بجانب VBtn من Vuetify للتأكد من تطابق الثيم والتعايش.
const theme = useTheme()
function toggle() {
  theme.global.name.value = theme.global.current.value.dark ? 'lightTheme' : 'darkTheme'
}
</script>

<template>
  <div class="min-h-screen bg-bg p-6 text-content" style="direction: rtl">
    <div class="mx-auto max-w-3xl space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">
          معرض مكوّنات الأساس — Tailwind
        </h1>
        <BaseButton variant="outline" size="sm" @click="toggle">
          تبديل الوضع
        </BaseButton>
      </div>

      <BaseCard>
        <h2 class="mb-3 text-lg font-semibold">
          الأزرار (BaseButton)
        </h2>
        <div class="flex flex-wrap gap-3">
          <BaseButton variant="brand">
            أساسي
          </BaseButton>
          <BaseButton variant="accent">
            CTA
          </BaseButton>
          <BaseButton variant="emerald">
            زمردي
          </BaseButton>
          <BaseButton variant="outline">
            محدّد
          </BaseButton>
          <BaseButton variant="ghost">
            شبح
          </BaseButton>
          <BaseButton variant="brand" loading>
            تحميل
          </BaseButton>
          <BaseButton variant="brand" disabled>
            معطّل
          </BaseButton>
        </div>
        <div class="mt-3 flex items-center gap-3">
          <BaseButton size="sm">
            صغير
          </BaseButton>
          <BaseButton size="md">
            متوسط
          </BaseButton>
          <BaseButton size="lg">
            كبير
          </BaseButton>
        </div>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 text-lg font-semibold">
          الرقائق (BaseChip)
        </h2>
        <div class="flex flex-wrap gap-2">
          <BaseChip color="brand">
            أساسي
          </BaseChip>
          <BaseChip color="emerald">
            AI
          </BaseChip>
          <BaseChip color="success">
            نجاح
          </BaseChip>
          <BaseChip color="warning">
            تحذير
          </BaseChip>
          <BaseChip color="error">
            خطأ
          </BaseChip>
          <BaseChip color="info">
            معلومة
          </BaseChip>
          <BaseChip color="neutral">
            محايد
          </BaseChip>
        </div>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 text-lg font-semibold">
          الأيقونات + الأفاتار + الشارات (BaseIcon / BaseAvatar / BaseBadge)
        </h2>
        <div class="flex flex-wrap items-center gap-4">
          <BaseIcon name="mdi-briefcase-account" :size="28" class="text-brand" />
          <BaseIcon name="mdi-bell-outline" :size="28" />
          <BaseAvatar color="brand" :size="40">
            أ
          </BaseAvatar>
          <BaseAvatar color="emerald" :size="40" tonal>
            ب
          </BaseAvatar>
          <BaseAvatar color="warning" :size="40" square>
            <BaseIcon name="mdi-account" :size="22" />
          </BaseAvatar>
          <BaseBadge :content="5" color="error">
            <BaseIcon name="mdi-message-outline" :size="28" />
          </BaseBadge>
          <BaseBadge dot color="accent">
            <BaseIcon name="mdi-bell-outline" :size="28" />
          </BaseBadge>
          <BaseBadge :content="3" inline color="brand">
            رسائل
          </BaseBadge>
        </div>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 text-lg font-semibold">
          القائمة المنسدلة (BaseDropdown)
        </h2>
        <BaseDropdown align="start">
          <template #trigger="{ toggle }">
            <BaseButton variant="outline" size="sm" @click="toggle">
              افتح القائمة
            </BaseButton>
          </template>
          <template #default="{ close }">
            <div class="min-w-[200px] py-1">
              <button class="menu-row" @click="close">
                <BaseIcon name="mdi-account-outline" :size="20" />
                <span>الملف الشخصي</span>
              </button>
              <button class="menu-row" @click="close">
                <BaseIcon name="mdi-cog-outline" :size="20" />
                <span>الإعدادات</span>
              </button>
              <div class="my-1 border-t border-ui" />
              <button class="menu-row" style="color: rgb(var(--v-theme-error))" @click="close">
                <BaseIcon name="mdi-logout" :size="20" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </template>
        </BaseDropdown>
        <p class="text-muted mt-2 text-xs">
          تُغلق بالنقر خارجها أو Escape.
        </p>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 text-lg font-semibold">
          مقارنة مع Vuetify (تطابق الثيم + التعايش)
        </h2>
        <div class="flex flex-wrap items-center gap-3">
          <BaseButton variant="brand">
            Tailwind
          </BaseButton>
          <VBtn color="primary">
            Vuetify
          </VBtn>
          <span class="text-muted text-sm">يجب أن يتطابق اللونان مع الثيم الحالي</span>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import BlankLayout from '@/layouts/BlankLayout.vue'
import FormsLayout from '@/layouts/FormsLayout.vue'

const route = useRoute()
const { locale } = useI18n()
const theme = useTheme()

const layouts = {
  default: DefaultLayout,
  blank: BlankLayout,
  forms: FormsLayout,
}

const layoutComponent = computed(() => {
  const layout = (route.meta.layout as keyof typeof layouts) || 'blank'
  return layouts[layout] ?? BlankLayout
})

// Keep <html> dir/lang in sync with locale
watch(
  locale,
  (value) => {
    const dir = value === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', value)
    localStorage.setItem('locale', value)
  },
  { immediate: true },
)

// Expose current theme name (used by theme switcher later)
const isDark = computed(() => theme.global.current.value.dark)
</script>

<template>
  <VApp :theme="isDark ? 'darkTheme' : 'lightTheme'">
    <Component :is="layoutComponent">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <Component :is="Component" />
        </Transition>
      </RouterView>
    </Component>
  </VApp>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

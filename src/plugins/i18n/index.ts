import { createI18n } from 'vue-i18n'
import ar from './locales/ar.json'
import en from './locales/en.json'

export type AppLocale = 'ar' | 'en'

const savedLocale = (localStorage.getItem('locale') as AppLocale) || 'ar'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { ar, en },
})

export default i18n

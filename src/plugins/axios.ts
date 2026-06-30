import axios from 'axios'
import { useAuthStore } from '@/stores/AuthStore'
import { i18n } from '@/plugins/i18n'
import router from '@/router'

axios.defaults.baseURL = import.meta.env.VITE_BASE_API_URL || '/api'

// Request interceptor — attach token, locale, platform headers
axios.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  const token = authStore.getToken

  if (token)
    config.headers.Authorization = `Bearer ${token}`

  config.headers['Accept-Language'] = i18n.global.locale.value
  config.headers.platform = 'dashboard'

  return config
})

// Response interceptor — handle 401 / errors globally
axios.interceptors.response.use(
  response => response,
  (error) => {
    const status = error?.response?.status
    const authStore = useAuthStore()

    if (status === 401) {
      authStore.clearAuthUser()
      const current = router.currentRoute.value
      if (current.name !== 'login') {
        router.push({
          name: 'login',
          query: { redirect: current.fullPath },
        })
      }
    }

    return Promise.reject(error)
  },
)

export default axios

import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { useAuthStore } from '@/stores/AuthStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  const isPublic = to.meta.public === true

  // Block authenticated layouts when not logged in
  if (!isPublic && !authStore.isAuthUser) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Send logged-in users away from auth/landing pages to their dashboard
  if (authStore.isAuthUser && (to.name === 'login' || to.name === 'register' || to.name === 'home')) {
    const homeByRole: Record<string, string> = {
      endorser: 'endorser-home',
      admin: 'admin-dashboard',
    }
    return { name: homeByRole[authStore.role ?? ''] ?? 'dashboard' }
  }

  return true
})

export default router

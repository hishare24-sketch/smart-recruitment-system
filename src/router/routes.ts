import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  // ===== Public / Auth =====
  {
    path: '/login',
    name: 'login',
    component: () => import('@/modules/auth/pages/LoginPage.vue'),
    meta: { layout: 'forms', public: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/modules/auth/pages/RegisterPage.vue'),
    meta: { layout: 'forms', public: true },
  },

  // ===== Authenticated (Default layout) =====
  {
    path: '/',
    name: 'home',
    redirect: { name: 'dashboard' },
    meta: { layout: 'default' },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/modules/dashboard/pages/DashboardPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/modules/profile/pages/ProfilePage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/opportunities',
    name: 'opportunities',
    component: () => import('@/modules/opportunities/pages/OpportunitiesPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/opportunities/:id',
    name: 'opportunity-details',
    component: () => import('@/modules/opportunities/pages/OpportunityDetailsPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/wishes',
    name: 'wishes',
    component: () => import('@/modules/wishes/pages/WishesPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/assessments',
    name: 'assessments',
    component: () => import('@/modules/assessments/pages/AssessmentsPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/resume-builder',
    name: 'resume-builder',
    component: () => import('@/modules/resume-builder/pages/ResumeBuilderPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/assistant',
    name: 'assistant',
    component: () => import('@/modules/assistant/pages/AssistantPage.vue'),
    meta: { layout: 'default' },
  },

  // ===== Errors =====
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/modules/errors/pages/NotFoundPage.vue'),
    meta: { layout: 'blank', public: true },
  },
]

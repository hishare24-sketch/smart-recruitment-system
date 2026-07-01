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

  // ===== Public landing =====
  {
    path: '/',
    name: 'home',
    component: () => import('@/modules/public/pages/LandingPage.vue'),
    meta: { layout: 'blank', public: true },
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

  // ===== Endorser =====
  {
    path: '/endorsements',
    name: 'endorser-home',
    component: () => import('@/modules/endorsements/pages/EndorserHomePage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/endorsements/add',
    name: 'add-endorsement',
    component: () => import('@/modules/endorsements/pages/AddEndorsementPage.vue'),
    meta: { layout: 'default' },
  },

  // ===== Admin =====
  {
    path: '/admin',
    name: 'admin-dashboard',
    component: () => import('@/modules/admin/pages/AdminDashboardPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/modules/team/pages/UsersPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/admin/roles',
    name: 'admin-roles',
    component: () => import('@/modules/team/pages/RolesPage.vue'),
    meta: { layout: 'default' },
  },

  // ===== Surveys =====
  {
    path: '/surveys',
    name: 'surveys',
    component: () => import('@/modules/surveys/pages/SurveysPage.vue'),
    meta: { layout: 'default' },
  },

  // ===== Company =====
  {
    path: '/company/opportunities/create',
    name: 'create-opportunity',
    component: () => import('@/modules/opportunities/pages/CreateOpportunityPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/company/candidates',
    name: 'candidates',
    component: () => import('@/modules/candidates/pages/CandidatesPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/company/candidates/:id',
    name: 'candidate-profile',
    component: () => import('@/modules/candidates/pages/CandidateProfilePage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/company/wishes',
    name: 'company-wishes',
    component: () => import('@/modules/wishes/pages/CompanyWishesPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/company/analytics',
    name: 'analytics',
    component: () => import('@/modules/analytics/pages/AnalyticsPage.vue'),
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

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User, UserRole } from '@/interfaces/Auth'

const STORAGE_KEY = 'authUser'

function loadUser(): User | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return null
  try {
    return JSON.parse(raw) as User
  }
  catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  // #region State
  const authUser = ref<User | null>(loadUser())
  // #endregion

  // #region Getters
  const isAuthUser = computed(() => !!authUser.value)
  const getToken = computed(() => authUser.value?.token)
  const role = computed<UserRole | undefined>(() => authUser.value?.role)

  function hasPermission(permission: string): boolean {
    return authUser.value?.permissions?.includes(permission) ?? false
  }

  function hasPermissions(permissions: string[]): boolean {
    return permissions.every(p => hasPermission(p))
  }

  function hasAtLeastOnePermission(permissions: string[]): boolean {
    return permissions.some(p => hasPermission(p))
  }
  // #endregion

  // #region Actions
  function setAuthUser(user: User) {
    authUser.value = user
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  }

  function clearAuthUser() {
    authUser.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  function setUserPermissions(permissions: string[]) {
    if (!authUser.value)
      return
    authUser.value.permissions = permissions
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser.value))
  }
  // #endregion

  return {
    authUser,
    isAuthUser,
    getToken,
    role,
    hasPermission,
    hasPermissions,
    hasAtLeastOnePermission,
    setAuthUser,
    clearAuthUser,
    setUserPermissions,
  }
})

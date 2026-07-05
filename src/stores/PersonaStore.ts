import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { OrgType, SeekerPersona } from '@/services/personas'
import { syncPrivateDoc } from '@/services/cloudSync'

// ===== شخصيّة الباحث + نوع المنشأة للمستخدم الحالي =====
// صفات على الحساب (لا أدوار) — تُخصّص الإعداد والمطابقة والشارات والظهور.

interface PersonaState {
  seekerPersona: SeekerPersona
  orgType: OrgType
}

const STORAGE_KEY = 'personaProfile'
const seed: PersonaState = { seekerPersona: 'job_seeker', orgType: 'sme' }

function load(): PersonaState {
  try {
    return { ...seed, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  }
  catch {
    return { ...seed }
  }
}

export const usePersonaStore = defineStore('persona', () => {
  const state = ref<PersonaState>(load())
  watch(state, v => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true })

  const { status: syncStatus } = syncPrivateDoc({
    store: 'persona',
    snapshot: () => state.value,
    apply: (incoming) => {
      if (incoming && typeof incoming === 'object')
        state.value = { ...state.value, ...(incoming as Partial<PersonaState>) }
    },
    source: state,
  })

  function setSeekerPersona(p: SeekerPersona) {
    state.value.seekerPersona = p
  }
  function setOrgType(t: OrgType) {
    state.value.orgType = t
  }

  return { state, syncStatus, setSeekerPersona, setOrgType }
})

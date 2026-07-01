import axios from 'axios'
import type { LoginPayload, RegisterPayload, User } from '@/interfaces/Auth'

// Default permission sets per role (until backend provides them)
const ROLE_PERMISSIONS: Record<User['role'], string[]> = {
  seeker: ['view_opportunities', 'apply_opportunity', 'view_profile', 'manage_resume'],
  company: ['view_candidates', 'create_opportunity', 'send_wish', 'view_analytics'],
  endorser: ['create_endorsement'],
  admin: ['*'],
  interviewer: ['conduct_interview', 'manage_interviewer_profile', 'write_evaluation'],
}

function buildMockUser(partial: Partial<User> & Pick<User, 'email' | 'role' | 'name'>): User {
  return {
    id: Math.floor(Math.random() * 100000),
    uuid: crypto.randomUUID(),
    name: partial.name,
    email: partial.email,
    phone: partial.phone,
    role: partial.role,
    token: `mock-token-${Date.now()}`,
    permissions: ROLE_PERMISSIONS[partial.role],
    created_at: new Date().toISOString(),
  }
}

class AuthService {
  // Toggle when the real backend is ready
  private useMock = true

  async login(payload: LoginPayload): Promise<User> {
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 600))
      // Infer role from a "+role" hint in the email, default to seeker
      const role = (['company', 'endorser', 'admin', 'interviewer'] as const).find(r => payload.email.includes(r)) ?? 'seeker'
      return buildMockUser({
        email: payload.email,
        name: payload.email.split('@')[0] || 'مستخدم',
        role,
      })
    }
    const { data } = await axios.post('auth/login', payload)
    return data.data
  }

  async register(payload: RegisterPayload): Promise<User> {
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 700))
      return buildMockUser({
        email: payload.email,
        name: payload.name,
        phone: payload.phone,
        role: payload.role,
      })
    }
    const { data } = await axios.post('auth/register', payload)
    return data.data
  }

  async logout(): Promise<void> {
    if (this.useMock)
      return
    await axios.post('auth/logout')
  }
}

export const authService = new AuthService()

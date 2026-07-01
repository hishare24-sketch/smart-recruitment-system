export type UserRole = 'seeker' | 'company' | 'endorser' | 'admin' | 'interviewer'

export interface User {
  id: number
  uuid: string
  name: string
  email: string
  phone?: string
  image_path?: string
  token: string
  role: UserRole
  permissions: string[]
  created_at?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  phone?: string
  password: string
  password_confirmation: string
  role: UserRole
}

import { describe, expect, it } from 'vitest'
import { debounce, getSupabase, supabaseEnabled } from './supabase'

describe('supabase service', () => {
  it('enables the client only when both env keys exist (mock mode otherwise)', () => {
    const envComplete = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
    expect(supabaseEnabled).toBe(envComplete)
    expect(Boolean(getSupabase())).toBe(envComplete)
  })

  it('debounce collapses rapid calls into a single write', async () => {
    let calls = 0
    const fn = debounce(() => calls++, 10)
    fn()
    fn()
    fn()
    await new Promise(r => setTimeout(r, 40))
    expect(calls).toBe(1)
  })
})

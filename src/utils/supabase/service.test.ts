import { createClient } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServiceClient } from './service'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}))

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function restoreEnv() {
  if (originalSupabaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
  }

  if (originalServiceRoleKey === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
  }
}

describe('createServiceClient', () => {
  afterEach(() => {
    vi.clearAllMocks()
    restoreEnv()
  })

  it('fails closed when Supabase service env vars are missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    expect(() => createServiceClient()).toThrow('Supabase service client env vars no configuradas')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('creates a Supabase client with the service-role key', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'

    createServiceClient()

    expect(createClient).toHaveBeenCalledWith(
      'https://supabase.test',
      'service-role-key'
    )
  })
})

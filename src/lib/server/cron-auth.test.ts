import { describe, expect, it, afterEach } from 'vitest'
import { assertCronRequest } from './cron-auth'

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET

afterEach(() => {
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET
})

describe('assertCronRequest', () => {
  it('fails closed when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET

    const result = assertCronRequest(
      new Request('http://acrue.test/api/cron/test', {
        headers: { authorization: 'Bearer anything' },
      })
    )

    expect(result?.status).toBe(500)
    await expect(result?.json()).resolves.toEqual({
      error: 'CRON_SECRET no configurado',
    })
  })

  it('rejects requests with a missing or invalid bearer token', async () => {
    process.env.CRON_SECRET = 'valid-secret'

    const result = assertCronRequest(
      new Request('http://acrue.test/api/cron/test', {
        headers: { authorization: 'Bearer wrong-secret' },
      })
    )

    expect(result?.status).toBe(401)
    await expect(result?.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('allows requests with the configured bearer token', () => {
    process.env.CRON_SECRET = 'valid-secret'

    const result = assertCronRequest(
      new Request('http://acrue.test/api/cron/test', {
        headers: { authorization: 'Bearer valid-secret' },
      })
    )

    expect(result).toBeNull()
  })
})

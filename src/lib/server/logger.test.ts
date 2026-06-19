import * as Sentry from '@sentry/nextjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from './logger'

const sentryMock = vi.hoisted(() => {
  const scope = {
    setContext: vi.fn(),
    setLevel: vi.fn(),
    setTag: vi.fn(),
  }

  return {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    scope,
    withScope: vi.fn((callback: (scopeValue: {
      setContext: typeof scope.setContext
      setLevel: typeof scope.setLevel
      setTag: typeof scope.setTag
    }) => void) => callback(scope)),
  }
})

vi.mock('@sentry/nextjs', () => sentryMock)

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  it('captures errors in Sentry with context', () => {
    const error = new Error('boom')

    logger.error('Route failed', error, { route: '/api/test' })

    expect(Sentry.captureException).toHaveBeenCalledWith(error)
    expect(sentryMock.scope.setLevel).toHaveBeenCalledWith('error')
    expect(sentryMock.scope.setTag).toHaveBeenCalledWith('logger.message', 'Route failed')
    expect(sentryMock.scope.setContext).toHaveBeenCalledWith('logger.context', { route: '/api/test' })
  })

  it('captures warnings in Sentry without requiring an Error object', () => {
    logger.warn('Missing optional integration', { integration: 'redis' })

    expect(Sentry.captureMessage).toHaveBeenCalledWith('Missing optional integration')
    expect(sentryMock.scope.setLevel).toHaveBeenCalledWith('warning')
    expect(sentryMock.scope.setContext).toHaveBeenCalledWith('logger.context', { integration: 'redis' })
  })

  it('keeps info diagnostics local to avoid Sentry noise', () => {
    logger.info('Runtime configured', { feature: 'telegram' })

    expect(Sentry.captureException).not.toHaveBeenCalled()
    expect(Sentry.captureMessage).not.toHaveBeenCalled()
    expect(console.info).toHaveBeenCalledWith('Runtime configured', '{"feature":"telegram"}')
  })

  it('prints local warning context as readable JSON', () => {
    logger.warn('[withFallback] Degraded service', { error: 'invalid_grant' })

    expect(console.warn).toHaveBeenCalledWith('[withFallback] Degraded service', '{"error":"invalid_grant"}')
  })
})

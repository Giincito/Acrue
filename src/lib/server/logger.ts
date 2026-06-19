import * as Sentry from '@sentry/nextjs'

type LogLevel = 'debug' | 'info' | 'warning' | 'error'
type LogContext = Record<string, unknown>

function attachContext(scope: Sentry.Scope, message: string, context?: LogContext) {
  scope.setTag('logger.message', message)
  if (context) scope.setContext('logger.context', context)
}

function serializeContext(context: LogContext) {
  try {
    return JSON.stringify(context, (_key, value) => {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
        }
      }

      return value
    })
  } catch {
    return '[unserializable context]'
  }
}

function writeLocal(level: LogLevel, message: string, error?: unknown, context?: LogContext) {
  if (process.env.NODE_ENV === 'production') return

  const payload = context ? [message, serializeContext(context), error].filter(Boolean) : [message, error].filter(Boolean)

  switch (level) {
    case 'debug':
      console.debug(...payload)
      break
    case 'info':
      console.info(...payload)
      break
    case 'warning':
      console.warn(...payload)
      break
    case 'error':
      console.error(...payload)
      break
  }
}

function report(level: LogLevel, message: string, error?: unknown, context?: LogContext) {
  if (level === 'debug' || level === 'info') {
    writeLocal(level, message, error, context)
    return
  }

  if (error instanceof Error) {
    Sentry.withScope((scope) => {
      scope.setLevel(level)
      attachContext(scope, message, context)
      Sentry.captureException(error)
    })
  } else {
    const extra = error === undefined ? context : { ...context, detail: error }
    Sentry.withScope((scope) => {
      scope.setLevel(level)
      attachContext(scope, message, extra)
      Sentry.captureMessage(message)
    })
  }

  writeLocal(level, message, error, context)
}

export const logger = {
  debug(message: string, context?: LogContext) {
    report('debug', message, undefined, context)
  },
  info(message: string, context?: LogContext) {
    report('info', message, undefined, context)
  },
  warn(message: string, context?: LogContext) {
    report('warning', message, undefined, context)
  },
  error(message: string, error?: unknown, context?: LogContext) {
    report('error', message, error, context)
  },
}

import { NextResponse } from 'next/server'

export function assertCronRequest(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET no configurado' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

export function getRequiredServerSecret(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} no configurado`)
  }

  return value
}

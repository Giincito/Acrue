import { NextResponse } from 'next/server'

type DeliveryCronResponseInput = {
  sent: number
  failed: number
  allFailedError: string
}

export function createDeliveryCronResponse({
  sent,
  failed,
  allFailedError,
}: DeliveryCronResponseInput) {
  if (failed > 0 && sent === 0) {
    return NextResponse.json(
      {
        success: false,
        sent,
        failed,
        error: allFailedError,
      },
      { status: 500 }
    )
  }

  if (failed > 0) {
    return NextResponse.json(
      {
        success: false,
        sent,
        failed,
        error: 'Algunos envios no se completaron.',
      },
      { status: 207 }
    )
  }

  return NextResponse.json({ success: true, sent, failed })
}

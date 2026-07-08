import { NextRequest, NextResponse } from 'next/server'
import { destroySession, getSession } from '@/lib/auth'
import { logAction } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (session) {
    await logAction({
      userId: session.id,
      facilityId: session.facilityId,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: session.id,
      description: `${session.fullName} logged out`,
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
    })
  }
  await destroySession()
  return NextResponse.json({ success: true })
}

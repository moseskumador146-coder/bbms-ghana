import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SYS_ADMIN', 'HOSP_ADMIN', 'BBO'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '100')
  const entityType = searchParams.get('entityType')

  const where: any = {}
  if (session.role === 'SYS_ADMIN') {
    // See all
  } else {
    where.facilityId = session.facilityId
  }
  if (entityType && entityType !== 'all') where.entityType = entityType

  const logs = await db.auditLog.findMany({
    where,
    include: {
      user: { select: { fullName: true, email: true } },
      facility: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return NextResponse.json({ logs })
}

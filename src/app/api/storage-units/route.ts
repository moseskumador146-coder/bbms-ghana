import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'SYS_ADMIN') {
    const storageUnits = await db.storageUnit.findMany({
      include: { facility: { select: { name: true, region: true } }, _count: { select: { bloodUnits: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ storageUnits })
  }
  const storageUnits = await db.storageUnit.findMany({
    where: { facilityId: session.facilityId! },
    include: { _count: { select: { bloodUnits: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ storageUnits })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'HOSP_ADMIN', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { name, tempCategory, temperatureC, maxCapacity } = body
  if (!name || !tempCategory || temperatureC == null || !maxCapacity) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const storage = await db.storageUnit.create({
    data: {
      facilityId: session.facilityId!,
      name,
      tempCategory,
      temperatureC: parseFloat(temperatureC),
      maxCapacity: parseInt(maxCapacity),
    },
  })
  await logAction({
    userId: session.id,
    facilityId: session.facilityId!,
    action: 'CREATE',
    entityType: 'StorageUnit',
    entityId: storage.id,
    description: `Created storage unit ${name} (${tempCategory})`,
  })
  return NextResponse.json({ storage })
}

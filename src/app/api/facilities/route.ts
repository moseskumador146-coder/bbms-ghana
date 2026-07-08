import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'SYS_ADMIN') {
    const facilities = await db.facility.findMany({
      include: {
        _count: { select: { users: true, bloodUnits: true, storageUnits: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ facilities })
  }
  // Other roles can see list of facilities (for network request context), but only basic info
  const facilities = await db.facility.findMany({
    where: { status: 'Active', name: { not: 'BBMS Platform Office' } },
    select: { id: true, name: true, type: true, region: true, location: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ facilities })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SYS_ADMIN', 'HOSP_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { name, type, location, region, contactPhone, contactEmail } = body
  if (!name || !type || !location || !region || !contactPhone || !contactEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const facility = await db.facility.create({
    data: { name, type, location, region, contactPhone, contactEmail, status: session.role === 'SYS_ADMIN' ? 'Active' : 'Pending' },
  })
  await logAction({
    userId: session.id,
    facilityId: session.facilityId,
    action: 'CREATE',
    entityType: 'Facility',
    entityId: facility.id,
    description: `Registered facility ${name} (${type}, ${region})`,
  })
  return NextResponse.json({ facility })
}

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction, facilityCodeFromName, isExpired } from '@/lib/audit'

// GET /api/blood-units
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bloodGroup = searchParams.get('bloodGroup') || undefined
  const rhesus = searchParams.get('rhesus') || undefined
  const componentType = searchParams.get('componentType') || undefined
  const status = searchParams.get('status') || undefined
  const storageUnitId = searchParams.get('storageUnitId') || undefined
  const facilityId = searchParams.get('facilityId') || session.facilityId || undefined
  const expiringWithin = searchParams.get('expiringWithin')

  // SYS_ADMIN can see all facilities, others see only their own
  const isAdmin = session.role === 'SYS_ADMIN'
  const targetFacilityId = isAdmin ? (facilityId && facilityId !== 'all' ? facilityId : undefined) : session.facilityId

  const where: any = {}
  if (targetFacilityId) where.facilityId = targetFacilityId
  if (bloodGroup && bloodGroup !== 'all') where.bloodGroup = bloodGroup
  if (rhesus && rhesus !== 'all') where.rhesus = rhesus
  if (componentType && componentType !== 'all') where.componentType = componentType
  if (status && status !== 'all') where.status = status
  if (storageUnitId && storageUnitId !== 'all') where.storageUnitId = storageUnitId

  let units = await db.bloodUnit.findMany({
    where,
    include: {
      storageUnit: true,
      donor: true,
      facility: { select: { id: true, name: true, region: true } },
      registeredBy: { select: { fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Auto-flag expired units
  for (const u of units) {
    if (u.status === 'Available' && isExpired(u.expiryDate)) {
      await db.bloodUnit.update({ where: { id: u.id }, data: { status: 'Expired' } })
      u.status = 'Expired'
    }
  }

  // Filter expiring within X days
  if (expiringWithin) {
    const days = parseInt(expiringWithin)
    const now = new Date()
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    units = units.filter(u => u.expiryDate <= cutoff && u.expiryDate >= now)
  }

  return NextResponse.json({ units })
}

// POST /api/blood-units
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'LAB_TECH', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { bloodGroup, rhesus, componentType, collectionDate, expiryDate, donorId, storageUnitId, notes, quantity = 1 } = body
  if (!bloodGroup || !rhesus || !componentType || !collectionDate || !expiryDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const facilityId = session.facilityId!
  // Generate unit codes for the quantity requested
  const facility = await db.facility.findUnique({ where: { id: facilityId } })
  const code = facilityCodeFromName(facility!.name)
  const existingCount = await db.bloodUnit.count({ where: { facilityId } })

  const created: any[] = []
  for (let i = 0; i < quantity; i++) {
    const unitCode = `${code}-BU-${String(existingCount + i + 1).padStart(5, '0')}`
    const unit = await db.bloodUnit.create({
      data: {
        unitCode,
        facilityId,
        donorId: donorId || null,
        storageUnitId: storageUnitId || null,
        bloodGroup,
        rhesus,
        componentType,
        collectionDate: new Date(collectionDate),
        expiryDate: new Date(expiryDate),
        status: 'Available',
        registeredById: session.id,
        notes: notes || null,
      },
    })
    created.push(unit)
    await logAction({
      userId: session.id,
      facilityId,
      action: 'CREATE',
      entityType: 'BloodUnit',
      entityId: unit.id,
      description: `Registered blood unit ${unitCode} (${bloodGroup}${rhesus}, ${componentType})`,
    })
  }

  return NextResponse.json({ units: created })
}

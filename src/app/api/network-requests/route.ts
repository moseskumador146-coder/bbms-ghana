import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction, facilityCodeFromName } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') || 'all' // outgoing, incoming, all
  const facilityId = session.facilityId

  if (session.role === 'SYS_ADMIN') {
    const requests = await db.networkRequest.findMany({
      include: {
        facility: { select: { name: true, region: true } },
        requestedBy: { select: { fullName: true } },
        responses: { include: { respondingFacility: { select: { name: true, region: true } }, offeredUnit: { select: { unitCode: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ requests })
  }

  if (filter === 'outgoing') {
    const requests = await db.networkRequest.findMany({
      where: { facilityId: facilityId! },
      include: {
        responses: { include: { respondingFacility: { select: { name: true, region: true } }, offeredUnit: { select: { unitCode: true, bloodGroup: true, rhesus: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ requests })
  }

  if (filter === 'incoming') {
    // Open/Partial requests from other facilities where this facility could respond
    const requests = await db.networkRequest.findMany({
      where: { facilityId: { not: facilityId! }, status: { in: ['Open', 'Partially Responded'] } },
      include: {
        facility: { select: { name: true, region: true, type: true } },
        requestedBy: { select: { fullName: true } },
        responses: { where: { respondingFacilityId: facilityId! } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ requests })
  }

  // all: both outgoing and incoming
  const [outgoing, incoming] = await Promise.all([
    db.networkRequest.findMany({
      where: { facilityId: facilityId! },
      include: { responses: { include: { respondingFacility: { select: { name: true, region: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.networkRequest.findMany({
      where: { facilityId: { not: facilityId! }, status: { in: ['Open', 'Partially Responded'] } },
      include: {
        facility: { select: { name: true, region: true } },
        responses: { where: { respondingFacilityId: facilityId! } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  return NextResponse.json({ requests: { outgoing, incoming } })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'SYS_ADMIN', 'HOSP_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { bloodGroup, rhesus, componentType, quantity, urgency, patientRef, noteToFacilities, reservationExpiryHours } = body
  if (!bloodGroup || !rhesus || !quantity || !urgency) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const facilityId = session.facilityId!
  const facility = await db.facility.findUnique({ where: { id: facilityId } })
  const code = facilityCodeFromName(facility!.name)
  const existingCount = await db.networkRequest.count({ where: { facilityId } })
  const requestCode = `${code}-NR-${String(existingCount + 1).padStart(5, '0')}`

  const request = await db.networkRequest.create({
    data: {
      requestCode,
      facilityId,
      requestedById: session.id,
      bloodGroup,
      rhesus,
      componentType: componentType || null,
      quantity: parseInt(quantity),
      urgency,
      patientRef: patientRef || null,
      noteToFacilities: noteToFacilities || null,
      status: 'Open',
      reservationExpiryHours: parseInt(reservationExpiryHours) || 24,
    },
  })
  await logAction({
    userId: session.id,
    facilityId,
    action: 'CREATE',
    entityType: 'NetworkRequest',
    entityId: request.id,
    description: `Broadcast network request ${requestCode} for ${bloodGroup}${rhesus} (${urgency})`,
  })
  return NextResponse.json({ request })
}

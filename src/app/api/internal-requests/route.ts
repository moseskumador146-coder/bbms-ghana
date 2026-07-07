import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'SYS_ADMIN') {
    const requests = await db.internalRequest.findMany({
      include: {
        facility: { select: { name: true } },
        requestedBy: { select: { fullName: true } },
        issuedUnit: { select: { unitCode: true, bloodGroup: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ requests })
  }
  // NURSE_DOCTOR sees only their own; others see all in facility
  const where = session.role === 'NURSE_DOCTOR'
    ? { facilityId: session.facilityId!, requestedById: session.id }
    : { facilityId: session.facilityId! }
  const requests = await db.internalRequest.findMany({
    where,
    include: {
      requestedBy: { select: { fullName: true } },
      issuedUnit: { select: { unitCode: true, bloodGroup: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ requests })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['NURSE_DOCTOR', 'BBO', 'HOSP_ADMIN', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { bloodGroup, rhesus, componentType, quantity, urgency, patientRef, patientName, ward, notes } = body
  if (!bloodGroup || !rhesus || !quantity || !urgency || !patientRef) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const request = await db.internalRequest.create({
    data: {
      facilityId: session.facilityId!,
      requestedById: session.id,
      bloodGroup,
      rhesus,
      componentType: componentType || null,
      quantity: parseInt(quantity),
      urgency,
      patientRef,
      patientName: patientName || null,
      ward: ward || null,
      notes: notes || null,
    },
  })
  await logAction({
    userId: session.id,
    facilityId: session.facilityId!,
    action: 'CREATE',
    entityType: 'InternalRequest',
    entityId: request.id,
    description: `Submitted internal blood request for ${patientRef} (${bloodGroup}${rhesus}, ${urgency})`,
  })
  return NextResponse.json({ request })
}

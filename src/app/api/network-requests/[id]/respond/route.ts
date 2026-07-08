import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

// POST /api/network-requests/[id]/respond
// Body: { unitId: string, note?: string }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const { unitId, note } = body
  if (!unitId) return NextResponse.json({ error: 'unitId is required' }, { status: 400 })

  const networkRequest = await db.networkRequest.findUnique({ where: { id } })
  if (!networkRequest) return NextResponse.json({ error: 'Network request not found' }, { status: 404 })
  if (!['Open', 'Partially Responded'].includes(networkRequest.status)) {
    return NextResponse.json({ error: `Cannot respond to request in ${networkRequest.status} status` }, { status: 400 })
  }
  if (networkRequest.facilityId === session.facilityId) {
    return NextResponse.json({ error: 'Cannot respond to your own facility request' }, { status: 400 })
  }
  const unit = await db.bloodUnit.findUnique({ where: { id: unitId } })
  if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
  if (unit.facilityId !== session.facilityId) return NextResponse.json({ error: 'Unit does not belong to your facility' }, { status: 403 })
  if (unit.status !== 'Available') return NextResponse.json({ error: 'Unit is not available' }, { status: 400 })
  if (unit.bloodGroup !== networkRequest.bloodGroup || unit.rhesus !== networkRequest.rhesus) {
    return NextResponse.json({ error: 'Unit blood group does not match request' }, { status: 400 })
  }
  // Already responded?
  const existing = await db.networkResponse.findFirst({
    where: { networkRequestId: id, respondingFacilityId: session.facilityId! },
  })
  if (existing) return NextResponse.json({ error: 'Your facility has already responded to this request' }, { status: 400 })

  const response = await db.networkResponse.create({
    data: {
      networkRequestId: id,
      respondingFacilityId: session.facilityId!,
      offeredUnitId: unitId,
      responderNote: note || null,
      status: 'Pending',
    },
  })
  // Update network request status
  await db.networkRequest.update({ where: { id }, data: { status: 'Partially Responded' } })
  await logAction({
    userId: session.id,
    facilityId: session.facilityId,
    action: 'CREATE',
    entityType: 'NetworkResponse',
    entityId: response.id,
    description: `Responded to network request ${networkRequest.requestCode} offering unit ${unit.unitCode}`,
  })
  return NextResponse.json({ response })
}

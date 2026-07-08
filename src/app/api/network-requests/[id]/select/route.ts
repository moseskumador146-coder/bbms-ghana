import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

// POST /api/network-requests/[id]/select
// Body: { responseId: string } - the requesting facility selects a response
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const { responseId } = body
  if (!responseId) return NextResponse.json({ error: 'responseId is required' }, { status: 400 })

  const networkRequest = await db.networkRequest.findUnique({ where: { id } })
  if (!networkRequest) return NextResponse.json({ error: 'Network request not found' }, { status: 404 })
  if (networkRequest.facilityId !== session.facilityId && session.role !== 'SYS_ADMIN') {
    return NextResponse.json({ error: 'Only the requesting facility can select a response' }, { status: 403 })
  }
  if (!['Open', 'Partially Responded'].includes(networkRequest.status)) {
    return NextResponse.json({ error: `Cannot select response for request in ${networkRequest.status} status` }, { status: 400 })
  }
  const selectedResponse = await db.networkResponse.findUnique({
    where: { id: responseId },
    include: { offeredUnit: true },
  })
  if (!selectedResponse || selectedResponse.networkRequestId !== id) {
    return NextResponse.json({ error: 'Response not found for this request' }, { status: 404 })
  }

  // Reserve the offered unit, reject other responses, mark network request as Reserved
  const reservationHours = networkRequest.reservationExpiryHours || 24
  const reservedUntil = new Date(Date.now() + reservationHours * 60 * 60 * 1000)

  await db.$transaction([
    db.networkResponse.update({ where: { id: responseId }, data: { status: 'Selected' } }),
    db.networkResponse.updateMany({
      where: { networkRequestId: id, id: { not: responseId }, status: 'Pending' },
      data: { status: 'Rejected' },
    }),
    db.bloodUnit.update({
      where: { id: selectedResponse.offeredUnitId! },
      data: { status: 'Reserved', reservedUntil, reservedForNetworkRequestId: id },
    }),
    db.networkRequest.update({ where: { id }, data: { status: 'Reserved' } }),
  ])

  await logAction({
    userId: session.id,
    facilityId: session.facilityId,
    action: 'STATUS_CHANGE',
    entityType: 'NetworkRequest',
    entityId: id,
    description: `Selected response from ${selectedResponse.respondingFacilityId}, reserved unit ${selectedResponse.offeredUnit?.unitCode} until ${reservedUntil.toISOString()}`,
  })
  return NextResponse.json({ success: true, status: 'Reserved' })
}

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

// POST /api/network-requests/[id]/confirm
// Body: { action: 'confirm' | 'cancel_reservation' }
// confirm: marks network request Fulfilled, issued unit becomes Issued
// cancel_reservation: returns reserved unit to Available, network request back to Partially Responded
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const { action } = body

  const networkRequest = await db.networkRequest.findUnique({ where: { id } })
  if (!networkRequest) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'confirm') {
    if (networkRequest.status !== 'Reserved') {
      return NextResponse.json({ error: `Cannot confirm request in ${networkRequest.status} status` }, { status: 400 })
    }
    // Mark reserved unit as Issued, network request as Fulfilled
    const reservedUnit = await db.bloodUnit.findFirst({
      where: { reservedForNetworkRequestId: id, status: 'Reserved' },
    })
    if (reservedUnit) {
      await db.bloodUnit.update({
        where: { id: reservedUnit.id },
        data: { status: 'Issued' },
      })
    }
    await db.networkRequest.update({ where: { id }, data: { status: 'Fulfilled' } })
    await logAction({
      userId: session.id,
      facilityId: session.facilityId,
      action: 'STATUS_CHANGE',
      entityType: 'NetworkRequest',
      entityId: id,
      description: `Confirmed reservation for ${networkRequest.requestCode}, unit issued`,
    })
    return NextResponse.json({ success: true, status: 'Fulfilled' })
  }

  if (action === 'cancel_reservation') {
    if (networkRequest.status !== 'Reserved') {
      return NextResponse.json({ error: `Cannot cancel reservation for request in ${networkRequest.status} status` }, { status: 400 })
    }
    const reservedUnit = await db.bloodUnit.findFirst({
      where: { reservedForNetworkRequestId: id, status: 'Reserved' },
    })
    if (reservedUnit) {
      await db.bloodUnit.update({
        where: { id: reservedUnit.id },
        data: { status: 'Available', reservedUntil: null, reservedForNetworkRequestId: null },
      })
    }
    await db.networkResponse.updateMany({
      where: { networkRequestId: id, status: 'Selected' },
      data: { status: 'Withdrawn' },
    })
    await db.networkRequest.update({ where: { id }, data: { status: 'Partially Responded' } })
    await logAction({
      userId: session.id,
      facilityId: session.facilityId,
      action: 'STATUS_CHANGE',
      entityType: 'NetworkRequest',
      entityId: id,
      description: `Cancelled reservation for ${networkRequest.requestCode}, unit returned to available`,
    })
    return NextResponse.json({ success: true, status: 'Partially Responded' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

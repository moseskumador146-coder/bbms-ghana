import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

// POST /api/network-requests/[id]/cancel
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const networkRequest = await db.networkRequest.findUnique({ where: { id } })
  if (!networkRequest) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (networkRequest.facilityId !== session.facilityId && session.role !== 'SYS_ADMIN') {
    return NextResponse.json({ error: 'Only the requesting facility can cancel' }, { status: 403 })
  }
  if (['Fulfilled', 'Cancelled', 'Expired'].includes(networkRequest.status)) {
    return NextResponse.json({ error: `Cannot cancel request in ${networkRequest.status} status` }, { status: 400 })
  }

  // Release any reserved units
  const reservedUnits = await db.bloodUnit.findMany({
    where: { reservedForNetworkRequestId: id, status: 'Reserved' },
  })
  for (const u of reservedUnits) {
    await db.bloodUnit.update({ where: { id: u.id }, data: { status: 'Available', reservedUntil: null, reservedForNetworkRequestId: null } })
  }
  await db.networkResponse.updateMany({
    where: { networkRequestId: id, status: 'Pending' },
    data: { status: 'Withdrawn' },
  })
  await db.networkRequest.update({ where: { id }, data: { status: 'Cancelled' } })
  await logAction({
    userId: session.id,
    facilityId: session.facilityId,
    action: 'STATUS_CHANGE',
    entityType: 'NetworkRequest',
    entityId: id,
    description: `Cancelled network request ${networkRequest.requestCode}`,
  })
  return NextResponse.json({ success: true })
}

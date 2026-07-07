import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const request = await db.internalRequest.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Only requester or BBO/HOSP_ADMIN can cancel
  if (request.requestedById !== session.id && !['BBO', 'HOSP_ADMIN', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!['Pending', 'Approved'].includes(request.status)) {
    return NextResponse.json({ error: `Cannot cancel request in ${request.status} status` }, { status: 400 })
  }
  await db.internalRequest.update({ where: { id }, data: { status: 'Cancelled' } })
  await logAction({
    userId: session.id,
    facilityId: request.facilityId,
    action: 'STATUS_CHANGE',
    entityType: 'InternalRequest',
    entityId: id,
    description: `Cancelled internal request for ${request.patientRef}`,
  })
  return NextResponse.json({ success: true })
}

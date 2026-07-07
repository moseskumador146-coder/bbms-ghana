import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

// POST /api/internal-requests/[id]/process
// Body: { action: 'approve' | 'reject' | 'issue', unitId?: string, notes?: string }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const { action, unitId, notes } = body

  const request = await db.internalRequest.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (request.status !== 'Pending' && request.status !== 'Approved') {
    return NextResponse.json({ error: `Cannot process request in ${request.status} status` }, { status: 400 })
  }

  if (action === 'approve') {
    await db.internalRequest.update({ where: { id }, data: { status: 'Approved', notes: notes ?? request.notes } })
    await logAction({
      userId: session.id,
      facilityId: request.facilityId,
      action: 'STATUS_CHANGE',
      entityType: 'InternalRequest',
      entityId: id,
      description: `Approved internal request ${request.patientRef}`,
    })
    return NextResponse.json({ success: true, status: 'Approved' })
  }

  if (action === 'reject') {
    await db.internalRequest.update({ where: { id }, data: { status: 'Rejected', notes: notes ?? request.notes } })
    await logAction({
      userId: session.id,
      facilityId: request.facilityId,
      action: 'STATUS_CHANGE',
      entityType: 'InternalRequest',
      entityId: id,
      description: `Rejected internal request ${request.patientRef}${notes ? ` - ${notes}` : ''}`,
    })
    return NextResponse.json({ success: true, status: 'Rejected' })
  }

  if (action === 'issue') {
    if (!unitId) return NextResponse.json({ error: 'unitId is required to issue' }, { status: 400 })
    const unit = await db.bloodUnit.findUnique({ where: { id: unitId } })
    if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    if (unit.status !== 'Available') return NextResponse.json({ error: 'Unit is not available' }, { status: 400 })
    if (unit.bloodGroup !== request.bloodGroup || unit.rhesus !== request.rhesus) {
      return NextResponse.json({ error: 'Unit blood group does not match the request' }, { status: 400 })
    }
    await db.$transaction([
      db.bloodUnit.update({ where: { id: unitId }, data: { status: 'Issued' } }),
      db.internalRequest.update({ where: { id }, data: { status: 'Issued', issuedUnitId: unitId, notes: notes ?? request.notes } }),
    ])
    await logAction({
      userId: session.id,
      facilityId: request.facilityId,
      action: 'STATUS_CHANGE',
      entityType: 'InternalRequest',
      entityId: id,
      description: `Issued unit ${unit.unitCode} for request ${request.patientRef}`,
    })
    return NextResponse.json({ success: true, status: 'Issued' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

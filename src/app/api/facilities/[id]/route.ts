import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

// PUT /api/facilities/[id] - Update facility details
// Body: { name?, type?, location?, region?, contactPhone?, contactEmail?, status? (SYS_ADMIN only) }
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SYS_ADMIN', 'HOSP_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const { name, type, location, region, contactPhone, contactEmail, status } = body

  const target = await db.facility.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Facility not found' }, { status: 404 })

  // HOSP_ADMIN can only edit their own facility
  if (session.role === 'HOSP_ADMIN' && target.id !== session.facilityId) {
    return NextResponse.json({ error: 'You can only edit your own facility' }, { status: 403 })
  }
  // HOSP_ADMIN cannot change status (only SYS_ADMIN can suspend/reactivate)
  if (session.role === 'HOSP_ADMIN' && status && status !== target.status) {
    return NextResponse.json({ error: 'Only System Administrator can change facility status' }, { status: 403 })
  }
  // Protect BBMS Platform Office from being edited/deleted
  if (target.name === 'BBMS Platform Office') {
    return NextResponse.json({ error: 'This facility cannot be modified' }, { status: 400 })
  }

  const updateData: any = {}
  if (name) updateData.name = name
  if (type) updateData.type = type
  if (location) updateData.location = location
  if (region) updateData.region = region
  if (contactPhone) updateData.contactPhone = contactPhone
  if (contactEmail) updateData.contactEmail = contactEmail.toLowerCase().trim()
  if (status && session.role === 'SYS_ADMIN') updateData.status = status

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const updated = await db.facility.update({ where: { id }, data: updateData })

  const changes: string[] = []
  if (name && name !== target.name) changes.push(`name "${target.name}" → "${name}"`)
  if (type && type !== target.type) changes.push(`type ${target.type} → ${type}`)
  if (location && location !== target.location) changes.push(`location`)
  if (region && region !== target.region) changes.push(`region ${target.region} → ${region}`)
  if (contactPhone && contactPhone !== target.contactPhone) changes.push('contact phone')
  if (contactEmail && contactEmail.toLowerCase().trim() !== target.contactEmail) changes.push('contact email')
  if (status && session.role === 'SYS_ADMIN' && status !== target.status) changes.push(`status ${target.status} → ${status}`)

  await logAction({
    userId: session.id,
    facilityId: id,
    action: 'UPDATE',
    entityType: 'Facility',
    entityId: id,
    description: `Updated facility ${updated.name}${changes.length ? ` (${changes.join(', ')})` : ''}`,
  })

  return NextResponse.json({ facility: updated })
}

// DELETE /api/facilities/[id] - Delete a facility
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'SYS_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params

  const target = await db.facility.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Facility not found' }, { status: 404 })

  // Cannot delete own facility (for SYS_ADMIN, that's the Platform Office)
  if (target.name === 'BBMS Platform Office') {
    return NextResponse.json({ error: 'The BBMS Platform Office cannot be deleted' }, { status: 400 })
  }

  // Check for dependent records
  const [users, bloodUnits, donors, storageUnits, internalRequests, networkRequests, responses, auditLogs] = await Promise.all([
    db.user.count({ where: { facilityId: id } }),
    db.bloodUnit.count({ where: { facilityId: id } }),
    db.donor.count({ where: { facilityId: id } }),
    db.storageUnit.count({ where: { facilityId: id } }),
    db.internalRequest.count({ where: { facilityId: id } }),
    db.networkRequest.count({ where: { facilityId: id } }),
    db.networkResponse.count({ where: { respondingFacilityId: id } }),
    db.auditLog.count({ where: { facilityId: id } }),
  ])

  const totalDependents = users + bloodUnits + donors + storageUnits + internalRequests + networkRequests + responses + auditLogs
  if (totalDependents > 0) {
    return NextResponse.json({
      error: `Cannot delete this facility — it has ${users} user(s), ${bloodUnits} blood unit(s), ${donors} donor(s), ${storageUnits} storage unit(s), ${internalRequests} internal request(s), ${networkRequests} network request(s), ${responses} response(s), and ${auditLogs} audit log entries. Suspend the facility instead to preserve data integrity.`,
    }, { status: 400 })
  }

  await db.facility.delete({ where: { id } })

  await logAction({
    userId: session.id,
    facilityId: session.facilityId,
    action: 'DELETE',
    entityType: 'Facility',
    entityId: id,
    description: `Deleted facility ${target.name} (${target.type}, ${target.region})`,
  })

  return NextResponse.json({ success: true })
}

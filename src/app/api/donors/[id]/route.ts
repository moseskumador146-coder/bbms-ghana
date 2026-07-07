import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

// PUT /api/donors/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'LAB_TECH', 'HOSP_ADMIN', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const { fullName, phone, email, dateOfBirth, bloodGroup, rhesus, consentGiven } = body

  const target = await db.donor.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Donor not found' }, { status: 404 })
  if (session.role !== 'SYS_ADMIN' && target.facilityId !== session.facilityId) {
    return NextResponse.json({ error: 'You can only edit donors at your own facility' }, { status: 403 })
  }

  const updateData: any = {}
  if (fullName) updateData.fullName = fullName
  if (phone) updateData.phone = phone
  if (email !== undefined) updateData.email = email || null
  if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
  if (bloodGroup) updateData.bloodGroup = bloodGroup
  if (rhesus) updateData.rhesus = rhesus
  if (consentGiven !== undefined) updateData.consentGiven = !!consentGiven

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const updated = await db.donor.update({ where: { id }, data: updateData })
  await logAction({
    userId: session.id,
    facilityId: updated.facilityId,
    action: 'UPDATE',
    entityType: 'Donor',
    entityId: id,
    description: `Updated donor ${updated.fullName}`,
  })
  return NextResponse.json({ donor: updated })
}

// DELETE /api/donors/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'HOSP_ADMIN', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params

  const target = await db.donor.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Donor not found' }, { status: 404 })
  if (session.role !== 'SYS_ADMIN' && target.facilityId !== session.facilityId) {
    return NextResponse.json({ error: 'You can only delete donors at your own facility' }, { status: 403 })
  }

  // Block deletion if donor has linked blood units
  const bloodUnitsCount = await db.bloodUnit.count({ where: { donorId: id } })
  if (bloodUnitsCount > 0) {
    return NextResponse.json({
      error: `Cannot delete this donor — they have ${bloodUnitsCount} linked blood unit(s). Remove or reassign those units first.`,
    }, { status: 400 })
  }

  await db.donor.delete({ where: { id } })
  await logAction({
    userId: session.id,
    facilityId: target.facilityId,
    action: 'DELETE',
    entityType: 'Donor',
    entityId: id,
    description: `Deleted donor ${target.fullName} (${target.bloodGroup}${target.rhesus})`,
  })
  return NextResponse.json({ success: true })
}

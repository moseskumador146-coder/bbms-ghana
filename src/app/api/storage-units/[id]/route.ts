import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

// PUT /api/storage-units/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'HOSP_ADMIN', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const { name, tempCategory, temperatureC, maxCapacity } = body

  const target = await db.storageUnit.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Storage unit not found' }, { status: 404 })
  if (session.role !== 'SYS_ADMIN' && target.facilityId !== session.facilityId) {
    return NextResponse.json({ error: 'You can only edit storage at your own facility' }, { status: 403 })
  }

  const updateData: any = {}
  if (name) updateData.name = name
  if (tempCategory) updateData.tempCategory = tempCategory
  if (temperatureC != null) updateData.temperatureC = parseFloat(temperatureC)
  if (maxCapacity != null) updateData.maxCapacity = parseInt(maxCapacity)

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const updated = await db.storageUnit.update({ where: { id }, data: updateData })
  await logAction({
    userId: session.id,
    facilityId: updated.facilityId,
    action: 'UPDATE',
    entityType: 'StorageUnit',
    entityId: id,
    description: `Updated storage unit ${updated.name}`,
  })
  return NextResponse.json({ storageUnit: updated })
}

// DELETE /api/storage-units/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'HOSP_ADMIN', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params

  const target = await db.storageUnit.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Storage unit not found' }, { status: 404 })
  if (session.role !== 'SYS_ADMIN' && target.facilityId !== session.facilityId) {
    return NextResponse.json({ error: 'You can only delete storage at your own facility' }, { status: 403 })
  }

  // Block if there are blood units currently assigned
  const bloodUnitsCount = await db.bloodUnit.count({ where: { storageUnitId: id } })
  if (bloodUnitsCount > 0) {
    return NextResponse.json({
      error: `Cannot delete this storage unit — it currently holds ${bloodUnitsCount} blood unit(s). Reassign or remove those units first.`,
    }, { status: 400 })
  }

  await db.storageUnit.delete({ where: { id } })
  await logAction({
    userId: session.id,
    facilityId: target.facilityId,
    action: 'DELETE',
    entityType: 'StorageUnit',
    entityId: id,
    description: `Deleted storage unit ${target.name}`,
  })
  return NextResponse.json({ success: true })
}

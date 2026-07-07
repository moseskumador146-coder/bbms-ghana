import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'LAB_TECH', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const { storageUnitId } = body
  if (!storageUnitId) return NextResponse.json({ error: 'storageUnitId is required' }, { status: 400 })
  const unit = await db.bloodUnit.findUnique({ where: { id } })
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.bloodUnit.update({
    where: { id },
    data: { storageUnitId },
  })
  const storage = await db.storageUnit.findUnique({ where: { id: storageUnitId } })
  await logAction({
    userId: session.id,
    facilityId: unit.facilityId,
    action: 'UPDATE',
    entityType: 'BloodUnit',
    entityId: unit.id,
    description: `Assigned unit ${unit.unitCode} to storage ${storage?.name}`,
  })
  return NextResponse.json({ success: true })
}

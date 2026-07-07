import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const { reason } = body
  const unit = await db.bloodUnit.findUnique({ where: { id } })
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (unit.status === 'Issued') return NextResponse.json({ error: 'Cannot discard an issued unit' }, { status: 400 })

  await db.bloodUnit.update({
    where: { id },
    data: { status: 'Discarded', notes: reason ? `Discarded: ${reason}` : unit.notes },
  })
  await logAction({
    userId: session.id,
    facilityId: unit.facilityId,
    action: 'STATUS_CHANGE',
    entityType: 'BloodUnit',
    entityId: unit.id,
    description: `Discarded blood unit ${unit.unitCode}${reason ? ` - ${reason}` : ''}`,
  })
  return NextResponse.json({ success: true })
}

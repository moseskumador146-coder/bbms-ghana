import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'SYS_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const newStatus = body.status === 'Active' ? 'Active' : 'Suspended'
  const facility = await db.facility.update({ where: { id }, data: { status: newStatus } })
  await logAction({
    userId: session.id,
    facilityId: id,
    action: 'UPDATE',
    entityType: 'Facility',
    entityId: id,
    description: `${newStatus === 'Active' ? 'Reactivated' : 'Suspended'} facility ${facility.name}`,
  })
  return NextResponse.json({ facility })
}

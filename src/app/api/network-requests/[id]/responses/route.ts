import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

// GET /api/network-requests/[id]/responses
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const responses = await db.networkResponse.findMany({
    where: { networkRequestId: id },
    include: {
      respondingFacility: { select: { name: true, region: true, type: true, location: true } },
      offeredUnit: { select: { unitCode: true, bloodGroup: true, rhesus: true, componentType: true, collectionDate: true, expiryDate: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ responses })
}

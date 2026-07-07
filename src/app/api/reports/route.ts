import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { isExpired, isNearExpiry } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['HOSP_ADMIN', 'BBO', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const facilityId = session.role === 'SYS_ADMIN' ? (searchParams.get('facilityId') || undefined) : session.facilityId

  const dateFilter: any = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) dateFilter.lte = new Date(to)

  const where: any = {}
  if (facilityId) where.facilityId = facilityId

  const allUnits = await db.bloodUnit.findMany({
    where,
    include: { donor: { select: { fullName: true } } },
  })

  const totalUnits = allUnits.length
  const availableUnits = allUnits.filter(u => u.status === 'Available')
  const reservedUnits = allUnits.filter(u => u.status === 'Reserved')
  const issuedUnits = allUnits.filter(u => u.status === 'Issued')
  const expiredUnits = allUnits.filter(u => u.status === 'Expired' || isExpired(u.expiryDate))
  const discardedUnits = allUnits.filter(u => u.status === 'Discarded')
  const nearExpiry = availableUnits.filter(u => isNearExpiry(u.expiryDate))

  // Stock by blood group
  const stockByGroup: Record<string, { available: number; total: number; expired: number }> = {}
  for (const g of ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']) {
    const groupUnits = allUnits.filter(u => u.bloodGroup === g)
    stockByGroup[g] = {
      available: groupUnits.filter(u => u.status === 'Available').length,
      total: groupUnits.length,
      expired: groupUnits.filter(u => u.status === 'Expired').length,
    }
  }

  // Component distribution
  const componentDist: Record<string, number> = {}
  for (const u of availableUnits) {
    componentDist[u.componentType] = (componentDist[u.componentType] ?? 0) + 1
  }

  // Internal requests
  const internalWhere: any = {}
  if (facilityId) internalWhere.facilityId = facilityId
  if (Object.keys(dateFilter).length) internalWhere.createdAt = dateFilter
  const internalRequests = await db.internalRequest.findMany({ where: internalWhere })
  const internalByStatus: Record<string, number> = {}
  for (const r of internalRequests) {
    internalByStatus[r.status] = (internalByStatus[r.status] ?? 0) + 1
  }

  // Network requests
  const networkWhere: any = {}
  if (facilityId) networkWhere.facilityId = facilityId
  if (Object.keys(dateFilter).length) networkWhere.createdAt = dateFilter
  const networkRequests = await db.networkRequest.findMany({ where: networkWhere })
  const networkByStatus: Record<string, number> = {}
  for (const r of networkRequests) {
    networkByStatus[r.status] = (networkByStatus[r.status] ?? 0) + 1
  }

  return NextResponse.json({
    summary: {
      totalUnits,
      available: availableUnits.length,
      reserved: reservedUnits.length,
      issued: issuedUnits.length,
      expired: expiredUnits.length,
      discarded: discardedUnits.length,
      nearExpiry: nearExpiry.length,
    },
    stockByGroup,
    componentDist,
    internalRequests: {
      total: internalRequests.length,
      byStatus: internalByStatus,
    },
    networkRequests: {
      total: networkRequests.length,
      byStatus: networkByStatus,
    },
    facility: facilityId ? await db.facility.findUnique({ where: { id: facilityId }, select: { name: true } }) : null,
    period: { from, to },
  })
}

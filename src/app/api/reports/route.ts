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

  const availableUnits = allUnits.filter(u => u.status === 'Available')
  const expiredUnits = allUnits.filter(u => u.status === 'Expired' || isExpired(u.expiryDate))
  const nearExpiry = availableUnits.filter(u => isNearExpiry(u.expiryDate))

  // Stock by blood group (with sub-status)
  const stockByGroup: Record<string, { available: number; total: number; expired: number; reserved: number; issued: number }> = {}
  for (const g of ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']) {
    const groupUnits = allUnits.filter(u => u.bloodGroup === g)
    stockByGroup[g] = {
      available: groupUnits.filter(u => u.status === 'Available').length,
      total: groupUnits.length,
      expired: groupUnits.filter(u => u.status === 'Expired').length,
      reserved: groupUnits.filter(u => u.status === 'Reserved').length,
      issued: groupUnits.filter(u => u.status === 'Issued').length,
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
  const internalByUrgency: Record<string, number> = {}
  const internalByWard: Record<string, number> = {}
  for (const r of internalRequests) {
    internalByStatus[r.status] = (internalByStatus[r.status] ?? 0) + 1
    internalByUrgency[r.urgency] = (internalByUrgency[r.urgency] ?? 0) + 1
    if (r.ward) internalByWard[r.ward] = (internalByWard[r.ward] ?? 0) + 1
  }

  // Network requests
  const networkWhere: any = {}
  if (facilityId) networkWhere.facilityId = facilityId
  if (Object.keys(dateFilter).length) networkWhere.createdAt = dateFilter
  const networkRequests = await db.networkRequest.findMany({ where: networkWhere })
  const networkByStatus: Record<string, number> = {}
  const networkByUrgency: Record<string, number> = {}
  const networkByGroup: Record<string, number> = {}
  for (const r of networkRequests) {
    networkByStatus[r.status] = (networkByStatus[r.status] ?? 0) + 1
    networkByUrgency[r.urgency] = (networkByUrgency[r.urgency] ?? 0) + 1
    networkByGroup[r.bloodGroup] = (networkByGroup[r.bloodGroup] ?? 0) + 1
  }

  // Recent activity (last 30 audit logs)
  const auditWhere: any = {}
  if (facilityId) auditWhere.facilityId = facilityId
  const recentActivity = await db.auditLog.findMany({
    where: auditWhere,
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { user: { select: { fullName: true } } },
  })

  // Storage utilization
  const storageWhere: any = {}
  if (facilityId) storageWhere.facilityId = facilityId
  const storageUnits = await db.storageUnit.findMany({
    where: storageWhere,
    include: { _count: { select: { bloodUnits: true } } },
  })
  const storageUtilization = storageUnits.map(s => ({
    name: s.name,
    category: s.tempCategory,
    used: s._count.bloodUnits,
    capacity: s.maxCapacity,
    utilization: s.maxCapacity ? Math.round((s._count.bloodUnits / s.maxCapacity) * 100) : 0,
  }))

  return NextResponse.json({
    summary: {
      totalUnits: allUnits.length,
      available: availableUnits.length,
      reserved: allUnits.filter(u => u.status === 'Reserved').length,
      issued: allUnits.filter(u => u.status === 'Issued').length,
      expired: expiredUnits.length,
      discarded: allUnits.filter(u => u.status === 'Discarded').length,
      nearExpiry: nearExpiry.length,
    },
    stockByGroup,
    componentDist,
    internalRequests: {
      total: internalRequests.length,
      byStatus: internalByStatus,
      byUrgency: internalByUrgency,
      byWard: internalByWard,
    },
    networkRequests: {
      total: networkRequests.length,
      byStatus: networkByStatus,
      byUrgency: networkByUrgency,
      byGroup: networkByGroup,
    },
    storageUtilization,
    recentActivity: recentActivity.map(a => ({
      id: a.id,
      action: a.action,
      description: a.description,
      user: a.user?.fullName ?? 'System',
      entityType: a.entityType,
      createdAt: a.createdAt,
    })),
    facility: facilityId ? await db.facility.findUnique({ where: { id: facilityId }, select: { name: true, type: true, region: true } }) : null,
    period: { from, to },
    generatedAt: new Date().toISOString(),
  })
}

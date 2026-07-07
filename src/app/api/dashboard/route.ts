import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { isNearExpiry, isExpired, LOW_STOCK_THRESHOLD } from '@/lib/audit'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // For SYS_ADMIN: aggregate cross-network stats
  if (session.role === 'SYS_ADMIN') {
    const [facilities, users, totalUnits, availableUnits, expiredUnits, reservedUnits, openNetworkRequests, issuedThisMonth] = await Promise.all([
      db.facility.count({ where: { status: 'Active' } }),
      db.user.count(),
      db.bloodUnit.count(),
      db.bloodUnit.count({ where: { status: 'Available' } }),
      db.bloodUnit.count({ where: { status: 'Expired' } }),
      db.bloodUnit.count({ where: { status: 'Reserved' } }),
      db.networkRequest.count({ where: { status: { in: ['Open', 'Partially Responded'] } } }),
      db.bloodUnit.count({ where: { status: 'Issued' } }),
    ])

    const facilityList = await db.facility.findMany({
      where: { name: { not: 'BBMS Platform Office' } },
      include: {
        _count: { select: { bloodUnits: true, users: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Per facility stats
    const facilitiesWithStats = await Promise.all(facilityList.map(async (f) => {
      const available = await db.bloodUnit.count({ where: { facilityId: f.id, status: 'Available' } })
      const expired = await db.bloodUnit.count({ where: { facilityId: f.id, status: 'Expired' } })
      const reserved = await db.bloodUnit.count({ where: { facilityId: f.id, status: 'Reserved' } })
      return {
        id: f.id,
        name: f.name,
        type: f.type,
        region: f.region,
        status: f.status,
        totalUnits: f._count.bloodUnits,
        availableUnits: available,
        expiredUnits: expired,
        reservedUnits: reserved,
        usersCount: f._count.users,
      }
    }))

    // Blood group distribution network-wide
    const groupDistribution: Record<string, number> = {}
    const allUnits = await db.bloodUnit.findMany({ where: { status: 'Available' }, select: { bloodGroup: true } })
    for (const u of allUnits) {
      groupDistribution[u.bloodGroup] = (groupDistribution[u.bloodGroup] ?? 0) + 1
    }

    return NextResponse.json({
      role: 'SYS_ADMIN',
      stats: {
        facilities,
        users,
        totalUnits,
        availableUnits,
        expiredUnits,
        reservedUnits,
        openNetworkRequests,
        issuedThisMonth,
      },
      facilities: facilitiesWithStats,
      groupDistribution,
    })
  }

  // For facility-bound roles
  const facilityId = session.facilityId!
  const facility = await db.facility.findUnique({ where: { id: facilityId } })

  const allUnits = await db.bloodUnit.findMany({
    where: { facilityId },
    include: { storageUnit: true, donor: true },
  })

  const availableUnits = allUnits.filter(u => u.status === 'Available')
  const expiredUnits = allUnits.filter(u => u.status === 'Expired' || isExpired(u.expiryDate))
  const nearExpiryUnits = availableUnits.filter(u => isNearExpiry(u.expiryDate))
  const reservedUnits = allUnits.filter(u => u.status === 'Reserved')
  const issuedUnits = allUnits.filter(u => u.status === 'Issued')
  const discardedUnits = allUnits.filter(u => u.status === 'Discarded')

  // Stock by blood group (Available only)
  const stockByGroup: Record<string, number> = {}
  for (const u of availableUnits) {
    stockByGroup[u.bloodGroup] = (stockByGroup[u.bloodGroup] ?? 0) + 1
  }

  // Low stock groups
  const lowStockGroups = Object.entries(stockByGroup).filter(([, c]) => c < LOW_STOCK_THRESHOLD).map(([g]) => g)

  // Pending internal requests
  const pendingInternal = await db.internalRequest.count({
    where: { facilityId, status: 'Pending' },
  })
  const internalToday = await db.internalRequest.count({
    where: {
      facilityId,
      createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
  })

  // Network requests: outgoing (this facility asked) and incoming (others asked, this facility could respond)
  const outgoingNetwork = await db.networkRequest.count({
    where: { facilityId, status: { in: ['Open', 'Partially Responded'] } },
  })
  // Incoming: open network requests from OTHER facilities where this facility has matching stock
  const otherOpenNetworkRequests = await db.networkRequest.findMany({
    where: { facilityId: { not: facilityId }, status: { in: ['Open', 'Partially Responded'] } },
    include: { facility: true, responses: { where: { respondingFacilityId: facilityId } } },
  })
  const incomingMatching = otherOpenNetworkRequests.filter(nr => {
    const hasStock = availableUnits.some(u => u.bloodGroup === nr.bloodGroup)
    const notResponded = nr.responses.length === 0
    return hasStock && notResponded
  })

  // Recent activity (audit log for this facility)
  const recentActivity = await db.auditLog.findMany({
    where: { facilityId },
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: { user: { select: { fullName: true } } },
  })

  return NextResponse.json({
    role: session.role,
    facility: { id: facility!.id, name: facility!.name, type: facility!.type, region: facility!.region },
    stats: {
      totalUnits: allUnits.length,
      availableUnits: availableUnits.length,
      expiredUnits: expiredUnits.length,
      nearExpiryCount: nearExpiryUnits.length,
      reservedUnits: reservedUnits.length,
      issuedUnits: issuedUnits.length,
      discardedUnits: discardedUnits.length,
      pendingInternal,
      internalToday,
      outgoingNetwork,
      incomingMatching: incomingMatching.length,
      lowStockGroups,
    },
    stockByGroup,
    nearExpiryUnits: nearExpiryUnits.slice(0, 10).map(u => ({
      id: u.id,
      unitCode: u.unitCode,
      bloodGroup: u.bloodGroup,
      rhesus: u.rhesus,
      componentType: u.componentType,
      expiryDate: u.expiryDate,
      storageUnitName: u.storageUnit?.name ?? 'Unassigned',
    })),
    pendingInternalRequests: await db.internalRequest.findMany({
      where: { facilityId, status: 'Pending' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { requestedBy: { select: { fullName: true } } },
    }),
    incomingNetworkRequests: incomingMatching.slice(0, 5).map(nr => ({
      id: nr.id,
      requestCode: nr.requestCode,
      bloodGroup: nr.bloodGroup,
      rhesus: nr.rhesus,
      componentType: nr.componentType,
      quantity: nr.quantity,
      urgency: nr.urgency,
      facilityName: nr.facility.name,
      facilityRegion: nr.facility.region,
      createdAt: nr.createdAt,
    })),
    outgoingNetworkRequests: await db.networkRequest.findMany({
      where: { facilityId, status: { in: ['Open', 'Partially Responded'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { _count: { select: { responses: true } } },
    }),
    recentActivity: recentActivity.map(a => ({
      id: a.id,
      action: a.action,
      description: a.description,
      user: a.user?.fullName ?? 'System',
      createdAt: a.createdAt,
    })),
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { logAction } from '@/lib/audit'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'SYS_ADMIN') {
    const users = await db.user.findMany({
      include: { facility: { select: { name: true, region: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ users: users.map(u => ({ ...u, passwordHash: undefined })) })
  }
  if (!['HOSP_ADMIN', 'BBO'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const users = await db.user.findMany({
    where: { facilityId: session.facilityId! },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ users: users.map(u => ({ ...u, passwordHash: undefined })) })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SYS_ADMIN', 'HOSP_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { fullName, email, password, role, facilityId } = body
  if (!fullName || !email || !password || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const targetFacilityId = session.role === 'SYS_ADMIN' ? (facilityId || session.facilityId) : session.facilityId!
  if (session.role === 'HOSP_ADMIN' && role === 'SYS_ADMIN') {
    return NextResponse.json({ error: 'Cannot create system admin' }, { status: 403 })
  }
  // Check email uniqueness
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 400 })

  const passwordHash = await hashPassword(password)
  const user = await db.user.create({
    data: {
      fullName,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      facilityId: targetFacilityId,
      status: 'Active',
    },
  })
  await logAction({
    userId: session.id,
    facilityId: targetFacilityId,
    action: 'CREATE',
    entityType: 'User',
    entityId: user.id,
    description: `Created user ${fullName} (${role})`,
  })
  return NextResponse.json({ user: { ...user, passwordHash: undefined } })
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'
import { logAction } from '@/lib/audit'

// POST /api/auth/login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { facility: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    if (user.status !== 'Active') {
      return NextResponse.json({ error: 'Account is disabled. Contact administrator.' }, { status: 403 })
    }
    if (user.facility && user.facility.status !== 'Active' && user.role !== 'SYS_ADMIN') {
      return NextResponse.json({ error: 'Facility is not active' }, { status: 403 })
    }
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      facilityId: user.facilityId,
      facilityName: user.facility?.name ?? null,
      facilityType: user.facility?.type ?? null,
    }
    await createSession(sessionUser)
    await logAction({
      userId: user.id,
      facilityId: user.facilityId,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      description: `${user.fullName} logged in`,
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
    })
    return NextResponse.json({ user: sessionUser })
  } catch (e) {
    console.error('Login error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

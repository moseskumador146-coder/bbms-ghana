import 'server-only'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { db } from './db'
import { SESSION_COOKIE, type SessionUser } from './auth-constants'

export { SESSION_COOKIE, type SessionUser, ROLE_LABELS, ROLE_BADGES, BLOOD_GROUPS, COMPONENT_TYPES, URGENCY_LEVELS, FACILITY_TYPES, TEMP_CATEGORIES } from './auth-constants'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(user: SessionUser) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, JSON.stringify(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  })
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)
  if (!session) return null
  try {
    return JSON.parse(session.value) as SessionUser
  } catch {
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getCurrentUserWithFacility() {
  const session = await getSession()
  if (!session) return null
  if (session.role === 'SYS_ADMIN') {
    return { ...session, facility: null }
  }
  if (!session.facilityId) return null
  const facility = await db.facility.findUnique({ where: { id: session.facilityId } })
  if (!facility) return null
  return { ...session, facility }
}

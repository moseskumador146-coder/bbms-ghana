import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null })
  }
  // Refresh facility info
  let facilityName = session.facilityName
  let facilityType = session.facilityType
  if (session.facilityId) {
    const f = await db.facility.findUnique({ where: { id: session.facilityId } })
    facilityName = f?.name ?? null
    facilityType = f?.type ?? null
  }
  return NextResponse.json({
    user: {
      ...session,
      facilityName,
      facilityType,
    },
  })
}

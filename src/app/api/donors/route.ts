import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'SYS_ADMIN') {
    const donors = await db.donor.findMany({
      include: { facility: { select: { name: true } }, _count: { select: { bloodUnits: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ donors })
  }
  const donors = await db.donor.findMany({
    where: { facilityId: session.facilityId! },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ donors })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['BBO', 'LAB_TECH', 'HOSP_ADMIN', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { fullName, phone, email, dateOfBirth, bloodGroup, rhesus, consentGiven } = body
  if (!fullName || !phone || !bloodGroup || !rhesus) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!consentGiven) {
    return NextResponse.json({ error: 'Donor consent is required (Data Protection Act 2012)' }, { status: 400 })
  }
  const donor = await db.donor.create({
    data: {
      facilityId: session.facilityId!,
      fullName,
      phone,
      email: email || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      bloodGroup,
      rhesus,
      consentGiven: true,
      lastDonationAt: new Date(),
    },
  })
  await logAction({
    userId: session.id,
    facilityId: session.facilityId!,
    action: 'CREATE',
    entityType: 'Donor',
    entityId: donor.id,
    description: `Registered donor ${fullName} (${bloodGroup}${rhesus})`,
  })
  return NextResponse.json({ donor })
}

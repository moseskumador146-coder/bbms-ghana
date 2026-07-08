import { NextRequest, NextResponse } from 'next/server'
import { getSession, hashPassword } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'

// PUT /api/users/[id] - Update an existing user
// Body: { fullName?, email?, role?, status?, password?, facilityId? (SYS_ADMIN only) }
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SYS_ADMIN', 'HOSP_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const { fullName, email, role, status, password, facilityId } = body

  // Fetch the target user
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // HOSP_ADMIN can only edit users in their own facility
  if (session.role === 'HOSP_ADMIN' && target.facilityId !== session.facilityId) {
    return NextResponse.json({ error: 'You can only edit users at your own facility' }, { status: 403 })
  }
  // HOSP_ADMIN cannot edit a SYS_ADMIN account
  if (session.role === 'HOSP_ADMIN' && target.role === 'SYS_ADMIN') {
    return NextResponse.json({ error: 'You cannot edit a System Administrator account' }, { status: 403 })
  }
  // Nobody can edit their own role (prevent self-demotion / self-elevation)
  if (session.id === id && role && role !== session.role) {
    return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 })
  }
  // Nobody can deactivate themselves
  if (session.id === id && status === 'Disabled') {
    return NextResponse.json({ error: 'You cannot disable your own account' }, { status: 400 })
  }
  // HOSP_ADMIN cannot promote anyone to SYS_ADMIN
  if (session.role === 'HOSP_ADMIN' && role === 'SYS_ADMIN') {
    return NextResponse.json({ error: 'Cannot assign System Administrator role' }, { status: 403 })
  }

  // Email uniqueness check (if changing)
  if (email && email.toLowerCase().trim() !== target.email) {
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
  }

  // Build update payload
  const updateData: any = {}
  if (fullName) updateData.fullName = fullName
  if (email) updateData.email = email.toLowerCase().trim()
  if (role) updateData.role = role
  if (status) updateData.status = status
  if (facilityId && session.role === 'SYS_ADMIN') updateData.facilityId = facilityId
  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    updateData.passwordHash = await hashPassword(password)
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id },
    data: updateData,
  })

  // Build description of changes for audit
  const changes: string[] = []
  if (fullName && fullName !== target.fullName) changes.push(`name "${target.fullName}" → "${fullName}"`)
  if (email && email.toLowerCase().trim() !== target.email) changes.push(`email`)
  if (role && role !== target.role) changes.push(`role ${target.role} → ${role}`)
  if (status && status !== target.status) changes.push(`status ${target.status} → ${status}`)
  if (facilityId && session.role === 'SYS_ADMIN' && facilityId !== target.facilityId) changes.push('facility')
  if (password) changes.push('password reset')

  await logAction({
    userId: session.id,
    facilityId: updated.facilityId,
    action: 'UPDATE',
    entityType: 'User',
    entityId: id,
    description: `Updated user ${updated.fullName}${changes.length ? ` (${changes.join(', ')})` : ''}`,
  })

  return NextResponse.json({ user: { ...updated, passwordHash: undefined } })
}

// DELETE /api/users/[id] - Delete a user permanently
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SYS_ADMIN', 'HOSP_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params

  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Cannot delete self
  if (session.id === id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }
  // HOSP_ADMIN scope check
  if (session.role === 'HOSP_ADMIN' && target.facilityId !== session.facilityId) {
    return NextResponse.json({ error: 'You can only delete users at your own facility' }, { status: 403 })
  }
  // HOSP_ADMIN cannot delete SYS_ADMIN
  if (session.role === 'HOSP_ADMIN' && target.role === 'SYS_ADMIN') {
    return NextResponse.json({ error: 'You cannot delete a System Administrator account' }, { status: 403 })
  }
  // Prevent deleting if user has dependent records (blood units, requests) — reassign or block
  const [registeredUnits, internalRequests, networkRequests, auditLogs] = await Promise.all([
    db.bloodUnit.count({ where: { registeredById: id } }),
    db.internalRequest.count({ where: { requestedById: id } }),
    db.networkRequest.count({ where: { requestedById: id } }),
    db.auditLog.count({ where: { userId: id } }),
  ])

  const totalDependents = registeredUnits + internalRequests + networkRequests + auditLogs
  if (totalDependents > 0) {
    return NextResponse.json({
      error: `Cannot delete this user — they have ${registeredUnits} registered blood unit(s), ${internalRequests} internal request(s), ${networkRequests} network request(s), and ${auditLogs} audit log entries. Disable the account instead to preserve data integrity.`,
    }, { status: 400 })
  }

  await db.user.delete({ where: { id } })

  await logAction({
    userId: session.id,
    facilityId: session.facilityId,
    action: 'DELETE',
    entityType: 'User',
    entityId: id,
    description: `Deleted user ${target.fullName} (${target.email}, ${target.role})`,
  })

  return NextResponse.json({ success: true })
}

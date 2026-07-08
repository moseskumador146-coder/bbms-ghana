import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { isExpired, isNearExpiry } from '@/lib/audit'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function buildReportData(session: any, from?: string, to?: string, facilityId?: string) {
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

  const stockByGroup: Record<string, any> = {}
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

  const componentDist: Record<string, number> = {}
  for (const u of availableUnits) {
    componentDist[u.componentType] = (componentDist[u.componentType] ?? 0) + 1
  }

  const internalWhere: any = {}
  if (facilityId) internalWhere.facilityId = facilityId
  if (Object.keys(dateFilter).length) internalWhere.createdAt = dateFilter
  const internalRequests = await db.internalRequest.findMany({ where: internalWhere })
  const internalByStatus: Record<string, number> = {}
  const internalByUrgency: Record<string, number> = {}
  for (const r of internalRequests) {
    internalByStatus[r.status] = (internalByStatus[r.status] ?? 0) + 1
    internalByUrgency[r.urgency] = (internalByUrgency[r.urgency] ?? 0) + 1
  }

  const networkWhere: any = {}
  if (facilityId) networkWhere.facilityId = facilityId
  if (Object.keys(dateFilter).length) networkWhere.createdAt = dateFilter
  const networkRequests = await db.networkRequest.findMany({ where: networkWhere })
  const networkByStatus: Record<string, number> = {}
  const networkByGroup: Record<string, number> = {}
  for (const r of networkRequests) {
    networkByStatus[r.status] = (networkByStatus[r.status] ?? 0) + 1
    networkByGroup[r.bloodGroup] = (networkByGroup[r.bloodGroup] ?? 0) + 1
  }

  const auditWhere: any = {}
  if (facilityId) auditWhere.facilityId = facilityId
  const recentActivity = await db.auditLog.findMany({
    where: auditWhere,
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { user: { select: { fullName: true } } },
  })

  const storageWhere: any = {}
  if (facilityId) storageWhere.facilityId = facilityId
  const storageUnits = await db.storageUnit.findMany({
    where: storageWhere,
    include: { _count: { select: { bloodUnits: true } } },
  })

  const facility = facilityId ? await db.facility.findUnique({ where: { id: facilityId }, select: { name: true, type: true, region: true } }) : null

  return {
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
    },
    networkRequests: {
      total: networkRequests.length,
      byStatus: networkByStatus,
      byGroup: networkByGroup,
    },
    storageUtilization: storageUnits.map(s => ({
      name: s.name,
      category: s.tempCategory,
      used: s._count.bloodUnits,
      capacity: s.maxCapacity,
      utilization: s.maxCapacity ? Math.round((s._count.bloodUnits / s.maxCapacity) * 100) : 0,
    })),
    recentActivity: recentActivity.map(a => ({
      id: a.id,
      action: a.action,
      description: a.description,
      user: a.user?.fullName ?? 'System',
      entityType: a.entityType,
      createdAt: a.createdAt.toISOString(),
    })),
    facility,
    period: { from, to },
    generatedAt: new Date().toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['HOSP_ADMIN', 'BBO', 'SYS_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined
  const facilityId = session.role === 'SYS_ADMIN' ? (searchParams.get('facilityId') || undefined) : session.facilityId!

  const data = await buildReportData(session, from, to, facilityId)

  // Write JSON to temp file
  const tmpDir = join(tmpdir(), 'bbms-reports')
  if (!existsSync(tmpDir)) await mkdir(tmpDir, { recursive: true })
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  const jsonPath = join(tmpDir, `report-${id}.json`)
  const pdfPath = join(tmpDir, `report-${id}.pdf`)
  await writeFile(jsonPath, JSON.stringify(data), 'utf-8')

  try {
    const scriptPath = join(process.cwd(), 'scripts', 'generate_report_pdf.py')
    // Use the venv python which has reportlab installed
    const pythonBin = process.env.PYTHON_BIN || '/home/z/.venv/bin/python3'
    const { stderr } = await execAsync(`${pythonBin} ${scriptPath} ${jsonPath} ${pdfPath}`, { timeout: 30000, env: { ...process.env, PATH: '/home/z/.venv/bin:' + (process.env.PATH || '') } })
    if (stderr) console.error('PDF generation stderr:', stderr)

    if (!existsSync(pdfPath)) {
      return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
    }

    const pdfBuffer = await readFile(pdfPath)
    // Cleanup
    await unlink(jsonPath).catch(() => {})
    await unlink(pdfPath).catch(() => {})

    const filename = `BBMS-Report-${new Date().toISOString().split('T')[0]}.pdf`
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (e) {
    console.error('PDF export error', e)
    // Cleanup
    await unlink(jsonPath).catch(() => {})
    await unlink(pdfPath).catch(() => {})
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

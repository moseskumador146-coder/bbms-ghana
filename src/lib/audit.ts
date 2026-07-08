import { db } from './db'

export async function logAction(params: {
  userId?: string | null
  facilityId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  description: string
  ipAddress?: string | null
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId ?? null,
        facilityId: params.facilityId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        description: params.description,
        ipAddress: params.ipAddress ?? null,
      },
    })
  } catch (e) {
    console.error('Failed to log audit', e)
  }
}

// Days until expiry default threshold
export const EXPIRY_ALERT_DAYS = 5
// Low stock threshold per blood group
export const LOW_STOCK_THRESHOLD = 5

export function daysBetween(from: Date, to: Date): number {
  const diff = to.getTime() - from.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isNearExpiry(expiryDate: Date, thresholdDays = EXPIRY_ALERT_DAYS): boolean {
  const now = new Date()
  return daysBetween(now, expiryDate) <= thresholdDays && daysBetween(now, expiryDate) >= 0
}

export function isExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate
}

export function generateUnitCode(facilityCode: string, sequence: number): string {
  return `${facilityCode}-BU-${String(sequence).padStart(5, '0')}`
}

export function generateRequestCode(facilityCode: string, sequence: number): string {
  return `${facilityCode}-NR-${String(sequence).padStart(5, '0')}`
}

export function facilityCodeFromName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0].slice(0, 2) + words[1].slice(0, 1)).toUpperCase()
  }
  return name.slice(0, 3).toUpperCase()
}

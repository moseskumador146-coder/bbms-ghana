// Shared auth constants - safe to import from client AND server

export const SESSION_COOKIE = 'bbms_session'

export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: string
  facilityId: string | null
  facilityName?: string | null
  facilityType?: string | null
}

export const ROLE_LABELS: Record<string, string> = {
  SYS_ADMIN: 'System Administrator',
  BBO: 'Blood Bank Officer',
  LAB_TECH: 'Laboratory Technician',
  HOSP_ADMIN: 'Hospital Administrator',
  NURSE_DOCTOR: 'Nurse / Doctor',
}

export const ROLE_BADGES: Record<string, string> = {
  SYS_ADMIN: 'bg-rose-100 text-rose-700 border-rose-200',
  BBO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  LAB_TECH: 'bg-amber-100 text-amber-700 border-amber-200',
  HOSP_ADMIN: 'bg-violet-100 text-violet-700 border-violet-200',
  NURSE_DOCTOR: 'bg-sky-100 text-sky-700 border-sky-200',
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const
export const COMPONENT_TYPES = ['Whole Blood', 'Red Blood Cells', 'Platelets', 'Fresh Frozen Plasma'] as const
export const URGENCY_LEVELS = ['Routine', 'Urgent', 'Emergency'] as const
export const FACILITY_TYPES = ['Clinic', 'District Hospital', 'Regional Hospital', 'Teaching Hospital'] as const
export const TEMP_CATEGORIES = ['Refrigerated', 'Frozen', 'Room Temperature'] as const

export function getRh(group: string): string {
  return group.endsWith('+') ? '+' : '-'
}
export function getBaseGroup(group: string): string {
  return group.slice(0, -1)
}

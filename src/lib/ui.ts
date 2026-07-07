import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, opts: Intl.DateTimeFormatOptions = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', ...opts })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return formatDate(d)
}

export function daysUntil(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(date) : date
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export const STATUS_COLORS: Record<string, string> = {
  Available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Reserved: 'bg-amber-100 text-amber-700 border-amber-200',
  Issued: 'bg-sky-100 text-sky-700 border-sky-200',
  Expired: 'bg-rose-100 text-rose-700 border-rose-200',
  Discarded: 'bg-slate-200 text-slate-700 border-slate-300',
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  Approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-100 text-rose-700 border-rose-200',
  Cancelled: 'bg-slate-200 text-slate-700 border-slate-300',
  Open: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Partially Responded': 'bg-amber-100 text-amber-700 border-amber-200',
  Fulfilled: 'bg-sky-100 text-sky-700 border-sky-200',
  Withdrawn: 'bg-slate-200 text-slate-700 border-slate-300',
  Selected: 'bg-violet-100 text-violet-700 border-violet-200',
  Active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Suspended: 'bg-rose-100 text-rose-700 border-rose-200',
  Disabled: 'bg-slate-200 text-slate-700 border-slate-300',
}

export const URGENCY_COLORS: Record<string, string> = {
  Routine: 'bg-slate-100 text-slate-700 border-slate-200',
  Urgent: 'bg-amber-100 text-amber-700 border-amber-200',
  Emergency: 'bg-rose-100 text-rose-700 border-ose-200 border-2 animate-pulse',
}

export const BLOOD_GROUP_COLORS: Record<string, string> = {
  'O+': 'bg-rose-500',
  'O-': 'bg-rose-600',
  'A+': 'bg-emerald-500',
  'A-': 'bg-emerald-600',
  'B+': 'bg-sky-500',
  'B-': 'bg-sky-600',
  'AB+': 'bg-violet-500',
  'AB-': 'bg-violet-600',
}

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-700 border-slate-200'
}

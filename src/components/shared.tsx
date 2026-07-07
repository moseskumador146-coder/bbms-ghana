'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

export function StatCard({
  title, value, icon: Icon, accent = 'rose', subtitle, onClick,
}: {
  title: string
  value: ReactNode
  icon: LucideIcon
  accent?: 'rose' | 'emerald' | 'amber' | 'sky' | 'violet' | 'slate'
  subtitle?: ReactNode
  onClick?: () => void
}) {
  const accentClasses: Record<string, { bg: string; text: string; ring: string }> = {
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-200' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-200' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200' },
  }
  const a = accentClasses[accent]
  return (
    <Card
      className={`hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 leading-tight">{value}</div>
            {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
          </div>
          <div className={`w-10 h-10 rounded-lg ${a.bg} ${a.text} ring-1 ${a.ring} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

export function EmptyState({ title, description, icon: Icon }: { title: string; description?: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {description && <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>}
    </div>
  )
}

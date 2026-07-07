'use client'
import { Card, CardContent } from '@/components/ui/card'
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
    rose: { bg: 'bg-rose-50 dark:bg-rose-950/50', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-200 dark:ring-rose-900' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-900' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-900' },
    sky: { bg: 'bg-sky-50 dark:bg-sky-950/50', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-200 dark:ring-sky-900' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-950/50', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-200 dark:ring-violet-900' },
    slate: { bg: 'bg-muted', text: 'text-muted-foreground', ring: 'ring-border' },
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
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</div>
            <div className="text-2xl font-bold text-foreground mt-1 leading-tight">{value}</div>
            {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
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
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

export function EmptyState({ title, description, icon: Icon }: { title: string; description?: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>}
    </div>
  )
}

'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader, EmptyState, StatCard } from '@/components/shared'
import { BLOOD_GROUP_COLORS, formatDate, daysUntil } from '@/lib/ui'
import { AlertTriangle, Clock, XCircle, Droplet, AlertCircle, CheckCircle2 } from 'lucide-react'

export function AlertsPage() {
  const [nearExpiry, setNearExpiry] = useState<any[]>([])
  const [expired, setExpired] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [nr, ex] = await Promise.all([
      fetch('/api/blood-units?expiringWithin=5').then(r => r.json()),
      fetch('/api/blood-units?status=Expired').then(r => r.json()),
    ])
    setNearExpiry(nr.units ?? [])
    setExpired(ex.units ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <PageHeader title="Expiry & Stock Alerts" description="Blood units requiring immediate attention" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <StatCard title="Expiring Soon" value={nearExpiry.length} icon={Clock} accent="amber" subtitle="Within 5 days" />
        <StatCard title="Already Expired" value={expired.length} icon={XCircle} accent="rose" subtitle="Requires disposal" />
        <StatCard title="Total Critical" value={nearExpiry.length + expired.length} icon={AlertTriangle} accent="rose" subtitle="Need action" />
      </div>

      {/* Near expiry */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Expiring Within 5 Days
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : nearExpiry.length === 0 ? (
            <EmptyState title="No units expiring soon" icon={CheckCircle2} />
          ) : (
            <div className="divide-y divide-slate-100">
              {nearExpiry.map(u => {
                const days = daysUntil(u.expiryDate)
                return (
                  <div key={u.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded ${BLOOD_GROUP_COLORS[u.bloodGroup]} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                        {u.bloodGroup}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium font-mono text-foreground">{u.unitCode}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.componentType} · {u.storageUnit?.name ?? 'Unassigned'}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted-foreground">{formatDate(u.expiryDate)}</div>
                      <Badge variant="outline" className={
                        days <= 1 ? 'border-rose-300 text-rose-700 bg-rose-50' :
                        days <= 3 ? 'border-amber-300 text-amber-700 bg-amber-50' :
                        'border-yellow-300 text-yellow-700 bg-yellow-50'
                      }>
                        {days === 0 ? 'Today!' : days === 1 ? '1 day' : `${days} days`}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expired */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-500" /> Expired Units (Require Disposal)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : expired.length === 0 ? (
            <EmptyState title="No expired units" icon={CheckCircle2} />
          ) : (
            <div className="divide-y divide-slate-100">
              {expired.map(u => (
                <div key={u.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded ${BLOOD_GROUP_COLORS[u.bloodGroup]} text-white text-xs font-bold flex items-center justify-center shrink-0 opacity-70`}>
                      {u.bloodGroup}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium font-mono text-foreground">{u.unitCode}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.componentType} · Expired {formatDate(u.expiryDate)}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50">Expired</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <div className="font-semibold">Why these alerts matter</div>
          <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Expired blood units cannot be used for transfusion and must be discarded. Units expiring soon should be prioritized for use to minimize wastage. The system automatically flags units 5 days before expiry.
          </div>
        </div>
      </div>
    </div>
  )
}

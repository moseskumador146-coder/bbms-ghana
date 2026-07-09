'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from '@/lib/router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StatCard, PageHeader, EmptyState } from '@/components/shared'
import { BLOOD_GROUP_COLORS, statusColor, formatDate, timeAgo, daysUntil } from '@/lib/ui'
import {
  Droplet, Boxes, AlertTriangle, Network, FlaskConical, Building2, Users,
  Activity, ShieldCheck, Clock, ArrowRight, TrendingUp, Heart, CheckCircle2, XCircle
} from 'lucide-react'

interface DashboardData {
  role: string
  facility?: { id: string; name: string; type: string; region: string }
  stats: any
  stockByGroup?: Record<string, number>
  nearExpiryUnits?: any[]
  pendingInternalRequests?: any[]
  incomingNetworkRequests?: any[]
  outgoingNetworkRequests?: any[]
  recentActivity?: any[]
  facilities?: any[]
  groupDistribution?: Record<string, number>
}

export function DashboardPage() {
  const { user } = useAuth()
  const { navigate } = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (data.role === 'SYS_ADMIN') {
    return <SysAdminDashboard data={data} navigate={navigate} />
  }

  return <FacilityDashboard data={data} navigate={navigate} userName={user?.fullName ?? ''} />
}

function FacilityDashboard({ data, navigate, userName }: { data: DashboardData; navigate: (p: string) => void; userName: string }) {
  const { facility, stats, stockByGroup, nearExpiryUnits, pendingInternalRequests, incomingNetworkRequests, outgoingNetworkRequests, recentActivity } = data

  // Safety check - if stats is undefined, show loading
  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  const totalStock = Object.values(stockByGroup ?? {}).reduce((s, c) => s + (c as number), 0)
  const groupEntries = Object.entries(stockByGroup ?? {}).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${userName.split(' ')[0]}`}
        description={facility ? `${facility.name} · ${facility.type} · ${facility.region} Region` : 'Loading facility...'}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Available Units" value={stats.availableUnits ?? 0} icon={Droplet} accent="rose" subtitle={`${stats.totalUnits ?? 0} total in inventory`} onClick={() => navigate('blood-units')} />
        <StatCard title="Expiring Soon" value={stats.nearExpiryCount ?? 0} icon={AlertTriangle} accent="amber" subtitle="Within 5 days" onClick={() => navigate('alerts')} />
        <StatCard title="Pending Requests" value={stats.pendingInternal ?? 0} icon={FlaskConical} accent="sky" subtitle={`${stats.internalToday ?? 0} submitted today`} onClick={() => navigate('internal-requests')} />
        <StatCard title="Network Activity" value={(stats.incomingMatching ?? 0) + (stats.outgoingNetwork ?? 0)} icon={Network} accent="violet" subtitle={`${stats.incomingMatching ?? 0} incoming · ${stats.outgoingNetwork ?? 0} outgoing`} onClick={() => navigate('network-requests')} />
      </div>

      {(stats.lowStockGroups?.length > 0 || stats.expiredUnits > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.lowStockGroups?.length > 0 && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">Low Stock Alert</div>
                <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Blood groups below threshold ({'< 5 units'}): {stats.lowStockGroups.join(', ')}
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50" onClick={() => navigate('network-requests')}>
                Broadcast
              </Button>
            </div>
          )}
          {stats.expiredUnits > 0 && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-rose-800 dark:text-rose-200">Expired Units</div>
                <div className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                  {stats.expiredUnits} units have expired and require disposal
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50" onClick={() => navigate('alerts')}>
                Review
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Stock by Blood Group</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('blood-units')}>
                View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {groupEntries.map(([group, count]) => (
                <button
                  key={group}
                  onClick={() => navigate('blood-units')}
                  className="rounded-lg border border-border p-3 hover:border-border hover:shadow-sm transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-md ${BLOOD_GROUP_COLORS[group]} text-white text-xs font-bold flex items-center justify-center`}>
                      {group}
                    </div>
                    <span className="text-xs text-muted-foreground">units</span>
                  </div>
                  <div className={`text-2xl font-bold ${count === 0 ? 'text-rose-600' : (count as number) < 5 ? 'text-amber-600' : 'text-foreground'}`}>
                    {count as number}
                  </div>
                  <Progress value={totalStock ? ((count as number) / Math.max(totalStock, 8)) * 100 : 0} className="h-1 mt-2" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto">
              {recentActivity?.length === 0 ? (
                <EmptyState title="No recent activity" icon={Activity} />
              ) : (
                <div className="space-y-0">
                  {recentActivity?.map((a, i) => (
                    <div key={a.id} className={`px-4 py-2.5 ${i !== recentActivity.length - 1 ? 'border-b border-border' : ''}`}>
                      <div className="flex items-start gap-2">
                        <div className="text-[10px] text-muted-foreground/70 mt-0.5 shrink-0 w-12">{timeAgo(a.createdAt)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-foreground line-clamp-2">{a.description}</div>
                          <div className="text-[10px] text-muted-foreground/70 mt-0.5">{a.user}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Units Expiring Soon
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('alerts')}>View all</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {nearExpiryUnits?.length === 0 ? (
              <EmptyState title="No units expiring soon" icon={CheckCircle2} />
            ) : (
              <div className="divide-y divide-slate-100">
                {nearExpiryUnits?.slice(0, 5).map(u => {
                  const days = daysUntil(u.expiryDate)
                  return (
                    <div key={u.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded ${BLOOD_GROUP_COLORS[u.bloodGroup]} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                          {u.bloodGroup}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">{u.unitCode}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{u.componentType}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className={days <= 2 ? 'border-rose-300 text-rose-700 bg-rose-50' : 'border-amber-300 text-amber-700 bg-amber-50'}>
                        {days}d left
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-sky-500" />
                Pending Internal Requests
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('internal-requests')}>View all</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {pendingInternalRequests?.length === 0 ? (
              <EmptyState title="No pending requests" icon={CheckCircle2} />
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingInternalRequests?.slice(0, 5).map(r => (
                  <div key={r.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded ${BLOOD_GROUP_COLORS[r.bloodGroup]} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                        {r.bloodGroup}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">{r.patientRef}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{r.ward ?? 'No ward'} · {r.quantity} unit(s)</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={
                      r.urgency === 'Emergency' ? 'border-rose-300 text-rose-700 bg-rose-50' :
                      r.urgency === 'Urgent' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                      'border-border text-foreground bg-background'
                    }>
                      {r.urgency}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {incomingNetworkRequests && incomingNetworkRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="w-4 h-4 text-violet-500" />
                Incoming Network Requests
                <Badge variant="secondary" className="ml-1">{incomingNetworkRequests.length}</Badge>
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('network-requests')}>View all</Button>
            </div>
            <CardDescription className="text-xs">
              Blood requests from other facilities that you can respond to
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {incomingNetworkRequests.slice(0, 4).map(nr => (
                <div key={nr.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-md ${BLOOD_GROUP_COLORS[nr.bloodGroup]} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                      {nr.bloodGroup}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{nr.facilityName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {nr.quantity} unit(s) · {nr.componentType ?? 'Any'} · {nr.urgency}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="border-violet-200 text-violet-700 hover:bg-violet-50" onClick={() => navigate('network-requests')}>
                    Respond <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SysAdminDashboard({ data, navigate }: { data: DashboardData; navigate: (p: string) => void }) {
  const { stats, facilities = [], groupDistribution = {} } = data

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Overview"
        description="System-wide view of all registered facilities and network activity"
        actions={
          <Button onClick={() => navigate('facilities')} variant="outline" size="sm">
            <Building2 className="w-4 h-4 mr-2" /> Manage Facilities
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Active Facilities" value={stats.facilities} icon={Building2} accent="rose" onClick={() => navigate('facilities')} />
        <StatCard title="Registered Users" value={stats.users} icon={Users} accent="violet" onClick={() => navigate('users')} />
        <StatCard title="Total Blood Units" value={stats.totalUnits} icon={Boxes} accent="emerald" subtitle={`${stats.availableUnits} available`} />
        <StatCard title="Open Network Requests" value={stats.openNetworkRequests} icon={Network} accent="amber" onClick={() => navigate('network-requests')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Network Stock Distribution</CardTitle>
            <CardDescription className="text-xs">Available units by blood group across all facilities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(groupDistribution).sort(([a], [b]) => a.localeCompare(b)).map(([group, count]) => (
                <div key={group} className="text-center">
                  <div className={`w-10 h-10 rounded-md ${BLOOD_GROUP_COLORS[group]} text-white text-xs font-bold flex items-center justify-center mx-auto`}>
                    {group}
                  </div>
                  <div className="text-sm font-bold text-foreground mt-1">{count as number}</div>
                </div>
              ))}
              {Object.keys(groupDistribution).length === 0 && (
                <div className="col-span-4 text-center text-xs text-muted-foreground py-6">No available units</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Facility Network</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('facilities')}>
                View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {facilities.map(f => (
                <div key={f.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{f.type} · {f.region}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <div className="font-semibold text-foreground">{f.availableUnits}</div>
                      <div className="text-[10px] text-muted-foreground">Available</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-amber-600">{f.expiredUnits}</div>
                      <div className="text-[10px] text-muted-foreground">Expired</div>
                    </div>
                    <Badge variant="outline" className={statusColor(f.status)}>{f.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

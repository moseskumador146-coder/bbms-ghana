'use client'
import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader, StatCard } from '@/components/shared'
import { BLOOD_GROUP_COLORS } from '@/lib/ui'
import {
  FileBarChart, Download, FileText, Printer, Droplet, Network, FlaskConical,
  TrendingUp, AlertTriangle, XCircle, Boxes, Snowflake,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const CHART_COLORS = ['#e11d48', '#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#64748b', '#ef4444', '#06b6d4']

export function ReportsPage() {
  const [facilities, setFacilities] = useState<any[]>([])
  const [report, setReport] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [facilityId, setFacilityId] = useState('')
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/facilities').then(r => r.json()).then(d => setFacilities((d.facilities ?? []).filter((f: any) => f.name !== 'BBMS Platform Office')))
  }, [])

  async function runReport() {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (facilityId) params.set('facilityId', facilityId)
    const res = await fetch(`/api/reports?${params.toString()}`)
    const data = await res.json()
    setReport(data)
    setLoading(false)
  }

  useEffect(() => { runReport() }, [])

  async function exportReport(format: 'pdf' | 'docx') {
    setExporting(format)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (facilityId) params.set('facilityId', facilityId)
      const res = await fetch(`/api/reports/export-${format}?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? `Failed to export ${format.toUpperCase()}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `BBMS-Report-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`${format.toUpperCase()} report exported successfully`)
    } catch (e) {
      toast.error(`Failed to export ${format.toUpperCase()}`)
    } finally {
      setExporting(null)
    }
  }

  function exportCSV() {
    if (!report) return
    const rows: string[][] = []
    rows.push(['Metric', 'Value'])
    Object.entries(report.summary).forEach(([k, v]) => rows.push([k, String(v)]))
    rows.push([])
    rows.push(['Blood Group', 'Available', 'Total', 'Expired', 'Reserved', 'Issued'])
    Object.entries(report.stockByGroup).forEach(([g, v]: [string, any]) => rows.push([g, String(v.available), String(v.total), String(v.expired), String(v.reserved), String(v.issued)]))
    rows.push([])
    rows.push(['Internal Requests by Status', 'Count'])
    Object.entries(report.internalRequests.byStatus).forEach(([k, v]: [string, any]) => rows.push([k, String(v)]))
    rows.push([])
    rows.push(['Network Requests by Status', 'Count'])
    Object.entries(report.networkRequests.byStatus).forEach(([k, v]: [string, any]) => rows.push([k, String(v)]))

    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bbms-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Report exported as CSV')
  }

  function printReport() {
    window.print()
  }

  const stockChartData = report ? Object.entries(report.stockByGroup).map(([group, v]: [string, any]) => ({
    group,
    available: v.available,
    total: v.total,
    expired: v.expired,
    reserved: v.reserved,
  })).sort((a, b) => a.group.localeCompare(b.group)) : []

  const componentChartData = report ? Object.entries(report.componentDist).map(([name, value]: [string, any]) => ({
    name, value
  })) : []

  const internalStatusData = report ? Object.entries(report.internalRequests.byStatus).map(([name, value]: [string, any]) => ({
    name, value
  })) : []

  const networkStatusData = report ? Object.entries(report.networkRequests.byStatus).map(([name, value]: [string, any]) => ({
    name, value
  })) : []

  const networkGroupData = report ? Object.entries(report.networkRequests.byGroup).map(([group, value]: [string, any]) => ({
    group, value
  })).sort((a, b) => a.group.localeCompare(b.group)) : []

  const storageData = report?.storageUtilization ?? []

  const internalUrgencyData = report ? Object.entries(report.internalRequests.byUrgency).map(([name, value]: [string, any]) => ({
    name, value
  })) : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive facility-level reports with charts, graphs, and exportable formats"
        actions={
          <div className="flex gap-2 flex-wrap no-print">
            <Button variant="outline" onClick={exportCSV} disabled={!report} size="sm">
              <Download className="w-4 h-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" onClick={() => exportReport('pdf')} disabled={!report || exporting !== null} size="sm">
              <FileText className="w-4 h-4 mr-2" /> {exporting === 'pdf' ? 'Generating...' : 'PDF'}
            </Button>
            <Button variant="outline" onClick={() => exportReport('docx')} disabled={!report || exporting !== null} size="sm">
              <FileText className="w-4 h-4 mr-2" /> {exporting === 'docx' ? 'Generating...' : 'DOCX'}
            </Button>
            <Button onClick={printReport} disabled={!report} size="sm" className="bg-rose-600 hover:bg-rose-700">
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
          </div>
        }
      />

      <Card className="no-print">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <Label>From Date</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <Label>Facility (Admin only)</Label>
              <Select value={facilityId || 'mine'} onValueChange={(v) => setFacilityId(v === 'mine' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mine">My facility</SelectItem>
                  {facilities.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runReport} disabled={loading} className="bg-rose-600 hover:bg-rose-700">
              {loading ? 'Running...' : 'Run Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <div ref={reportRef} className="space-y-6">
          {/* Print header (visible only when printing) */}
          <div className="print-only">
            <h1 className="text-2xl font-bold">Blood Bank Management Report</h1>
            <p className="text-sm text-muted-foreground">
              {report.facility?.name ?? 'All Facilities'}
              {report.facility?.type ? ` · ${report.facility.type}` : ''}
              {report.facility?.region ? ` · ${report.facility.region} Region` : ''}
              {report.period?.from || report.period?.to ? ` · Period: ${report.period.from ?? 'start'} to ${report.period.to ?? 'now'}` : ' · All time'}
            </p>
          </div>

          {/* Summary stats */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Inventory Summary
              {report.facility && <span className="text-xs text-muted-foreground font-normal">· {report.facility.name}</span>}
              {report.period?.from && <span className="text-xs text-muted-foreground font-normal">· {report.period.from} to {report.period.to ?? 'now'}</span>}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <StatCard title="Total Units" value={report.summary.totalUnits} icon={Droplet} accent="rose" />
              <StatCard title="Available" value={report.summary.available} icon={Droplet} accent="emerald" />
              <StatCard title="Issued" value={report.summary.issued} icon={FlaskConical} accent="sky" />
              <StatCard title="Expired/Discarded" value={report.summary.expired + report.summary.discarded} icon={XCircle} accent="amber" />
            </div>
          </div>

          {/* Stock by blood group - Bar Chart */}
          <Card className="print-block">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Blood Group Stock Distribution</CardTitle>
              <CardDescription className="text-xs">Available, total, expired, and reserved units by blood group</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" className="stroke-border" />
                    <XAxis dataKey="group" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="available" name="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="reserved" name="Reserved" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expired" name="Expired" fill="#e11d48" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Component Distribution Pie + Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <Card className="print-block">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Component Distribution</CardTitle>
                <CardDescription className="text-xs">Available units by component type</CardDescription>
              </CardHeader>
              <CardContent>
                {componentChartData.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-12">No available units</div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={componentChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry: any) => `${entry.name}: ${entry.value}`}
                          labelLine={false}
                          fontSize={11}
                        >
                          {componentChartData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print-block">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Internal Requests by Status</CardTitle>
                <CardDescription className="text-xs">Total: {report.internalRequests.total} requests</CardDescription>
              </CardHeader>
              <CardContent>
                {internalStatusData.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-12">No internal requests in period</div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={internalStatusData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" width={80} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="value" name="Count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Internal Requests by Urgency + Network Requests by Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <Card className="print-block">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Internal Requests by Urgency</CardTitle>
                <CardDescription className="text-xs">Distribution by urgency level</CardDescription>
              </CardHeader>
              <CardContent>
                {internalUrgencyData.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-12">No data</div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={internalUrgencyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                          {internalUrgencyData.map((entry, i) => (
                            <Cell key={i} fill={
                              entry.name === 'Emergency' ? '#e11d48' :
                              entry.name === 'Urgent' ? '#f59e0b' :
                              '#64748b'
                            } />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print-block">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Network Requests by Status</CardTitle>
                <CardDescription className="text-xs">Total: {report.networkRequests.total} broadcast requests</CardDescription>
              </CardHeader>
              <CardContent>
                {networkStatusData.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-12">No network requests in period</div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={networkStatusData} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" width={110} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="value" name="Count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Network requests by blood group */}
          {networkGroupData.length > 0 && (
            <Card className="print-block">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Network Requests by Blood Group</CardTitle>
                <CardDescription className="text-xs">Which blood groups are most in demand across the network</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={networkGroupData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="group" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="value" name="Requests" radius={[4, 4, 0, 0]}>
                        {networkGroupData.map((entry, i) => (
                          <Cell key={i} fill={BLOOD_GROUP_COLORS[entry.group as keyof typeof BLOOD_GROUP_COLORS] ?? '#8b5cf6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Storage utilization */}
          <Card className="print-block">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Storage Unit Utilization</CardTitle>
              <CardDescription className="text-xs">Current usage vs maximum capacity</CardDescription>
            </CardHeader>
            <CardContent>
              {storageData.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-12">No storage units</div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={storageData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="currentColor" className="text-muted-foreground" angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" unit="%" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: any, name: any, props: any) => {
                          if (name === 'utilization') return [`${value}%`, 'Utilization']
                          return [value, name]
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="used" name="Used" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="capacity" name="Capacity" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock by Blood Group Detailed Table */}
          <Card className="print-block">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stock by Blood Group (Detailed)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left py-2">Blood Group</th>
                      <th className="text-right py-2">Available</th>
                      <th className="text-right py-2">Total</th>
                      <th className="text-right py-2">Expired</th>
                      <th className="text-right py-2">Reserved</th>
                      <th className="text-right py-2">Issued</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.stockByGroup).map(([group, v]: [string, any]) => (
                      <tr key={group} className="border-b border-border">
                        <td className="py-2">
                          <div className={`inline-flex w-8 h-8 rounded ${BLOOD_GROUP_COLORS[group]} text-white text-xs font-bold items-center justify-center`}>{group}</div>
                        </td>
                        <td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{v.available}</td>
                        <td className="text-right">{v.total}</td>
                        <td className="text-right text-rose-600 dark:text-rose-400">{v.expired}</td>
                        <td className="text-right text-amber-600 dark:text-amber-400">{v.reserved}</td>
                        <td className="text-right text-sky-600 dark:text-sky-400">{v.issued}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Print footer */}
          <div className="print-only text-xs text-muted-foreground mt-8 pt-4 border-t border-border">
            Generated by BBMS Ghana on {new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
          </div>
        </div>
      )}
    </div>
  )
}

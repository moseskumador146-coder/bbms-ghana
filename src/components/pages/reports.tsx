'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader, StatCard } from '@/components/shared'
import { BLOOD_GROUP_COLORS } from '@/lib/ui'
import { FileBarChart, Download, Calendar, TrendingUp, Droplet, Network, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'

export function ReportsPage() {
  const [facilities, setFacilities] = useState<any[]>([])
  const [report, setReport] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [facilityId, setFacilityId] = useState('')

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

  function exportCSV() {
    if (!report) return
    const rows: string[][] = []
    rows.push(['Metric', 'Value'])
    Object.entries(report.summary).forEach(([k, v]) => rows.push([k, String(v)]))
    rows.push([])
    rows.push(['Blood Group', 'Available', 'Total', 'Expired'])
    Object.entries(report.stockByGroup).forEach(([g, v]: [string, any]) => rows.push([g, String(v.available), String(v.total), String(v.expired)]))
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Generate facility-level reports on stock, usage, and request activity"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={!report}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button variant="outline" onClick={printReport} disabled={!report}>
              <FileBarChart className="w-4 h-4 mr-2" /> Print
            </Button>
          </div>
        }
      />

      <Card>
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
        <>
          {/* Summary stats */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Inventory Summary
              {report.facility && <span className="text-xs text-slate-500 font-normal">· {report.facility.name}</span>}
              {report.period?.from && <span className="text-xs text-slate-500 font-normal">· {report.period.from} to {report.period.to ?? 'now'}</span>}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <StatCard title="Total Units" value={report.summary.totalUnits} icon={Droplet} accent="rose" />
              <StatCard title="Available" value={report.summary.available} icon={Droplet} accent="emerald" />
              <StatCard title="Issued" value={report.summary.issued} icon={FlaskConical} accent="sky" />
              <StatCard title="Expired/Discarded" value={report.summary.expired + report.summary.discarded} icon={Network} accent="amber" />
            </div>
          </div>

          {/* Stock by blood group */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stock by Blood Group</CardTitle>
              <CardDescription className="text-xs">Available vs Total vs Expired</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="text-left py-2">Blood Group</th>
                      <th className="text-right py-2">Available</th>
                      <th className="text-right py-2">Total</th>
                      <th className="text-right py-2">Expired</th>
                      <th className="py-2 w-1/3">Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.stockByGroup).map(([group, v]: [string, any]) => {
                      const maxTotal = Math.max(...Object.values(report.stockByGroup).map((x: any) => x.total), 1)
                      const pct = (v.total / maxTotal) * 100
                      return (
                        <tr key={group} className="border-b border-slate-100">
                          <td className="py-2">
                            <div className={`inline-flex w-8 h-8 rounded ${BLOOD_GROUP_COLORS[group]} text-white text-xs font-bold items-center justify-center`}>{group}</div>
                          </td>
                          <td className="text-right font-semibold text-emerald-600">{v.available}</td>
                          <td className="text-right">{v.total}</td>
                          <td className="text-right text-rose-600">{v.expired}</td>
                          <td className="py-2">
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Requests activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Internal Requests</CardTitle>
                <CardDescription className="text-xs">Total: {report.internalRequests.total}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(report.internalRequests.byStatus).map(([status, count]: [string, any]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{status}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                  {Object.keys(report.internalRequests.byStatus).length === 0 && (
                    <div className="text-xs text-slate-500 text-center py-4">No internal requests in period</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Network Requests</CardTitle>
                <CardDescription className="text-xs">Total: {report.networkRequests.total}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(report.networkRequests.byStatus).map(([status, count]: [string, any]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{status}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                  {Object.keys(report.networkRequests.byStatus).length === 0 && (
                    <div className="text-xs text-slate-500 text-center py-4">No network requests in period</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Component distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Component Distribution (Available)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(report.componentDist).map(([comp, count]: [string, any]) => (
                  <div key={comp} className="rounded-md border border-slate-200 p-3">
                    <div className="text-xs text-slate-500">{comp}</div>
                    <div className="text-xl font-bold text-slate-900">{count}</div>
                  </div>
                ))}
                {Object.keys(report.componentDist).length === 0 && (
                  <div className="col-span-4 text-xs text-slate-500 text-center py-4">No available units</div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

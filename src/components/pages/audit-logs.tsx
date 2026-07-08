'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, EmptyState } from '@/components/shared'
import { formatDateTime } from '@/lib/ui'
import { ScrollText, User, Building2, Clock, Activity } from 'lucide-react'

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-sky-100 text-sky-700 border-sky-200',
  STATUS_CHANGE: 'bg-violet-100 text-violet-700 border-violet-200',
  DELETE: 'bg-rose-100 text-rose-700 border-rose-200',
  LOGIN: 'bg-muted text-foreground border-border',
  LOGOUT: 'bg-muted text-foreground border-border',
}

const ENTITY_TYPES = ['Facility', 'User', 'BloodUnit', 'InternalRequest', 'NetworkRequest', 'NetworkResponse', 'Donor', 'StorageUnit']

export function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [entityType, setEntityType] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (entityType !== 'all') params.set('entityType', entityType)
    params.set('limit', '200')
    const res = await fetch(`/api/audit-logs?${params.toString()}`)
    const data = await res.json()
    setLogs(data.logs ?? [])
    setLoading(false)
  }, [entityType])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Tamper-resistant record of all system activity (write-once, cannot be modified)"
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label>Filter by Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground ml-auto">
              Showing {logs.length} most recent entries
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <EmptyState title="No audit logs" icon={ScrollText} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Timestamp</TableHead>
                    <TableHead className="w-32">Action</TableHead>
                    <TableHead className="w-36">Entity Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden md:table-cell">User</TableHead>
                    <TableHead className="hidden lg:table-cell">Facility</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ACTION_COLORS[log.action] ?? 'border-border'}>{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.entityType}</TableCell>
                      <TableCell className="text-xs text-foreground">{log.description}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {log.user ? (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-muted-foreground/70" />
                            <span className="truncate max-w-[120px]">{log.user.fullName}</span>
                          </div>
                        ) : <span className="text-muted-foreground/70">System</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {log.facility?.name ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg bg-background border border-border p-4 flex items-start gap-3">
        <Activity className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-xs text-foreground">
          <div className="font-semibold mb-1">Audit Log Compliance</div>
          <p>Audit logs are write-once and cannot be modified or deleted by any user role. Logs are retained for a minimum of 12 months to support traceability and regulatory review under Ghana&apos;s Data Protection Act 2012 (Act 843).</p>
        </div>
      </div>
    </div>
  )
}

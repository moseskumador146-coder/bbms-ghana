'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, EmptyState } from '@/components/shared'
import { BLOOD_GROUP_COLORS, statusColor, formatDateTime, timeAgo, formatDate } from '@/lib/ui'
import { toast } from 'sonner'
import { FlaskConical, Plus, Check, X, Droplet, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const COMPONENT_TYPES = ['Whole Blood', 'Red Blood Cells', 'Platelets', 'Fresh Frozen Plasma']
const URGENCIES = ['Routine', 'Urgent', 'Emergency']
const WARDS = ['Emergency Ward', 'Maternity Ward', 'Surgical Ward', 'ICU', 'Pediatric Ward', 'General Ward']

export function InternalRequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [processFor, setProcessFor] = useState<any | null>(null)
  const [tab, setTab] = useState('active')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/internal-requests')
    const data = await res.json()
    setRequests(data.requests ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const canSubmit = ['NURSE_DOCTOR', 'BBO', 'HOSP_ADMIN', 'SYS_ADMIN'].includes(user?.role ?? '')
  const canProcess = ['BBO', 'SYS_ADMIN'].includes(user?.role ?? '')

  const active = requests.filter(r => ['Pending', 'Approved'].includes(r.status))
  const completed = requests.filter(r => ['Issued', 'Rejected', 'Cancelled'].includes(r.status))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Blood Requests"
        description={
          user?.role === 'NURSE_DOCTOR'
            ? 'Submit and track blood requests from your ward'
            : 'Process blood requests from clinical wards at your facility'
        }
        actions={
          canSubmit && (
            <Button onClick={() => setAddOpen(true)} className="bg-sky-600 hover:bg-sky-700">
              <Plus className="w-4 h-4 mr-2" /> New Blood Request
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active
            {active.length > 0 && <Badge variant="secondary" className="ml-2 h-5 text-[10px]">{active.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
              ) : active.length === 0 ? (
                <EmptyState title="No active requests" description="Pending and approved requests will appear here." icon={Clock} />
              ) : (
                <RequestList requests={active} canProcess={canProcess} onProcess={setProcessFor} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
              ) : completed.length === 0 ? (
                <EmptyState title="No completed requests" icon={CheckCircle2} />
              ) : (
                <RequestList requests={completed} canProcess={false} onProcess={() => {}} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddRequestDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => { load(); toast.success('Blood request submitted'); setAddOpen(false) }}
      />

      {processFor && (
        <ProcessDialog
          request={processFor}
          onClose={() => setProcessFor(null)}
          onSuccess={() => { load(); toast.success('Request processed'); setProcessFor(null) }}
        />
      )}
    </div>
  )
}

function RequestList({ requests, canProcess, onProcess }: { requests: any[]; canProcess: boolean; onProcess: (r: any) => void }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Blood</TableHead>
            <TableHead className="hidden md:table-cell">Qty</TableHead>
            <TableHead className="hidden md:table-cell">Ward</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead className="hidden lg:table-cell">Requested By</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map(r => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="text-sm font-medium text-foreground">{r.patientRef}</div>
                {r.patientName && <div className="text-xs text-muted-foreground">{r.patientName}</div>}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded ${BLOOD_GROUP_COLORS[r.bloodGroup]} text-white text-[10px] font-bold flex items-center justify-center`}>
                    {r.bloodGroup}
                  </div>
                  {r.componentType && <span className="text-xs text-muted-foreground hidden lg:inline">{r.componentType}</span>}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm">{r.quantity}</TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{r.ward ?? '—'}</TableCell>
              <TableCell>
                <Badge variant="outline" className={
                  r.urgency === 'Emergency' ? 'border-rose-300 text-rose-700 bg-rose-50' :
                  r.urgency === 'Urgent' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                  'border-border text-foreground bg-background'
                }>{r.urgency}</Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-xs">{r.requestedBy?.fullName ?? '—'}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {canProcess && r.status === 'Pending' && (
                  <Button size="sm" variant="outline" onClick={() => onProcess(r)}>
                    Process
                  </Button>
                )}
                {r.issuedUnit && (
                  <span className="text-xs text-muted-foreground font-mono">{r.issuedUnit.unitCode}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function AddRequestDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    bloodGroup: 'O+',
    rhesus: '+',
    componentType: 'Whole Blood',
    quantity: '1',
    urgency: 'Routine',
    patientRef: '',
    patientName: '',
    ward: 'Emergency Ward',
    notes: '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.patientRef) { toast.error('Patient reference is required'); return }
    setLoading(true)
    const res = await fetch('/api/internal-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to submit request')
      return
    }
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FlaskConical className="w-5 h-5 text-sky-600" /> New Blood Request</DialogTitle>
          <DialogDescription>Submit a blood request for a patient at your facility.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Blood Group *</Label>
              <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v, rhesus: v.endsWith('+') ? '+' : '-' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Component Type</Label>
              <Select value={form.componentType} onValueChange={(v) => setForm({ ...form, componentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPONENT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input type="number" min="1" max="10" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </div>
            <div>
              <Label>Urgency *</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {URGENCIES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Patient Reference *</Label>
              <Input value={form.patientRef} onChange={(e) => setForm({ ...form, patientRef: e.target.value })} placeholder="e.g., PAT-2026-001" required />
            </div>
            <div>
              <Label>Patient Name</Label>
              <Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} placeholder="Optional" />
            </div>
            <div>
              <Label>Ward / Department</Label>
              <Select value={form.ward} onValueChange={(v) => setForm({ ...form, ward: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WARDS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional clinical context..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-sky-600 hover:bg-sky-700">
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ProcessDialog({ request, onClose, onSuccess }: { request: any; onClose: () => void; onSuccess: () => void }) {
  const [availableUnits, setAvailableUnits] = useState<any[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<'approve' | 'reject' | 'issue'>('issue')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetch(`/api/blood-units?bloodGroup=${encodeURIComponent(request.bloodGroup)}&status=Available`)
      .then(r => r.json())
      .then(d => { setAvailableUnits(d.units ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [request.bloodGroup])

  async function handleSubmit() {
    if (action === 'issue' && !selectedUnitId) { toast.error('Select a unit to issue'); return }
    const res = await fetch(`/api/internal-requests/${request.id}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, unitId: selectedUnitId, notes }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to process')
      return
    }
    onSuccess()
  }

  async function handleCancel() {
    const res = await fetch(`/api/internal-requests/${request.id}/cancel`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to cancel')
      return
    }
    toast.success('Request cancelled')
    onSuccess()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Blood Request</DialogTitle>
          <DialogDescription>
            Patient {request.patientRef} · {request.bloodGroup}{request.rhesus} · {request.quantity} unit(s) · {request.urgency}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-4">Loading available units...</div>
          ) : (
            <>
              <div className="bg-background border border-border rounded-md p-3 text-sm">
                <div className="font-medium text-foreground">{availableUnits.length} compatible {request.bloodGroup} unit(s) available</div>
                {availableUnits.length === 0 && (
                  <div className="text-amber-700 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> No compatible units in inventory. Consider broadcasting a network request.
                  </div>
                )}
              </div>

              <div>
                <Label>Action</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <button type="button" onClick={() => setAction('issue')} className={`p-3 rounded-md border text-xs font-medium ${action === 'issue' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-border hover:bg-background'}`}>
                    <Check className="w-4 h-4 mx-auto mb-1" /> Issue Unit
                  </button>
                  <button type="button" onClick={() => setAction('approve')} className={`p-3 rounded-md border text-xs font-medium ${action === 'approve' ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-border hover:bg-background'}`}>
                    <Check className="w-4 h-4 mx-auto mb-1" /> Approve Only
                  </button>
                  <button type="button" onClick={() => setAction('reject')} className={`p-3 rounded-md border text-xs font-medium ${action === 'reject' ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-border hover:bg-background'}`}>
                    <X className="w-4 h-4 mx-auto mb-1" /> Reject
                  </button>
                </div>
              </div>

              {action === 'issue' && (
                <div>
                  <Label>Select Unit to Issue</Label>
                  <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                    <SelectTrigger><SelectValue placeholder={`Available ${request.bloodGroup} units`} /></SelectTrigger>
                    <SelectContent>
                      {availableUnits.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.unitCode} · {u.componentType} · exp {formatDate(u.expiryDate)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
              </div>
            </>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" className="mr-auto text-rose-600 hover:bg-rose-50" onClick={handleCancel}>
            Cancel Request
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleSubmit} disabled={loading || (action === 'issue' && !selectedUnitId)} className={
            action === 'reject' ? 'bg-rose-600 hover:bg-rose-700' :
            action === 'approve' ? 'bg-sky-600 hover:bg-sky-700' :
            'bg-emerald-600 hover:bg-emerald-700'
          }>
            Confirm {action === 'issue' ? 'Issue' : action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

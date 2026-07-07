'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from '@/lib/router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, EmptyState } from '@/components/shared'
import { BLOOD_GROUP_COLORS, statusColor, formatDateTime, timeAgo, formatDate } from '@/lib/ui'
import { toast } from 'sonner'
import {
  Network, Plus, ArrowRight, ArrowLeft, Send, Check, X, Clock, MapPin,
  Radio, MessageSquare, Building2, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const COMPONENT_TYPES = ['Whole Blood', 'Red Blood Cells', 'Platelets', 'Fresh Frozen Plasma']
const URGENCIES = ['Routine', 'Urgent', 'Emergency']

export function NetworkRequestsPage() {
  const { user } = useAuth()
  const { navigate } = useRouter()
  const [tab, setTab] = useState('outgoing')
  const [outgoing, setOutgoing] = useState<any[]>([])
  const [incoming, setIncoming] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [detailFor, setDetailFor] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/network-requests')
    const data = await res.json()
    if (data.requests?.outgoing) {
      setOutgoing(data.requests.outgoing)
      setIncoming(data.requests.incoming)
    } else {
      setOutgoing(data.requests ?? [])
      setIncoming([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Network Blood Requests"
        description="Cross-facility broadcast requests. When your facility lacks blood, broadcast to the entire network."
        actions={
          ['BBO', 'SYS_ADMIN', 'HOSP_ADMIN'].includes(user?.role ?? '') && (
            <Button onClick={() => setBroadcastOpen(true)} className="bg-violet-600 hover:bg-violet-700">
              <Radio className="w-4 h-4 mr-2" /> Broadcast Request
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="outgoing" className="relative">
            Outgoing
            {outgoing.filter(r => ['Open', 'Partially Responded'].includes(r.status)).length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 text-[10px]">{outgoing.filter(r => ['Open', 'Partially Responded'].includes(r.status)).length}</Badge>
            )}
          </TabsTrigger>
          {user?.role !== 'SYS_ADMIN' && (
            <TabsTrigger value="incoming" className="relative">
              Incoming
              {incoming.length > 0 && <Badge variant="secondary" className="ml-2 h-5 text-[10px] bg-violet-100 text-violet-700">{incoming.length}</Badge>}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="outgoing">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
              ) : outgoing.length === 0 ? (
                <EmptyState
                  title="No outgoing network requests"
                  description="When you need blood not available at your facility, broadcast a request to the network."
                  icon={Network}
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {outgoing.map(nr => (
                    <OutgoingRequestRow key={nr.id} request={nr} onOpen={() => setDetailFor(nr)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role !== 'SYS_ADMIN' && (
          <TabsContent value="incoming">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
                ) : incoming.length === 0 ? (
                  <EmptyState
                    title="No incoming requests"
                    description="Network requests from other facilities will appear here when they need blood you may have."
                    icon={Radio}
                  />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {incoming.map(nr => (
                      <IncomingRequestRow key={nr.id} request={nr} onRespond={() => setDetailFor(nr)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <BroadcastDialog
        open={broadcastOpen}
        onOpenChange={setBroadcastOpen}
        onSuccess={() => { load(); toast.success('Network request broadcast to all facilities'); setBroadcastOpen(false) }}
      />

      {detailFor && (
        <RequestDetailDialog
          request={detailFor}
          isOutgoing={outgoing.some(o => o.id === detailFor.id)}
          onClose={() => setDetailFor(null)}
          onChanged={() => { load(); setDetailFor(null) }}
        />
      )}
    </div>
  )
}

function OutgoingRequestRow({ request, onOpen }: { request: any; onOpen: () => void }) {
  const responseCount = request.responses?.length ?? request._count?.responses ?? 0
  return (
    <div className="px-4 py-3 hover:bg-background cursor-pointer" onClick={onOpen}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-11 h-11 rounded-md ${BLOOD_GROUP_COLORS[request.bloodGroup]} text-white font-bold flex items-center justify-center shrink-0`}>
            <div className="text-center leading-tight">
              <div className="text-sm">{request.bloodGroup}</div>
              <div className="text-[9px] opacity-90">×{request.quantity}</div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium font-mono text-foreground">{request.requestCode}</span>
              <Badge variant="outline" className={
                request.urgency === 'Emergency' ? 'border-rose-300 text-rose-700 bg-rose-50' :
                request.urgency === 'Urgent' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                'border-border text-foreground bg-background'
              }>{request.urgency}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {request.componentType ?? 'Any component'} · {timeAgo(request.createdAt)} · {responseCount} response(s)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="outline" className={statusColor(request.status)}>{request.status}</Badge>
          <Button size="sm" variant="ghost" className="h-7 text-xs">
            View <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function IncomingRequestRow({ request, onRespond }: { request: any; onRespond: () => void }) {
  const alreadyResponded = (request.responses?.length ?? 0) > 0
  return (
    <div className="px-4 py-3 hover:bg-background">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-11 h-11 rounded-md ${BLOOD_GROUP_COLORS[request.bloodGroup]} text-white font-bold flex items-center justify-center shrink-0`}>
            <div className="text-center leading-tight">
              <div className="text-sm">{request.bloodGroup}</div>
              <div className="text-[9px] opacity-90">×{request.quantity}</div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">{request.facility?.name ?? 'Unknown facility'}</span>
              <Badge variant="outline" className={
                request.urgency === 'Emergency' ? 'border-rose-300 text-rose-700 bg-rose-50' :
                request.urgency === 'Urgent' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                'border-border text-foreground bg-background'
              }>{request.urgency}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {request.componentType ?? 'Any component'} · {request.facility?.region} · {timeAgo(request.createdAt)}
            </div>
          </div>
        </div>
        <div className="shrink-0">
          {alreadyResponded ? (
            <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
              <Check className="w-3 h-3 mr-1" /> Responded
            </Badge>
          ) : (
            <Button size="sm" variant="outline" className="border-violet-200 text-violet-700 hover:bg-violet-50" onClick={onRespond}>
              Respond <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function BroadcastDialog({ open, onOpenChange, onSuccess }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    bloodGroup: 'O-',
    rhesus: '-',
    componentType: 'Whole Blood',
    quantity: '1',
    urgency: 'Emergency',
    patientRef: '',
    noteToFacilities: '',
    reservationExpiryHours: '24',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/network-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to broadcast')
      return
    }
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-violet-600" /> Broadcast Blood Request
          </DialogTitle>
          <DialogDescription>
            Send this request to ALL registered facilities on the network. Facilities with matching stock will be alerted.
          </DialogDescription>
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
              <Select value={form.componentType || 'any'} onValueChange={(v) => setForm({ ...form, componentType: v === 'any' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Component</SelectItem>
                  {COMPONENT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input type="number" min="1" max="20" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
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
              <Label>Patient Reference</Label>
              <Input value={form.patientRef} onChange={(e) => setForm({ ...form, patientRef: e.target.value })} placeholder="e.g., PAT-2026-001" />
            </div>
            <div>
              <Label>Reservation Window (hours)</Label>
              <Input type="number" min="1" max="72" value={form.reservationExpiryHours} onChange={(e) => setForm({ ...form, reservationExpiryHours: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Note to Responding Facilities</Label>
            <Textarea
              value={form.noteToFacilities}
              onChange={(e) => setForm({ ...form, noteToFacilities: e.target.value })}
              placeholder="Additional context for facilities that may respond..."
              rows={3}
            />
          </div>
          <div className="bg-violet-50 border border-violet-200 rounded-md p-3 text-xs text-violet-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              This request will be visible to all registered facilities. Facilities with matching available stock can submit responses, which you can review and select.
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-700">
              {loading ? 'Broadcasting...' : 'Broadcast to Network'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RequestDetailDialog({ request, isOutgoing, onClose, onChanged }: {
  request: any
  isOutgoing: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const { user } = useAuth()
  const [responses, setResponses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [availableUnits, setAvailableUnits] = useState<any[]>([])
  const [respondUnitId, setRespondUnitId] = useState('')
  const [respondNote, setRespondNote] = useState('')
  const [responding, setResponding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/network-requests/${request.id}/responses`)
    const data = await res.json()
    setResponses(data.responses ?? [])
    setLoading(false)
  }, [request.id])

  const loadAvailableUnits = useCallback(async () => {
    const res = await fetch(`/api/blood-units?bloodGroup=${encodeURIComponent(request.bloodGroup)}&status=Available`)
    const data = await res.json()
    setAvailableUnits(data.units ?? [])
  }, [request.bloodGroup])

  useEffect(() => { load(); if (!isOutgoing) loadAvailableUnits() }, [load, loadAvailableUnits, isOutgoing])

  async function handleRespond() {
    if (!respondUnitId) { toast.error('Please select a unit to offer'); return }
    setResponding(true)
    const res = await fetch(`/api/network-requests/${request.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId: respondUnitId, note: respondNote }),
    })
    setResponding(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to respond')
      return
    }
    toast.success('Response submitted successfully')
    onChanged()
  }

  async function handleSelectResponse(responseId: string) {
    const res = await fetch(`/api/network-requests/${request.id}/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseId }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to select response')
      return
    }
    toast.success('Response selected. Unit has been reserved.')
    onChanged()
  }

  async function handleCancel() {
    if (!confirm('Cancel this network request? Reserved units will be released.')) return
    const res = await fetch(`/api/network-requests/${request.id}/cancel`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to cancel')
      return
    }
    toast.success('Request cancelled')
    onChanged()
  }

  async function handleConfirmReservation() {
    const res = await fetch(`/api/network-requests/${request.id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm' }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to confirm')
      return
    }
    toast.success('Reservation confirmed. Unit marked as Issued.')
    onChanged()
  }

  async function handleCancelReservation() {
    if (!confirm('Cancel the reservation? The reserved unit will return to available status.')) return
    const res = await fetch(`/api/network-requests/${request.id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel_reservation' }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed')
      return
    }
    toast.success('Reservation cancelled')
    onChanged()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="w-5 h-5 text-violet-600" />
            {request.requestCode}
          </DialogTitle>
          <DialogDescription>
            {isOutgoing ? 'Your outgoing broadcast request' : `Incoming request from ${request.facility?.name ?? 'another facility'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="rounded-md border border-border p-2.5">
            <div className="text-[10px] uppercase text-muted-foreground">Blood Group</div>
            <div className={`text-base font-bold ${BLOOD_GROUP_COLORS[request.bloodGroup].replace('bg-', 'text-').replace('-500', '-600').replace('-600', '-600')}`}>{request.bloodGroup}{request.rhesus}</div>
          </div>
          <div className="rounded-md border border-border p-2.5">
            <div className="text-[10px] uppercase text-muted-foreground">Quantity</div>
            <div className="text-base font-bold">{request.quantity} unit(s)</div>
          </div>
          <div className="rounded-md border border-border p-2.5">
            <div className="text-[10px] uppercase text-muted-foreground">Urgency</div>
            <div className={`text-base font-bold ${request.urgency === 'Emergency' ? 'text-rose-600' : request.urgency === 'Urgent' ? 'text-amber-600' : 'text-foreground'}`}>{request.urgency}</div>
          </div>
          <div className="rounded-md border border-border p-2.5">
            <div className="text-[10px] uppercase text-muted-foreground">Status</div>
            <Badge variant="outline" className={statusColor(request.status)}>{request.status}</Badge>
          </div>
        </div>

        {request.componentType && (
          <div className="text-xs text-muted-foreground mb-2"><span className="font-medium">Component:</span> {request.componentType}</div>
        )}
        {request.patientRef && (
          <div className="text-xs text-muted-foreground mb-2"><span className="font-medium">Patient Ref:</span> {request.patientRef}</div>
        )}
        {request.noteToFacilities && (
          <div className="bg-background border border-border rounded-md p-3 mb-4">
            <div className="text-[10px] uppercase text-muted-foreground mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Note</div>
            <div className="text-xs text-foreground">{request.noteToFacilities}</div>
          </div>
        )}

        {/* Outgoing: show responses + actions */}
        {isOutgoing && (
          <>
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Responses ({responses.length})</h3>
                {['Open', 'Partially Responded'].includes(request.status) && (
                  <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={handleCancel}>
                    <X className="w-3.5 h-3.5 mr-1" /> Cancel Request
                  </Button>
                )}
              </div>
              {loading ? (
                <div className="text-xs text-muted-foreground text-center py-6">Loading responses...</div>
              ) : responses.length === 0 ? (
                <EmptyState title="No responses yet" description="Facilities with matching stock will respond here in real time." icon={Clock} />
              ) : (
                <div className="space-y-2">
                  {responses.map(r => (
                    <div key={r.id} className={`rounded-md border p-3 ${r.status === 'Selected' ? 'border-violet-300 bg-violet-50' : 'border-border'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium truncate">{r.respondingFacility?.name}</span>
                            <Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {r.respondingFacility?.region} · Unit {r.offeredUnit?.unitCode ?? 'N/A'} · {timeAgo(r.createdAt)}
                          </div>
                          {r.responderNote && (
                            <div className="text-xs text-muted-foreground mt-1 italic">"{r.responderNote}"</div>
                          )}
                        </div>
                        {request.status === 'Partially Responded' && r.status === 'Pending' && (
                          <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => handleSelectResponse(r.id)}>
                            <Check className="w-3.5 h-3.5 mr-1" /> Select & Reserve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {request.status === 'Reserved' && (
              <div className="mt-4 bg-violet-50 border border-violet-200 rounded-md p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-violet-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-violet-900">Unit Reserved</div>
                    <div className="text-xs text-violet-700 mt-1">A unit has been reserved at the responding facility. Confirm when patient arrives or cancel reservation.</div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirmReservation}>
                        <Check className="w-3.5 h-3.5 mr-1" /> Confirm Receipt
                      </Button>
                      <Button size="sm" variant="outline" className="border-violet-300 text-violet-700" onClick={handleCancelReservation}>
                        Cancel Reservation
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Incoming: respond form */}
        {!isOutgoing && request.status !== 'Cancelled' && request.status !== 'Fulfilled' && request.status !== 'Expired' && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-3">Submit a Response</h3>
            {request.responses?.length > 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-center gap-2 text-sm text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                Your facility has already responded to this request.
              </div>
            ) : availableUnits.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                Your facility has no available {request.bloodGroup} units to offer.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Select Unit to Offer</Label>
                  <Select value={respondUnitId} onValueChange={setRespondUnitId}>
                    <SelectTrigger><SelectValue placeholder={`Available ${request.bloodGroup} units (${availableUnits.length})`} /></SelectTrigger>
                    <SelectContent>
                      {availableUnits.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.unitCode} · {u.componentType} · exp {formatDate(u.expiryDate)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Note to Requesting Facility</Label>
                  <Input value={respondNote} onChange={(e) => setRespondNote(e.target.value)} placeholder="Optional message..." />
                </div>
                <Button onClick={handleRespond} disabled={responding} className="bg-violet-600 hover:bg-violet-700">
                  {responding ? 'Submitting...' : 'Submit Response'}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

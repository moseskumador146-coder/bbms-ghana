'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, EmptyState } from '@/components/shared'
import { BLOOD_GROUP_COLORS, statusColor, formatDate, daysUntil } from '@/lib/ui'
import { toast } from 'sonner'
import { Plus, Search, MoreHorizontal, Droplet, Boxes, AlertTriangle, Filter, X, ArrowUpDown, Trash2, MapPin } from 'lucide-react'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const COMPONENT_TYPES = ['Whole Blood', 'Red Blood Cells', 'Platelets', 'Fresh Frozen Plasma']
const STATUSES = ['Available', 'Reserved', 'Issued', 'Expired', 'Discarded']

export function BloodUnitsPage() {
  const { user } = useAuth()
  const [units, setUnits] = useState<any[]>([])
  const [storageUnits, setStorageUnits] = useState<any[]>([])
  const [donors, setDonors] = useState<any[]>([])
  const [facilities, setFacilities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ bloodGroup: 'all', componentType: 'all', status: 'all', search: '', facilityId: 'all' })
  const [addOpen, setAddOpen] = useState(false)
  const [assignStorageFor, setAssignStorageFor] = useState<any | null>(null)
  const [discardFor, setDiscardFor] = useState<any | null>(null)
  const isAdmin = user?.role === 'SYS_ADMIN'
  const canCreate = ['BBO', 'LAB_TECH', 'SYS_ADMIN'].includes(user?.role ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.bloodGroup !== 'all') params.set('bloodGroup', filters.bloodGroup)
    if (filters.componentType !== 'all') params.set('componentType', filters.componentType)
    if (filters.status !== 'all') params.set('status', filters.status)
    if (isAdmin && filters.facilityId !== 'all') params.set('facilityId', filters.facilityId)
    const res = await fetch(`/api/blood-units?${params.toString()}`)
    const data = await res.json()
    setUnits(data.units ?? [])
    setLoading(false)
  }, [filters, isAdmin])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (user?.facilityId) {
      fetch('/api/storage-units').then(r => r.json()).then(d => setStorageUnits(d.storageUnits ?? []))
      fetch('/api/donors').then(r => r.json()).then(d => setDonors(d.donors ?? []))
    }
    if (isAdmin) {
      fetch('/api/facilities').then(r => r.json()).then(d => setFacilities(d.facilities ?? []))
    }
  }, [user, isAdmin])

  const filtered = units.filter(u => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!u.unitCode.toLowerCase().includes(q) && !(u.donor?.fullName?.toLowerCase().includes(q))) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'Network Blood Inventory' : 'Blood Inventory'}
        description={
          isAdmin
            ? 'View all blood units across all registered facilities'
            : 'Manage blood units registered at your facility'
        }
        actions={
          canCreate && (
            <Button onClick={() => setAddOpen(true)} className="bg-rose-600 hover:bg-rose-700">
              <Plus className="w-4 h-4 mr-2" /> Register Blood Unit
            </Button>
          )
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-1">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input
                  placeholder="Unit code or donor..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8 h-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Blood Group</Label>
              <Select value={filters.bloodGroup} onValueChange={(v) => setFilters({ ...filters, bloodGroup: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {BLOOD_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Component</Label>
              <Select value={filters.componentType} onValueChange={(v) => setFilters({ ...filters, componentType: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Components</SelectItem>
                  {COMPONENT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div>
                <Label className="text-xs text-muted-foreground">Facility</Label>
                <Select value={filters.facilityId} onValueChange={(v) => setFilters({ ...filters, facilityId: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Facilities</SelectItem>
                    {facilities.filter(f => f.name !== 'BBMS Platform Office').map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {(filters.bloodGroup !== 'all' || filters.componentType !== 'all' || filters.status !== 'all' || filters.search || (isAdmin && filters.facilityId !== 'all')) && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              {filters.bloodGroup !== 'all' && <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilters({ ...filters, bloodGroup: 'all' })}>{filters.bloodGroup} <X className="w-3 h-3 ml-1" /></Badge>}
              {filters.componentType !== 'all' && <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilters({ ...filters, componentType: 'all' })}>{filters.componentType} <X className="w-3 h-3 ml-1" /></Badge>}
              {filters.status !== 'all' && <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilters({ ...filters, status: 'all' })}>{filters.status} <X className="w-3 h-3 ml-1" /></Badge>}
              {filters.search && <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilters({ ...filters, search: '' })}>"{filters.search}" <X className="w-3 h-3 ml-1" /></Badge>}
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setFilters({ bloodGroup: 'all', componentType: 'all', status: 'all', search: '', facilityId: 'all' })}>
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading blood units...</div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No blood units found" description="Try adjusting filters or register a new unit." icon={Boxes} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit Code</TableHead>
                    <TableHead>Blood Group</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead className="hidden md:table-cell">Collected</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="hidden lg:table-cell">Storage</TableHead>
                    {isAdmin && <TableHead className="hidden xl:table-cell">Facility</TableHead>}
                    <TableHead>Status</TableHead>
                    {canCreate && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => {
                    const days = daysUntil(u.expiryDate)
                    const isNearExpiry = days <= 5 && days >= 0 && u.status === 'Available'
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-xs font-medium">{u.unitCode}</TableCell>
                        <TableCell>
                          <div className={`inline-flex w-9 h-9 rounded ${BLOOD_GROUP_COLORS[u.bloodGroup]} text-white text-[11px] font-bold items-center justify-center`}>
                            {u.bloodGroup}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{u.componentType}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(u.collectionDate)}</TableCell>
                        <TableCell>
                          <div className="text-xs">{formatDate(u.expiryDate)}</div>
                          {isNearExpiry && (
                            <Badge variant="outline" className="mt-0.5 border-amber-300 text-amber-700 bg-amber-50 text-[10px]">
                              {days}d left
                            </Badge>
                          )}
                          {u.status === 'Expired' && (
                            <Badge variant="outline" className="mt-0.5 border-rose-300 text-rose-700 bg-rose-50 text-[10px]">
                              Expired
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {u.storageUnit?.name ?? <span className="text-amber-600">Unassigned</span>}
                        </TableCell>
                        {isAdmin && <TableCell className="hidden xl:table-cell text-xs">{u.facility?.name}</TableCell>}
                        <TableCell>
                          <Badge variant="outline" className={statusColor(u.status)}>{u.status}</Badge>
                        </TableCell>
                        {canCreate && (
                          <TableCell className="text-right">
                            {u.status === 'Available' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setAssignStorageFor(u)}>
                                    <MapPin className="w-4 h-4 mr-2" /> Assign Storage
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDiscardFor(u)} className="text-rose-600 focus:text-rose-700">
                                    <Trash2 className="w-4 h-4 mr-2" /> Discard Unit
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
              Showing {filtered.length} of {units.length} units
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Blood Unit Dialog */}
      <AddBloodUnitDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        donors={donors}
        storageUnits={storageUnits}
        onSuccess={() => { load(); toast.success('Blood unit registered successfully') }}
      />

      {/* Assign Storage Dialog */}
      {assignStorageFor && (
        <AssignStorageDialog
          unit={assignStorageFor}
          storageUnits={storageUnits}
          onClose={() => setAssignStorageFor(null)}
          onSuccess={() => { load(); toast.success('Storage assigned'); setAssignStorageFor(null) }}
        />
      )}

      {/* Discard Dialog */}
      {discardFor && (
        <DiscardDialog
          unit={discardFor}
          onClose={() => setDiscardFor(null)}
          onSuccess={() => { load(); toast.success('Unit discarded'); setDiscardFor(null) }}
        />
      )}
    </div>
  )
}

function AddBloodUnitDialog({ open, onOpenChange, donors, storageUnits, onSuccess }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  donors: any[]
  storageUnits: any[]
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    bloodGroup: 'O+',
    rhesus: '+',
    componentType: 'Whole Blood',
    collectionDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    donorId: '',
    storageUnitId: '',
    quantity: '1',
    notes: '',
  })
  const [loading, setLoading] = useState(false)

  // Auto-calc expiry date based on component type
  useEffect(() => {
    const collected = new Date(form.collectionDate)
    const exp = new Date(collected)
    switch (form.componentType) {
      case 'Whole Blood': exp.setDate(exp.getDate() + 35); break
      case 'Red Blood Cells': exp.setDate(exp.getDate() + 42); break
      case 'Platelets': exp.setDate(exp.getDate() + 5); break
      case 'Fresh Frozen Plasma': exp.setFullYear(exp.getFullYear() + 1); break
    }
    setForm(f => ({ ...f, expiryDate: exp.toISOString().split('T')[0] }))
  }, [form.componentType, form.collectionDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/blood-units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to register unit')
      return
    }
    onSuccess()
    onOpenChange(false)
    setForm({ ...form, notes: '', quantity: '1' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register New Blood Unit(s)</DialogTitle>
          <DialogDescription>
            Record newly collected blood units. Unit codes are auto-generated. Component type determines default expiry.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bg">Blood Group *</Label>
              <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v, rhesus: v.endsWith('+') ? '+' : '-' })}>
                <SelectTrigger id="bg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ct">Component Type *</Label>
              <Select value={form.componentType} onValueChange={(v) => setForm({ ...form, componentType: v })}>
                <SelectTrigger id="ct"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPONENT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cd">Collection Date *</Label>
              <Input id="cd" type="date" value={form.collectionDate} onChange={(e) => setForm({ ...form, collectionDate: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="ed">Expiry Date *</Label>
              <Input id="ed" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="qty">Quantity (batch)</Label>
              <Input id="qty" type="number" min="1" max="20" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              <p className="text-[10px] text-muted-foreground mt-1">Register multiple units at once</p>
            </div>
            <div>
              <Label htmlFor="donor">Donor</Label>
              <Select value={form.donorId} onValueChange={(v) => setForm({ ...form, donorId: v === 'none' ? '' : v })}>
                <SelectTrigger id="donor"><SelectValue placeholder="Select donor..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No donor linked —</SelectItem>
                  {donors.map(d => <SelectItem key={d.id} value={d.id}>{d.fullName} ({d.bloodGroup}{d.rhesus})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="storage">Storage Unit</Label>
              <Select value={form.storageUnitId} onValueChange={(v) => setForm({ ...form, storageUnitId: v === 'none' ? '' : v })}>
                <SelectTrigger id="storage"><SelectValue placeholder="Select storage..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unassigned —</SelectItem>
                  {storageUnits.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.tempCategory}, {s.temperatureC}°C)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional info..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700">
              {loading ? 'Registering...' : `Register ${form.quantity || 1} Unit(s)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AssignStorageDialog({ unit, storageUnits, onClose, onSuccess }: {
  unit: any
  storageUnits: any[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [storageUnitId, setStorageUnitId] = useState(unit.storageUnitId ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!storageUnitId) { toast.error('Please select a storage unit'); return }
    setLoading(true)
    const res = await fetch(`/api/blood-units/${unit.id}/assign-storage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storageUnitId }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Failed to assign storage'); return }
    onSuccess()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Storage Unit</DialogTitle>
          <DialogDescription>Unit {unit.unitCode} ({unit.bloodGroup}{unit.rhesus}, {unit.componentType})</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Storage Unit</Label>
          <Select value={storageUnitId} onValueChange={setStorageUnitId}>
            <SelectTrigger><SelectValue placeholder="Select storage..." /></SelectTrigger>
            <SelectContent>
              {storageUnits.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.tempCategory}, {s.temperatureC}°C)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-rose-600 hover:bg-rose-700">
            {loading ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DiscardDialog({ unit, onClose, onSuccess }: {
  unit: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    const res = await fetch(`/api/blood-units/${unit.id}/discard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Failed to discard unit'); return }
    onSuccess()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Discard Blood Unit</DialogTitle>
          <DialogDescription>
            This action is irreversible. Unit {unit.unitCode} will be marked as Discarded.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Reason for discarding</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., contamination, broken seal..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Discarding...' : 'Discard Unit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

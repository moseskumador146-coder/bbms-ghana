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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, EmptyState, StatCard } from '@/components/shared'
import { statusColor, formatDate } from '@/lib/ui'
import { toast } from 'sonner'
import { Building2, Plus, Check, X, MapPin, Phone, Mail, Users, Boxes, MoreHorizontal, Pencil, Trash2, Power } from 'lucide-react'

const FACILITY_TYPES = ['Clinic', 'District Hospital', 'Regional Hospital', 'Teaching Hospital']
const GHANA_REGIONS = ['Greater Accra', 'Ashanti', 'Northern', 'Central', 'Western', 'Volta', 'Eastern', 'Upper East', 'Upper West', 'Bono']

export function FacilitiesPage() {
  const { user } = useAuth()
  const [facilities, setFacilities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editFacility, setEditFacility] = useState<any | null>(null)
  const [deleteFacility, setDeleteFacility] = useState<any | null>(null)
  const isAdmin = user?.role === 'SYS_ADMIN'

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/facilities')
    const data = await res.json()
    setFacilities((data.facilities ?? []).filter((f: any) => f.name !== 'BBMS Platform Office'))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const active = facilities.filter(f => f.status === 'Active').length
  const pending = facilities.filter(f => f.status === 'Pending').length
  const suspended = facilities.filter(f => f.status === 'Suspended').length

  async function handleApprove(id: string) {
    const res = await fetch(`/api/facilities/${id}/approve`, { method: 'POST' })
    if (!res.ok) { toast.error('Failed to approve'); return }
    toast.success('Facility approved')
    load()
  }

  async function handleToggleStatus(f: any) {
    const newStatus = f.status === 'Active' ? 'Suspended' : 'Active'
    const res = await fetch(`/api/facilities/${f.id}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) { toast.error('Failed to update status'); return }
    toast.success(`Facility ${newStatus === 'Active' ? 'reactivated' : 'suspended'}`)
    load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'Facility Management' : 'Registered Facilities'}
        description={
          isAdmin
            ? 'Approve, edit, suspend, or delete healthcare facilities on the BBMS network'
            : 'Healthcare facilities registered on the BBMS network'
        }
        actions={isAdmin && <Button onClick={() => setAddOpen(true)} className="bg-rose-600 hover:bg-rose-700"><Plus className="w-4 h-4 mr-2" /> Register Facility</Button>}
      />

      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard title="Active" value={active} icon={Check} accent="emerald" />
          <StatCard title="Pending" value={pending} icon={Building2} accent="amber" />
          <StatCard title="Suspended" value={suspended} icon={X} accent="rose" />
          <StatCard title="Total" value={facilities.length} icon={Building2} accent="violet" />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : facilities.length === 0 ? (
            <EmptyState title="No facilities" icon={Building2} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facility</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden lg:table-cell">Location</TableHead>
                    <TableHead className="hidden xl:table-cell">Contact</TableHead>
                    {isAdmin && <TableHead className="hidden md:table-cell">Users</TableHead>}
                    {isAdmin && <TableHead className="hidden md:table-cell">Units</TableHead>}
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facilities.map(f => (
                    <TableRow key={f.id} className={f.status === 'Suspended' ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">{f.name}</div>
                        <div className="text-xs text-muted-foreground">Since {formatDate(f.createdAt)}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{f.type}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground" />{f.location}, {f.region}</div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs">
                        <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" />{f.contactPhone}</div>
                        <div className="flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{f.contactEmail}</div>
                      </TableCell>
                      {isAdmin && <TableCell className="hidden md:table-cell text-sm">{f._count?.users ?? 0}</TableCell>}
                      {isAdmin && <TableCell className="hidden md:table-cell text-sm">{f._count?.bloodUnits ?? 0}</TableCell>}
                      <TableCell><Badge variant="outline" className={statusColor(f.status)}>{f.status}</Badge></TableCell>
                      {isAdmin ? (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => setEditFacility(f)}>
                                <Pencil className="w-4 h-4 mr-2" /> Edit Details
                              </DropdownMenuItem>
                              {f.status === 'Pending' && (
                                <DropdownMenuItem onClick={() => handleApprove(f.id)}>
                                  <Check className="w-4 h-4 mr-2" /> Approve Facility
                                </DropdownMenuItem>
                              )}
                              {f.status !== 'Pending' && (
                                <DropdownMenuItem onClick={() => handleToggleStatus(f)}>
                                  <Power className="w-4 h-4 mr-2" />
                                  {f.status === 'Active' ? 'Suspend Facility' : 'Reactivate Facility'}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteFacility(f)}
                                className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-950/50"
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Facility
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      ) : <TableCell />}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddFacilityDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={() => { load(); toast.success('Facility registered'); setAddOpen(false) }} />

      {editFacility && (
        <EditFacilityDialog
          facility={editFacility}
          isAdmin={isAdmin}
          onClose={() => setEditFacility(null)}
          onSuccess={() => { load(); setEditFacility(null) }}
        />
      )}

      {deleteFacility && (
        <DeleteFacilityDialog
          facility={deleteFacility}
          onClose={() => setDeleteFacility(null)}
          onSuccess={() => { load(); setDeleteFacility(null) }}
        />
      )}
    </div>
  )
}

function AddFacilityDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '', type: 'District Hospital', location: '', region: 'Greater Accra',
    contactPhone: '', contactEmail: '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/facilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to register facility')
      return
    }
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-rose-600" /> Register New Facility</DialogTitle>
          <DialogDescription>Add a new hospital or clinic to the BBMS network.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Facility Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Facility Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FACILITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Region *</Label>
              <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GHANA_REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Location (City/Town) *</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
            </div>
            <div>
              <Label>Contact Phone *</Label>
              <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="+233..." required />
            </div>
            <div>
              <Label>Contact Email *</Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700">{loading ? 'Registering...' : 'Register Facility'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditFacilityDialog({ facility, isAdmin, onClose, onSuccess }: {
  facility: any
  isAdmin: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    name: facility.name ?? '',
    type: facility.type ?? 'District Hospital',
    location: facility.location ?? '',
    region: facility.region ?? 'Greater Accra',
    contactPhone: facility.contactPhone ?? '',
    contactEmail: facility.contactEmail ?? '',
    status: facility.status ?? 'Active',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload: any = {}
    if (form.name && form.name !== facility.name) payload.name = form.name
    if (form.type && form.type !== facility.type) payload.type = form.type
    if (form.location && form.location !== facility.location) payload.location = form.location
    if (form.region && form.region !== facility.region) payload.region = form.region
    if (form.contactPhone && form.contactPhone !== facility.contactPhone) payload.contactPhone = form.contactPhone
    if (form.contactEmail && form.contactEmail.toLowerCase().trim() !== facility.contactEmail) payload.contactEmail = form.contactEmail
    if (isAdmin && form.status && form.status !== facility.status) payload.status = form.status

    if (Object.keys(payload).length === 0) {
      toast.info('No changes to save')
      setLoading(false)
      onClose()
      return
    }

    const res = await fetch(`/api/facilities/${facility.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to update facility')
      return
    }
    toast.success('Facility updated successfully')
    onSuccess()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-rose-600" /> Edit Facility</DialogTitle>
          <DialogDescription>Update details for {facility.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Facility Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Facility Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FACILITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Region *</Label>
              <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GHANA_REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Location (City/Town) *</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
            </div>
            <div>
              <Label>Contact Phone *</Label>
              <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} required />
            </div>
            <div>
              <Label>Contact Email *</Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} required />
            </div>
            {isAdmin && (
              <div className="col-span-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700">{loading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteFacilityDialog({ facility, onClose, onSuccess }: {
  facility: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/facilities/${facility.id}`, { method: 'DELETE' })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to delete facility')
      onClose()
      return
    }
    toast.success('Facility deleted')
    onSuccess()
  }

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600" /> Delete Facility?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to permanently delete <strong>{facility.name}</strong> ({facility.type}, {facility.region}).
            This action cannot be undone.
            <br /><br />
            If the facility has users, blood units, donors, storage units, requests, or audit log entries,
            deletion will be blocked — suspend the facility instead to preserve data integrity.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleDelete() }}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
          >
            {loading ? 'Deleting...' : 'Yes, Delete Permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, EmptyState } from '@/components/shared'
import { BLOOD_GROUP_COLORS, formatDate } from '@/lib/ui'
import { toast } from 'sonner'
import { Heart, Plus, Phone, Mail, Calendar, Shield, Search, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export function DonorsPage() {
  const { user } = useAuth()
  const [donors, setDonors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editDonor, setEditDonor] = useState<any | null>(null)
  const [deleteDonor, setDeleteDonor] = useState<any | null>(null)
  const [search, setSearch] = useState('')
  const canCreate = ['BBO', 'LAB_TECH', 'HOSP_ADMIN', 'SYS_ADMIN'].includes(user?.role ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/donors')
    const data = await res.json()
    setDonors(data.donors ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = donors.filter(d => {
    if (!search) return true
    const q = search.toLowerCase()
    return d.fullName.toLowerCase().includes(q) || d.phone.includes(q) || (d.email?.toLowerCase().includes(q) ?? false)
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donor Registry"
        description="Manage registered blood donors at your facility"
        actions={canCreate && <Button onClick={() => setAddOpen(true)} className="bg-rose-600 hover:bg-rose-700"><Plus className="w-4 h-4 mr-2" /> Register Donor</Button>}
      />

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, phone, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No donors found" description="Register donors to track donation history and contact information." icon={Heart} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Blood Group</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Last Donation</TableHead>
                    <TableHead className="hidden lg:table-cell">Donations</TableHead>
                    <TableHead>Consent</TableHead>
                    {canCreate && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">{d.fullName}</div>
                        {d.dateOfBirth && <div className="text-xs text-muted-foreground">DOB: {formatDate(d.dateOfBirth)}</div>}
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex w-9 h-9 rounded ${BLOOD_GROUP_COLORS[d.bloodGroup]} text-white text-xs font-bold items-center justify-center`}>
                          {d.bloodGroup}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div className="flex items-center gap-1 text-foreground"><Phone className="w-3 h-3" />{d.phone}</div>
                          {d.email && <div className="flex items-center gap-1 text-muted-foreground mt-0.5"><Mail className="w-3 h-3" />{d.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {d.lastDonationAt ? formatDate(d.lastDonationAt) : '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{d._count?.bloodUnits ?? 0}</TableCell>
                      <TableCell>
                        {d.consentGiven ? (
                          <Badge variant="outline" className="border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50">
                            <Shield className="w-3 h-3 mr-1" /> Given
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50">Missing</Badge>
                        )}
                      </TableCell>
                      {canCreate && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditDonor(d)}>
                                <Pencil className="w-4 h-4 mr-2" /> Edit Donor
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteDonor(d)} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-950/50">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Donor
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddDonorDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={() => { load(); toast.success('Donor registered'); setAddOpen(false) }} />

      {editDonor && (
        <DonorFormDialog
          donor={editDonor}
          onClose={() => setEditDonor(null)}
          onSuccess={() => { load(); toast.success('Donor updated'); setEditDonor(null) }}
        />
      )}

      {deleteDonor && (
        <DeleteDonorDialog
          donor={deleteDonor}
          onClose={() => setDeleteDonor(null)}
          onSuccess={() => { load(); setDeleteDonor(null) }}
        />
      )}
    </div>
  )
}

function DonorFormFields({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <>
      <div className="col-span-2">
        <Label>Full Name *</Label>
        <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
      </div>
      <div>
        <Label>Phone *</Label>
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+233..." required />
      </div>
      <div>
        <Label>Email</Label>
        <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <Label>Date of Birth</Label>
        <Input type="date" value={form.dateOfBirth ? new Date(form.dateOfBirth).toISOString().split('T')[0] : ''} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
      </div>
      <div>
        <Label>Blood Group *</Label>
        <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v, rhesus: v.endsWith('+') ? '+' : '-' })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {BLOOD_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

function ConsentCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-muted border border-border rounded-md">
      <Checkbox id="consent" checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <Label htmlFor="consent" className="text-xs text-foreground cursor-pointer leading-relaxed">
        I confirm that the donor has given explicit consent for their personal data to be recorded and processed for blood bank operations, in accordance with Ghana&apos;s Data Protection Act, 2012 (Act 843).
      </Label>
    </div>
  )
}

function AddDonorDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', dateOfBirth: '',
    bloodGroup: 'O+', rhesus: '+', consentGiven: false,
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.consentGiven) { toast.error('Donor consent is required under Ghana Data Protection Act 2012'); return }
    setLoading(true)
    const res = await fetch('/api/donors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to register donor')
      return
    }
    onSuccess()
    setForm({ fullName: '', phone: '', email: '', dateOfBirth: '', bloodGroup: 'O+', rhesus: '+', consentGiven: false })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Heart className="w-5 h-5 text-rose-600" /> Register Donor</DialogTitle>
          <DialogDescription>Record new donor information. Consent is required under Ghana Data Protection Act 2012.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <DonorFormFields form={form} setForm={setForm} />
          </div>
          <ConsentCheckbox checked={form.consentGiven} onChange={(v) => setForm({ ...form, consentGiven: v })} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !form.consentGiven} className="bg-rose-600 hover:bg-rose-700">{loading ? 'Registering...' : 'Register Donor'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DonorFormDialog({ donor, onClose, onSuccess }: { donor: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    fullName: donor.fullName ?? '',
    phone: donor.phone ?? '',
    email: donor.email ?? '',
    dateOfBirth: donor.dateOfBirth ?? '',
    bloodGroup: donor.bloodGroup ?? 'O+',
    rhesus: donor.rhesus ?? '+',
    consentGiven: donor.consentGiven ?? false,
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload: any = {}
    if (form.fullName !== donor.fullName) payload.fullName = form.fullName
    if (form.phone !== donor.phone) payload.phone = form.phone
    if ((form.email || '') !== (donor.email || '')) payload.email = form.email || null
    const formDOB = form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : null
    const donorDOB = donor.dateOfBirth ? new Date(donor.dateOfBirth).toISOString() : null
    if (formDOB !== donorDOB) payload.dateOfBirth = form.dateOfBirth || null
    if (form.bloodGroup !== donor.bloodGroup) payload.bloodGroup = form.bloodGroup
    if (form.rhesus !== donor.rhesus) payload.rhesus = form.rhesus
    if (form.consentGiven !== donor.consentGiven) payload.consentGiven = form.consentGiven

    if (Object.keys(payload).length === 0) {
      toast.info('No changes to save')
      setLoading(false)
      onClose()
      return
    }

    const res = await fetch(`/api/donors/${donor.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to update donor')
      return
    }
    onSuccess()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-rose-600" /> Edit Donor</DialogTitle>
          <DialogDescription>Update information for {donor.fullName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <DonorFormFields form={form} setForm={setForm} />
          </div>
          <ConsentCheckbox checked={form.consentGiven} onChange={(v) => setForm({ ...form, consentGiven: v })} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700">{loading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDonorDialog({ donor, onClose, onSuccess }: { donor: any; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/donors/${donor.id}`, { method: 'DELETE' })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to delete donor')
      onClose()
      return
    }
    toast.success('Donor deleted')
    onSuccess()
  }

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600" /> Delete Donor?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to permanently delete <strong>{donor.fullName}</strong> ({donor.bloodGroup}).
            If the donor has linked blood units, deletion will be blocked.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleDelete() }}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
          >
            {loading ? 'Deleting...' : 'Yes, Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

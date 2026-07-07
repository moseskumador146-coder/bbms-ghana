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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, EmptyState } from '@/components/shared'
import { BLOOD_GROUP_COLORS, formatDate } from '@/lib/ui'
import { toast } from 'sonner'
import { Heart, Plus, Phone, Mail, Calendar, Shield, Search } from 'lucide-react'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export function DonorsPage() {
  const { user } = useAuth()
  const [donors, setDonors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
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
        description="Registered blood donors at your facility"
        actions={canCreate && <Button onClick={() => setAddOpen(true)} className="bg-rose-600 hover:bg-rose-700"><Plus className="w-4 h-4 mr-2" /> Register Donor</Button>}
      />

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by name, phone, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="text-sm font-medium text-slate-900">{d.fullName}</div>
                        {d.dateOfBirth && <div className="text-xs text-slate-500">DOB: {formatDate(d.dateOfBirth)}</div>}
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex w-9 h-9 rounded ${BLOOD_GROUP_COLORS[d.bloodGroup]} text-white text-xs font-bold items-center justify-center`}>
                          {d.bloodGroup}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div className="flex items-center gap-1 text-slate-700"><Phone className="w-3 h-3" />{d.phone}</div>
                          {d.email && <div className="flex items-center gap-1 text-slate-500 mt-0.5"><Mail className="w-3 h-3" />{d.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-600">
                        {d.lastDonationAt ? formatDate(d.lastDonationAt) : '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{d._count?.bloodUnits ?? 0}</TableCell>
                      <TableCell>
                        {d.consentGiven ? (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">
                            <Shield className="w-3 h-3 mr-1" /> Given
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50">Missing</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddDonorDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={() => { load(); toast.success('Donor registered'); setAddOpen(false) }} />
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
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
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
          </div>
          <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
            <Checkbox id="consent" checked={form.consentGiven} onCheckedChange={(v) => setForm({ ...form, consentGiven: v === true })} className="mt-0.5" />
            <Label htmlFor="consent" className="text-xs text-slate-700 cursor-pointer leading-relaxed">
              I confirm that the donor has given explicit consent for their personal data to be recorded and processed for blood bank operations, in accordance with Ghana&apos;s Data Protection Act, 2012 (Act 843).
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !form.consentGiven} className="bg-rose-600 hover:bg-rose-700">{loading ? 'Registering...' : 'Register Donor'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

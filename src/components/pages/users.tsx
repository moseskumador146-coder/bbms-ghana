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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, EmptyState, StatCard } from '@/components/shared'
import { ROLE_LABELS, ROLE_BADGES } from '@/lib/auth-constants'
import { statusColor, formatDate } from '@/lib/ui'
import { toast } from 'sonner'
import { Plus, Users, Shield, Building2, Check, X } from 'lucide-react'

const ROLES = [
  { value: 'BBO', label: 'Blood Bank Officer' },
  { value: 'LAB_TECH', label: 'Laboratory Technician' },
  { value: 'HOSP_ADMIN', label: 'Hospital Administrator' },
  { value: 'NURSE_DOCTOR', label: 'Nurse / Doctor' },
]

export function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const isAdmin = user?.role === 'SYS_ADMIN'

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/users')
    const data = await res.json()
    setUsers((data.users ?? []).filter((u: any) => u.role !== 'SYS_ADMIN'))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const activeCount = users.filter(u => u.status === 'Active').length
  const byRole = ROLES.map(r => ({ ...r, count: users.filter(u => u.role === r.value).length }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'User Accounts' : 'Staff Accounts'}
        description={
          isAdmin
            ? 'Manage all user accounts across the BBMS platform'
            : 'Manage staff accounts at your facility'
        }
        actions={<Button onClick={() => setAddOpen(true)} className="bg-rose-600 hover:bg-rose-700"><Plus className="w-4 h-4 mr-2" /> Add User</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Total Users" value={users.length} icon={Users} accent="rose" />
        <StatCard title="Active" value={activeCount} icon={Check} accent="emerald" />
        <StatCard title="Blood Bank Officers" value={users.filter(u => u.role === 'BBO').length} icon={Shield} accent="violet" />
        <StatCard title="Clinical Staff" value={users.filter(u => u.role === 'NURSE_DOCTOR').length} icon={Building2} accent="sky" />
      </div>

      {/* Role breakdown */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {byRole.map(r => (
              <div key={r.value} className="rounded-md border border-slate-200 p-3">
                <div className="text-xs text-slate-500">{r.label}</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{r.count}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
          ) : users.length === 0 ? (
            <EmptyState title="No users found" icon={Users} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    {isAdmin && <TableHead className="hidden md:table-cell">Facility</TableHead>}
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="text-sm font-medium">{u.fullName}</TableCell>
                      <TableCell className="text-xs text-slate-600">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ROLE_BADGES[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                      </TableCell>
                      {isAdmin && <TableCell className="hidden md:table-cell text-xs">{u.facility?.name ?? '—'}</TableCell>}
                      <TableCell className="hidden md:table-cell text-xs text-slate-500">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor(u.status)}>{u.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddUserDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={() => { load(); toast.success('User created'); setAddOpen(false) }} isAdmin={isAdmin} />
    </div>
  )
}

function AddUserDialog({ open, onOpenChange, onSuccess, isAdmin }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void; isAdmin: boolean }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'BBO', facilityId: '' })
  const [facilities, setFacilities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/facilities').then(r => r.json()).then(d => setFacilities((d.facilities ?? []).filter((f: any) => f.name !== 'BBMS Platform Office')))
    }
  }, [isAdmin])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to create user')
      return
    }
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-rose-600" /> Add New User</DialogTitle>
          <DialogDescription>Create a new staff account with role-based access.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <Label>Password *</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} placeholder="Minimum 6 characters" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div>
                <Label>Facility</Label>
                <Select value={form.facilityId} onValueChange={(v) => setForm({ ...form, facilityId: v })}>
                  <SelectTrigger><SelectValue placeholder="Auto (your facility)" /></SelectTrigger>
                  <SelectContent>
                    {facilities.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700">{loading ? 'Creating...' : 'Create User'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

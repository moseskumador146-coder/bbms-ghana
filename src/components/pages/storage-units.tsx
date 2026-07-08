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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, EmptyState, StatCard } from '@/components/shared'
import { toast } from 'sonner'
import { Plus, Snowflake, Refrigerator, Thermometer, Boxes, Settings, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

const TEMP_CATEGORIES = [
  { value: 'Refrigerated', label: 'Refrigerated (1-6°C)', icon: Refrigerator, color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50' },
  { value: 'Frozen', label: 'Frozen (-18°C and below)', icon: Snowflake, color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50' },
  { value: 'Room Temperature', label: 'Room Temperature (20-24°C)', icon: Thermometer, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50' },
]

function StorageFormFields({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  function setCategory(v: string) {
    const defaults: Record<string, string> = { Refrigerated: '4', Frozen: '-25', 'Room Temperature': '22' }
    setForm({ ...form, tempCategory: v, temperatureC: defaults[v] ?? form.temperatureC })
  }

  return (
    <>
      <div>
        <Label>Unit Name *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., KBTH-REF-02" required />
      </div>
      <div>
        <Label>Temperature Category *</Label>
        <Select value={form.tempCategory} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TEMP_CATEGORIES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Temperature (°C) *</Label>
        <Input type="number" step="0.1" value={form.temperatureC} onChange={(e) => setForm({ ...form, temperatureC: e.target.value })} required />
      </div>
      <div>
        <Label>Max Capacity (units) *</Label>
        <Input type="number" min="1" value={form.maxCapacity} onChange={(e) => setForm({ ...form, maxCapacity: e.target.value })} required />
      </div>
    </>
  )
}

export function StorageUnitsPage() {
  const { user } = useAuth()
  const [storageUnits, setStorageUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editStorage, setEditStorage] = useState<any | null>(null)
  const [deleteStorage, setDeleteStorage] = useState<any | null>(null)
  const canCreate = ['BBO', 'HOSP_ADMIN', 'SYS_ADMIN'].includes(user?.role ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/storage-units')
    const data = await res.json()
    setStorageUnits(data.storageUnits ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const refrigerated = storageUnits.filter(s => s.tempCategory === 'Refrigerated')
  const frozen = storageUnits.filter(s => s.tempCategory === 'Frozen')
  const roomTemp = storageUnits.filter(s => s.tempCategory === 'Room Temperature')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Storage Units"
        description="Physical refrigeration and freezer equipment at your facility"
        actions={canCreate && <Button onClick={() => setAddOpen(true)} className="bg-rose-600 hover:bg-rose-700"><Plus className="w-4 h-4 mr-2" /> Add Storage Unit</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <StatCard title="Refrigerated" value={refrigerated.length} icon={Refrigerator} accent="sky" subtitle="1-6°C for RBCs" />
        <StatCard title="Frozen" value={frozen.length} icon={Snowflake} accent="violet" subtitle="-18°C for FFP" />
        <StatCard title="Room Temperature" value={roomTemp.length} icon={Thermometer} accent="amber" subtitle="20-24°C" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : storageUnits.length === 0 ? (
            <EmptyState title="No storage units" description="Add refrigeration equipment to manage blood unit storage." icon={Settings} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Temperature</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Utilization</TableHead>
                    {canCreate && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storageUnits.map(s => {
                    const used = s._count?.bloodUnits ?? 0
                    const pct = s.maxCapacity ? Math.min(100, (used / s.maxCapacity) * 100) : 0
                    const Icon = TEMP_CATEGORIES.find(t => t.value === s.tempCategory)?.icon ?? Boxes
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-md ${TEMP_CATEGORIES.find(t => t.value === s.tempCategory)?.color ?? 'bg-muted'} flex items-center justify-center`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium">{s.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{s.tempCategory}</Badge></TableCell>
                        <TableCell className="text-sm font-mono">{s.temperatureC}°C</TableCell>
                        <TableCell className="text-sm">{s.maxCapacity} units</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[80px]">
                              <div className={`h-full ${pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{used}/{s.maxCapacity}</span>
                          </div>
                        </TableCell>
                        {canCreate && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditStorage(s)}>
                                  <Pencil className="w-4 h-4 mr-2" /> Edit Storage Unit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteStorage(s)} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-950/50">
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete Storage Unit
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddStorageDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={() => { load(); toast.success('Storage unit added'); setAddOpen(false) }} />

      {editStorage && (
        <StorageFormDialog
          storage={editStorage}
          onClose={() => setEditStorage(null)}
          onSuccess={() => { load(); toast.success('Storage unit updated'); setEditStorage(null) }}
        />
      )}

      {deleteStorage && (
        <DeleteStorageDialog
          storage={deleteStorage}
          onClose={() => setDeleteStorage(null)}
          onSuccess={() => { load(); setDeleteStorage(null) }}
        />
      )}
    </div>
  )
}

function AddStorageDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', tempCategory: 'Refrigerated', temperatureC: '4', maxCapacity: '100' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/storage-units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to add storage unit')
      return
    }
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Storage Unit</DialogTitle>
          <DialogDescription>Register a new refrigeration or freezer unit at your facility.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StorageFormFields form={form} setForm={setForm} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700">{loading ? 'Adding...' : 'Add Unit'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StorageFormDialog({ storage, onClose, onSuccess }: { storage: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: storage.name ?? '',
    tempCategory: storage.tempCategory ?? 'Refrigerated',
    temperatureC: String(storage.temperatureC ?? '4'),
    maxCapacity: String(storage.maxCapacity ?? '100'),
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload: any = {}
    if (form.name !== storage.name) payload.name = form.name
    if (form.tempCategory !== storage.tempCategory) payload.tempCategory = form.tempCategory
    if (parseFloat(form.temperatureC) !== storage.temperatureC) payload.temperatureC = form.temperatureC
    if (parseInt(form.maxCapacity) !== storage.maxCapacity) payload.maxCapacity = form.maxCapacity

    if (Object.keys(payload).length === 0) {
      toast.info('No changes to save')
      setLoading(false)
      onClose()
      return
    }

    const res = await fetch(`/api/storage-units/${storage.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to update storage unit')
      return
    }
    onSuccess()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-rose-600" /> Edit Storage Unit</DialogTitle>
          <DialogDescription>Update details for {storage.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StorageFormFields form={form} setForm={setForm} />
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

function DeleteStorageDialog({ storage, onClose, onSuccess }: { storage: any; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/storage-units/${storage.id}`, { method: 'DELETE' })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to delete storage unit')
      onClose()
      return
    }
    toast.success('Storage unit deleted')
    onSuccess()
  }

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600" /> Delete Storage Unit?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to permanently delete <strong>{storage.name}</strong>.
            If the storage unit currently holds blood units, deletion will be blocked.
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

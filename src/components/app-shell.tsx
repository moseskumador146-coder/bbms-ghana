'use client'
import { ReactNode, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from '@/lib/router'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROLE_LABELS, ROLE_BADGES } from '@/lib/auth-constants'
import {
  Droplet, LayoutDashboard, Boxes, Network, FlaskConical, Users, Building2,
  ScrollText, FileBarChart, AlertTriangle, LogOut, Menu, X, Heart, Activity,
  Settings, ShieldCheck, type LucideIcon
} from 'lucide-react'

interface NavItem {
  page: string
  label: string
  icon: LucideIcon
}

function getNavItems(role: string): NavItem[] {
  const items: NavItem[] = []
  items.push({ page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard })

  if (role === 'SYS_ADMIN') {
    items.push({ page: 'facilities', label: 'Facilities', icon: Building2 })
    items.push({ page: 'users', label: 'User Accounts', icon: Users })
    items.push({ page: 'blood-units', label: 'Network Inventory', icon: Boxes })
    items.push({ page: 'network-requests', label: 'Network Requests', icon: Network })
    items.push({ page: 'audit-logs', label: 'Audit Logs', icon: ScrollText })
    items.push({ page: 'reports', label: 'Reports', icon: FileBarChart })
  } else if (role === 'BBO') {
    items.push({ page: 'blood-units', label: 'Blood Inventory', icon: Boxes })
    items.push({ page: 'storage', label: 'Storage Units', icon: Settings })
    items.push({ page: 'alerts', label: 'Expiry Alerts', icon: AlertTriangle })
    items.push({ page: 'internal-requests', label: 'Internal Requests', icon: FlaskConical })
    items.push({ page: 'network-requests', label: 'Network Requests', icon: Network })
    items.push({ page: 'donors', label: 'Donors', icon: Heart })
    items.push({ page: 'reports', label: 'Reports', icon: FileBarChart })
    items.push({ page: 'audit-logs', label: 'Audit Logs', icon: ScrollText })
  } else if (role === 'LAB_TECH') {
    items.push({ page: 'blood-units', label: 'Blood Units', icon: Boxes })
    items.push({ page: 'storage', label: 'Storage Units', icon: Settings })
    items.push({ page: 'alerts', label: 'Expiry Alerts', icon: AlertTriangle })
    items.push({ page: 'donors', label: 'Donors', icon: Heart })
  } else if (role === 'HOSP_ADMIN') {
    items.push({ page: 'blood-units', label: 'Blood Inventory', icon: Boxes })
    items.push({ page: 'internal-requests', label: 'Internal Requests', icon: FlaskConical })
    items.push({ page: 'network-requests', label: 'Network Requests', icon: Network })
    items.push({ page: 'donors', label: 'Donors', icon: Heart })
    items.push({ page: 'users', label: 'Staff Accounts', icon: Users })
    items.push({ page: 'reports', label: 'Reports', icon: FileBarChart })
    items.push({ page: 'audit-logs', label: 'Audit Logs', icon: ScrollText })
  } else if (role === 'NURSE_DOCTOR') {
    items.push({ page: 'internal-requests', label: 'My Blood Requests', icon: FlaskConical })
    items.push({ page: 'blood-units', label: 'View Inventory', icon: Boxes })
  }
  return items
}

export function AppShell({ children, currentPage }: { children: ReactNode; currentPage: string }) {
  const { user, logout } = useAuth()
  const { navigate } = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  if (!user) return null
  const items = getNavItems(user.role)
  const initials = user.fullName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 flex items-center px-4 lg:px-6 gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-2 rounded-md hover:bg-slate-100"
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center">
            <Droplet className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-slate-900 leading-tight">BBMS Ghana</div>
            <div className="text-[11px] text-slate-500 leading-tight">Blood Bank Management</div>
          </div>
        </div>

        <div className="flex-1" />

        {/* Facility indicator */}
        {user.role !== 'SYS_ADMIN' && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-700 max-w-[200px] truncate">{user.facilityName}</span>
          </div>
        )}

        <Badge className={`${ROLE_BADGES[user.role]} border`} variant="outline">
          {ROLE_LABELS[user.role]}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-slate-100 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-rose-100 text-rose-700 text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2">
              <div className="text-sm font-medium truncate">{user.fullName}</div>
              <div className="text-xs text-slate-500 truncate">{user.email}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('dashboard')} className="cursor-pointer">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-rose-600 focus:text-rose-700">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky top-16 left-0 bottom-0 lg:top-16 lg:h-[calc(100vh-4rem)] z-20 w-64 bg-white border-r border-slate-200 transition-transform overflow-y-auto`}
        >
          <nav className="p-3 space-y-1">
            {items.map((item) => {
              const Icon = item.icon
              const active = currentPage === item.page
              return (
                <button
                  key={item.page}
                  onClick={() => {
                    navigate(item.page)
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'text-slate-700 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-rose-600' : 'text-slate-500'}`} />
                  {item.label}
                </button>
              )
            })}
          </nav>
          <div className="p-3 mt-2 border-t border-slate-100">
            <div className="px-3 py-2 rounded-md bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-medium">HTTPS Encrypted</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Ghana Data Protection Act 2012 (Act 843) Compliant</div>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 top-16 bg-slate-900/40 z-10"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-4 px-4 lg:px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-rose-500" />
          <span>Cloud-Based Blood Bank Management System &middot; Ghana &middot; 2026</span>
        </div>
        <div className="text-slate-400">Group E Project &middot; GCTU</div>
      </footer>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { Droplet, Loader2, Shield, Cloud, Network, AlertTriangle } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { role: 'System Admin', email: 'admin@bbms.gh', password: 'Admin@2026', color: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-300' },
  { role: 'Blood Bank Officer', email: 'bbo@kob.bbms.gh', password: 'Bbo@2026', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-900 dark:text-emerald-300' },
  { role: 'Lab Technician', email: 'lab@kob.bbms.gh', password: 'Lab@2026', color: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/50 dark:border-amber-900 dark:text-amber-300' },
  { role: 'Hospital Admin', email: 'hospadmin@kob.bbms.gh', password: 'Hosp@2026', color: 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/50 dark:border-violet-900 dark:text-violet-300' },
  { role: 'Nurse / Doctor', email: 'nurse@kob.bbms.gh', password: 'Nurse@2026', color: 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/50 dark:border-sky-900 dark:text-sky-300' },
]

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await login(email, password)
    setLoading(false)
    if (!res.ok) setError(res.error ?? 'Login failed')
  }

  async function quickLogin(acc: { email: string; password: string }) {
    setEmail(acc.email)
    setPassword(acc.password)
    setError(null)
    setLoading(true)
    const res = await login(acc.email, acc.password)
    setLoading(false)
    if (!res.ok) setError(res.error ?? 'Login failed')
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left brand panel */}
      <div className="lg:w-1/2 bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-0 -left-24 w-96 h-96 rounded-full bg-white blur-3xl"></div>
        </div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Droplet className="w-7 h-7 text-white" fill="currentColor" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight">BBMS Ghana</div>
              <div className="text-xs text-rose-100">Blood Bank Management System</div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-md p-1 border border-white/20">
            <ThemeToggle />
          </div>
        </div>
        <div className="relative space-y-6 my-12">
          <h1 className="text-3xl lg:text-5xl font-bold leading-tight">
            Saving lives through<br />
            <span className="text-rose-200">connected blood banks</span>
          </h1>
          <p className="text-rose-100 text-base lg:text-lg max-w-md">
            A cloud-based, multi-facility platform that enables real-time blood inventory visibility
            and structured cross-facility broadcast requests across Ghana.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <Cloud className="w-5 h-5 mb-2" />
              <div className="text-sm font-semibold">Cloud Hosted</div>
              <div className="text-xs text-rose-100">No local servers needed</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <Network className="w-5 h-5 mb-2" />
              <div className="text-sm font-semibold">Cross-Facility</div>
              <div className="text-xs text-rose-100">Real-time broadcast</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <Shield className="w-5 h-5 mb-2" />
              <div className="text-sm font-semibold">Role-Based</div>
              <div className="text-xs text-rose-100">Secure access control</div>
            </div>
          </div>
        </div>
        <div className="relative text-xs text-rose-100">
          <p>Ghana Communication Technology University &middot; Faculty of Computing & Information Systems</p>
          <p className="mt-1">Group E Project &middot; June 2026 &middot; Supervisor: Dr. Patrick Acheampong</p>
        </div>
      </div>

      {/* Right login form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>Enter your credentials to access the blood bank portal</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@facility.bbms.gh"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                {error && (
                  <div className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-md p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6">
            <div className="text-xs text-muted-foreground mb-3 text-center uppercase tracking-wide">Quick demo access</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => quickLogin(acc)}
                  disabled={loading}
                  className={`text-left p-2.5 rounded-md border ${acc.color} text-xs hover:scale-[1.02] transition-transform disabled:opacity-50`}
                >
                  <div className="font-semibold">{acc.role}</div>
                  <div className="opacity-80 truncate">{acc.email}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Click any role to sign in instantly with demo data
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

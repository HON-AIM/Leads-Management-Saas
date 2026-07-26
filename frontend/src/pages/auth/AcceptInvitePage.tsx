import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowRight, Shield, Mail } from 'lucide-react'
import api from '@/lib/api'

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addNotification } = useNotifications()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [activated, setActivated] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  if (!token || !email) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e1a] px-4">
        <div className="pointer-events-none fixed top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-blue-500/[0.08] blur-3xl" />
        <div className="relative z-10 w-full max-w-[400px] space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-[11px] font-bold tracking-wider text-white shadow-lg shadow-blue-600/20">LF</div>
              <span className="text-lg font-semibold tracking-tight text-white">LeadFlowX</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#0d1225]/80 p-7 shadow-2xl backdrop-blur-xl text-center">
            <h1 className="text-xl font-semibold text-white mb-2">Invalid Invite Link</h1>
            <p className="text-[13px] text-slate-400 mb-6">This invite link is missing required information. Please check your email and use the original link, or contact your admin for a new invite.</p>
            <Button className="h-11 w-full rounded-lg bg-blue-600 text-[13px] font-semibold text-white" onClick={() => navigate('/login')}>Go to Login</Button>
          </div>
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e1a] px-4">
        <div className="pointer-events-none fixed top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-blue-500/[0.08] blur-3xl" />
        <div className="relative z-10 w-full max-w-[400px] space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-[11px] font-bold tracking-wider text-white shadow-lg shadow-blue-600/20">LF</div>
              <span className="text-lg font-semibold tracking-tight text-white">LeadFlowX</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#0d1225]/80 p-7 shadow-2xl backdrop-blur-xl text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <Mail size={24} className="text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Invite Link Issue</h1>
            <p className="text-[13px] text-slate-400 mb-6">{errorMessage}</p>
            <Button className="h-11 w-full rounded-lg bg-blue-600 text-[13px] font-semibold text-white" onClick={() => navigate('/login')}>Go to Login</Button>
          </div>
        </div>
      </div>
    )
  }

  if (activated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e1a] px-4">
        <div className="pointer-events-none fixed top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-blue-500/[0.08] blur-3xl" />
        <div className="relative z-10 w-full max-w-[400px] space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-[11px] font-bold tracking-wider text-white shadow-lg shadow-blue-600/20">LF</div>
              <span className="text-lg font-semibold tracking-tight text-white">LeadFlowX</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#0d1225]/80 p-7 shadow-2xl backdrop-blur-xl text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <Shield size={24} className="text-emerald-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Account Activated</h1>
            <p className="text-[13px] text-slate-400 mb-6">Your account is now active. You can log in with your new password.</p>
            <Button className="h-11 w-full rounded-lg bg-blue-600 text-[13px] font-semibold text-white" onClick={() => navigate('/login')}>Go to Login</Button>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      addNotification({ type: 'error', title: 'Passwords do not match', description: 'Please make sure both passwords match.' })
      return
    }

    if (password.length < 8) {
      addNotification({ type: 'error', title: 'Password too short', description: 'Password must be at least 8 characters.' })
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/accept-invite', { token, email, password })
      setActivated(true)
      addNotification({ type: 'success', title: 'Account activated', description: 'You can now log in with your new password.' })
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Something went wrong. Please try again.'
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e1a] px-4">
      <div className="pointer-events-none fixed top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-blue-500/[0.08] blur-3xl" />
      <div className="relative z-10 w-full max-w-[400px] space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-[11px] font-bold tracking-wider text-white shadow-lg shadow-blue-600/20">LF</div>
            <span className="text-lg font-semibold tracking-tight text-white">LeadFlowX</span>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1225]/80 p-7 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 space-y-1.5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
              <Shield size={24} className="text-blue-400" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Set Your Password</h1>
            <p className="text-[13px] text-slate-400">
              You've been invited to join the team. Set your password to get started.
            </p>
            <p className="text-[12px] text-slate-500">{email}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[12px] font-medium text-slate-300">Password</Label>
              <Input id="password" type="password" placeholder="Min 8 characters" autoComplete="new-password" autoFocus
                className="h-10 border-white/[0.10] bg-white/[0.05] text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[12px] font-medium text-slate-300">Confirm Password</Label>
              <Input id="confirmPassword" type="password" placeholder="Re-enter your password" autoComplete="new-password"
                className="h-10 border-white/[0.10] bg-white/[0.05] text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-[11px] text-red-400">Passwords do not match</p>
              )}
            </div>
            <Button type="submit" className="h-11 w-full rounded-lg bg-blue-600 text-[13px] font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800"
              disabled={loading || !password || !confirmPassword}>
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Activating...</span>
              ) : (
                <span className="flex items-center gap-2">Activate Account<ArrowRight size={14} /></span>
              )}
            </Button>
          </form>
        </div>
        <p className="text-center text-[11px] text-slate-600">&copy; {new Date().getFullYear()} LeadFlowX &middot; AI-Powered Lead Distribution</p>
      </div>
    </div>
  )
}

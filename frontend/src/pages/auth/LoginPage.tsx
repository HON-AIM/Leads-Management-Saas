import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowRight,
  Loader2,
  Star,
  Route,
  BrainCircuit,
  BarChart3,
  Repeat,
  Check,
} from 'lucide-react'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  tenantSlug: z.string().min(1, 'Workspace is required'),
})

type LoginForm = z.infer<typeof loginSchema>

const FEATURES = [
  { icon: Route, label: 'Smart Lead Routing' },
  { icon: BrainCircuit, label: 'AI Lead Scoring' },
  { icon: BarChart3, label: 'Real-Time Analytics' },
  { icon: Repeat, label: 'Ping Post' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, getRedirectPath } = useAuth()
  const { addNotification } = useNotifications()
  const [loading, setLoading] = useState(false)

  const from = (location.state as { from?: string })?.from

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { tenantSlug: 'default' },
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const user = await login(data)
      const path = from || getRedirectPath(user.role)
      navigate(path, { replace: true })
    } catch (err: any) {
      const status = err?.response?.status
      const msg = err?.response?.data?.error || 'Invalid credentials'

      if (status === 429) {
        addNotification({ type: 'warning', title: 'Too many requests', description: 'Please wait before trying again.' })
      } else {
        addNotification({ type: 'error', title: 'Login failed', description: msg })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e1a] px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-blue-500/[0.08] blur-3xl" />

      <div className="relative z-10 w-full max-w-[400px] space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-[11px] font-bold tracking-wider text-white shadow-lg shadow-blue-600/20">
              LF
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">
              LeadFlowX
            </span>
          </div>

          {/* Animated badge */}
          <div className="relative inline-flex rounded-full p-[1px] overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 rounded-[inherit]"
              style={{
                width: '80px',
                height: '6px',
                offsetPath: 'rect(0 auto auto 0 round 9999px)',
                animation: 'border-beam 4s linear infinite',
                background: 'linear-gradient(to left, #3b82f6, transparent)',
              }}
            />
            <div className="relative inline-flex items-center gap-2 rounded-full bg-[#0d1225] px-4 py-1.5">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
              <span className="text-xs font-medium text-blue-400">
                AI-Powered Lead Distribution
              </span>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1225]/80 p-7 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 space-y-1.5 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="text-[13px] text-slate-400">
              Sign in to your workspace to continue
            </p>
          </div>

          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tenantSlug" className="text-[12px] font-medium text-slate-300">
                Workspace
              </Label>
              <Input
                id="tenantSlug"
                placeholder="e.g. acme-corp"
                autoComplete="organization"
                className="h-10 border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-blue-500/20"
                {...register('tenantSlug')}
              />
              {errors.tenantSlug && (
                <p className="text-[11px] text-red-400">{errors.tenantSlug.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-medium text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
                className="h-10 border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-blue-500/20"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-[11px] text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[12px] font-medium text-slate-300">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-medium text-blue-400 transition hover:text-blue-300"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                className="h-10 border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-blue-500/20"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-[11px] text-red-400">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-lg bg-blue-600 text-[13px] font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <ArrowRight size={14} />
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Social Proof */}
        <div className="flex flex-col items-center gap-4">
          {/* Star Rating */}
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className="fill-amber-400 text-amber-400"
                />
              ))}
            </div>
            <span className="text-sm text-slate-400">
              Trusted by growing teams
            </span>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {FEATURES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 text-[12px] text-slate-500"
              >
                <Icon size={12} className="text-blue-500/70" />
                {label}
              </span>
            ))}
          </div>

          {/* Trust badges */}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-blue-500" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-blue-500" />
              Free plan available
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-blue-500" />
              5-minute setup
            </span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-700">
          © {new Date().getFullYear()} LeadFlowX · AI-Powered Lead Distribution
        </p>
      </div>
    </div>
  )
}

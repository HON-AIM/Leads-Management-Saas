import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, Loader2 } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  tenantSlug: z.string().min(1, 'Workspace is required'),
})

type LoginForm = z.infer<typeof loginSchema>

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
    <div className="flex min-h-screen items-center justify-center bg-[#070b16] px-4">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)]" />

      <div className="relative w-full max-w-[360px] space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-[11px] font-bold text-white tracking-wider">
            LD
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">Lead Distro</span>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0c1021] p-6 shadow-elevated">
          <div className="mb-6 space-y-1">
            <h1 className="text-[15px] font-semibold text-white tracking-tight">Welcome back</h1>
            <p className="text-[12px] text-muted-foreground">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tenantSlug">Workspace</Label>
              <Input
                id="tenantSlug"
                placeholder="e.g. acme-corp"
                autoComplete="organization"
                {...register('tenantSlug')}
              />
              {errors.tenantSlug && <p className="text-[11px] text-red-400">{errors.tenantSlug.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
                {...register('email')}
              />
              {errors.email && <p className="text-[11px] text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && <p className="text-[11px] text-red-400">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
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

        <p className="text-center text-[11px] text-slate-600">
          Lead Distribution Platform
        </p>
      </div>
    </div>
  )
}

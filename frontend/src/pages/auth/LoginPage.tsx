import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROUTES } from '@/lib/constants'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, getRedirectPath } = useAuth()
  const { addNotification } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const from = (location.state as { from?: string })?.from
  const expired = location.search.includes('expired=true')
  const locked = location.search.includes('locked=true')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const user = await login(data)
      const path = from || getRedirectPath(user.role)
      navigate(path, { replace: true })
    } catch (err: any) {
      const status = err?.response?.status
      const msg = err?.response?.data?.message || 'Invalid username or password'

      if (status === 423) {
        addNotification({ type: 'error', title: 'Account locked', description: 'Too many attempts. Try again later or reset your password.' })
      } else if (status === 429) {
        addNotification({ type: 'warning', title: 'Too many requests', description: 'Please wait before trying again.' })
      } else {
        addNotification({ type: 'error', title: 'Login failed', description: msg })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col overflow-hidden lg:flex-row">
        <div className="relative hidden overflow-hidden lg:block lg:w-[55%] xl:w-[60%]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.2),_transparent_28%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,_rgba(15,23,42,0.95)_0%,_rgba(15,23,42,0.64)_100%)]" />
          <div className="relative flex h-full flex-col justify-center px-16 py-20">
            <div className="max-w-xl space-y-8">
              <span className="inline-flex rounded-full bg-primary/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
                Admin Dashboard
              </span>
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Centralized lead operations for fast-growing teams
              </h1>
              <p className="text-lg leading-8 text-slate-300">
                Monitor campaign performance, route leads intelligently, and keep your organization in sync with one secure platform.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Live insights</p>
                  <p className="mt-3 text-base text-slate-200">See route health, lead velocity, and assignment status in real time.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Secure access</p>
                  <p className="mt-3 text-base text-slate-200">Authenticate, manage sessions, and protect admin controls with confidence.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:px-14">
          <div className="w-full max-w-md space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/95 p-10 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-r from-primary to-cyan-500 text-lg font-bold text-white shadow-lg shadow-cyan-500/20">
                    LD
                  </div>
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Lead management</p>
                    <h1 className="text-3xl font-semibold tracking-tight text-white">Admin sign in</h1>
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-400">
                  Use your admin credentials to access routing controls, analytics, and team operations.
                </p>
              </div>

              {expired && (
                <div className="mb-6 rounded-3xl border border-amber-200/70 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <strong className="font-semibold">Session expired.</strong> Please sign back in to continue.
                </div>
              )}

              {locked && (
                <div className="mb-6 rounded-3xl border border-rose-200/70 bg-rose-500/10 p-4 text-sm text-rose-100">
                  <strong className="font-semibold">Account locked.</strong> Multiple failed attempts detected, please try again later or reset your password.
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="username">Username</Label>
                    {errors.username && <span className="text-xs text-rose-300">{errors.username.message}</span>}
                  </div>
                  <Input
                    id="username"
                    placeholder="admin.username"
                    autoComplete="username"
                    autoFocus
                    {...register('username')}
                    className="bg-slate-950/80 text-white"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link to={ROUTES.FORGOT_PASSWORD} className="text-sm text-slate-400 hover:text-white">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    {...register('password')}
                    className="bg-slate-950/80 text-white"
                  />
                  {errors.password && <p className="text-xs text-rose-300">{errors.password.message}</p>}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={rememberMe}
                    onClick={() => setRememberMe(!rememberMe)}
                    className={`inline-flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                      rememberMe
                        ? 'border-primary bg-primary text-slate-950'
                        : 'border-slate-700 bg-transparent text-transparent'
                    }`}
                  >
                    {rememberMe && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <Label htmlFor="remember" className="cursor-pointer text-sm text-slate-400" onClick={() => setRememberMe(!rememberMe)}>
                    Remember me
                  </Label>
                  <span className="text-xs text-slate-500">Secure session</span>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign in to admin portal'
                  )}
                </Button>
              </form>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 text-sm text-slate-400 shadow-lg shadow-slate-950/20">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-slate-100">✓</div>
                  <div>
                    <p className="font-semibold text-slate-100">Admin-ready experience</p>
                    <p className="text-slate-500">Streamlined controls for assignments, approvals, and reporting.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-slate-100">⚡</div>
                  <div>
                    <p className="font-semibold text-slate-100">Fast access</p>
                    <p className="text-slate-500">Sign in quickly and keep your lead distribution moving.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-slate-100">🔒</div>
                  <div>
                    <p className="font-semibold text-slate-100">Safe authentication</p>
                    <p className="text-slate-500">Cookies are secured and sessions are managed from the backend.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

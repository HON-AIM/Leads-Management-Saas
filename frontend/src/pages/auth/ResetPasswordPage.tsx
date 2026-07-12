import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROUTES } from '@/lib/constants'
import api from '@/lib/api'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/[0-9]/, 'Must include a number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetForm = z.infer<typeof resetSchema>

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addNotification } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const token = searchParams.get('token')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  const password = watch('password', '')

  const strengthChecks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
  ]
  const strength = strengthChecks.filter((c) => c.pass).length

  const onSubmit = async (data: ResetForm) => {
    if (!token) {
      addNotification({ type: 'error', title: 'Invalid link', description: 'This reset link is invalid or has expired.' })
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password: data.password })
      setDone(true)
      addNotification({ type: 'success', title: 'Password reset', description: 'Your password has been updated.' })
      setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 2000)
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to reset password'
      addNotification({ type: 'error', title: 'Error', description: message })
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1e] px-4">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)]" />
        <div className="relative w-full max-w-[360px] rounded-xl border border-white/[0.08] bg-[#0e1428] p-8 text-center shadow-elevated">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
            <XCircle size={22} className="text-red-400" />
          </div>
          <h2 className="text-[15px] font-semibold text-white">Invalid reset link</h2>
          <p className="mt-2 text-[12px] text-muted-foreground">This link is invalid or has expired.</p>
          <Button asChild variant="outline" size="sm" className="mt-6">
            <Link to={ROUTES.FORGOT_PASSWORD}>Request new link</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1e] px-4">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)]" />
        <div className="relative w-full max-w-[360px] rounded-xl border border-white/[0.08] bg-[#0e1428] p-8 text-center shadow-elevated">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <CheckCircle size={22} className="text-emerald-400" />
          </div>
          <h2 className="text-[15px] font-semibold text-white">Password reset successful</h2>
          <p className="mt-2 text-[12px] text-muted-foreground">Redirecting you to sign in...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1e] px-4">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)]" />

      <div className="relative w-full max-w-[360px] space-y-8">
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-[11px] font-bold text-white tracking-wider">
            LF
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">LeadFlowX</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-6 shadow-elevated">
          <div className="mb-6 space-y-1">
            <h1 className="text-[15px] font-semibold text-white tracking-tight">Set new password</h1>
            <p className="text-[12px] text-muted-foreground">
              Must be at least 8 characters with uppercase, lowercase, and a number.
            </p>
          </div>

          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                autoFocus
                {...register('password')}
              />
              {errors.password && <p className="text-[11px] text-red-400">{errors.password.message}</p>}
              {password.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex h-1 gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-full flex-1 rounded-full transition-colors ${
                          i <= strength
                            ? strength <= 2 ? 'bg-red-500' : strength === 3 ? 'bg-amber-500' : 'bg-emerald-500'
                            : 'bg-white/[0.08]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {strengthChecks.map((check) => (
                      <span
                        key={check.label}
                        className={`text-[10px] ${check.pass ? 'text-emerald-400' : 'text-muted-foreground/70'}`}
                      >
                        {check.pass ? '✓' : '○'} {check.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && <p className="text-[11px] text-red-400">{errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Resetting...
                </span>
              ) : 'Reset password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

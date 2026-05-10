import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROUTES } from '@/lib/constants'

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
  const { resetPassword } = useAuth()
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
      await resetPassword({ token, password: data.password })
      setDone(true)
      addNotification({ type: 'success', title: 'Password reset', description: 'Your password has been updated. Please sign in.' })
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
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
              <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Invalid reset link</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This link is invalid or has expired. Request a new one.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to={ROUTES.FORGOT_PASSWORD}>Request new link</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Password reset successful</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirecting you to sign in...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to={ROUTES.LOGIN} className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            LD
          </Link>
        </div>

        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">Set new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Must be at least 8 characters with uppercase, lowercase, and a number.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                autoFocus
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
              {password.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex h-1.5 gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-full flex-1 rounded-full transition-colors ${
                          i <= strength
                            ? strength <= 2
                              ? 'bg-destructive'
                              : strength === 3
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <ul className="space-y-0.5">
                    {strengthChecks.map((check) => (
                      <li
                        key={check.label}
                        className={`flex items-center gap-1.5 text-xs ${
                          check.pass ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {check.pass ? (
                            <polyline points="20 6 9 17 4 12" />
                          ) : (
                            <line x1="18" x2="6" y1="6" y2="18" />
                          )}
                        </svg>
                        {check.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

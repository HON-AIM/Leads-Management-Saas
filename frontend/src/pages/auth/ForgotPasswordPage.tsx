import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROUTES } from '@/lib/constants'
import api from '@/lib/api'
import { ArrowLeft, Mail, CheckCircle, Loader2 } from 'lucide-react'

const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
})

type ForgotForm = z.infer<typeof forgotSchema>

export function ForgotPasswordPage() {
  const { addNotification } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data: ForgotForm) => {
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', data)
      setSent(true)
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to send reset email'
      addNotification({ type: 'error', title: 'Error', description: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070b16] px-4">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)]" />

      <div className="relative w-full max-w-[360px] space-y-8">
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-[11px] font-bold text-white tracking-wider">
            LD
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">Lead Distro</span>
        </div>

        {sent ? (
          <div className="rounded-xl border border-white/[0.06] bg-[#0c1021] p-8 text-center shadow-elevated">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckCircle size={22} className="text-emerald-400" />
            </div>
            <h2 className="text-[15px] font-semibold text-white">Check your email</h2>
            <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
              If an account with that email exists, we've sent password reset instructions.
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/60">
              Didn't receive it? Check your spam or{' '}
              <button onClick={() => setSent(false)} className="text-blue-400 hover:text-blue-300 transition-colors">
                try again
              </button>
            </p>
            <Button asChild variant="outline" size="sm" className="mt-6">
              <Link to={ROUTES.LOGIN}>Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.06] bg-[#0c1021] p-6 shadow-elevated">
            <div className="mb-6 space-y-1">
              <h1 className="text-[15px] font-semibold text-white tracking-tight">Reset password</h1>
              <p className="text-[12px] text-muted-foreground">Enter your email and we'll send you a reset link.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Mail size={14} />
                    Send reset link
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link to={ROUTES.LOGIN} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-white/60 transition-colors">
                <ArrowLeft size={12} />
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

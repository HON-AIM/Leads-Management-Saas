import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const addLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().optional(),
  state: z.string().min(1, 'State is required'),
  source: z.string().optional(),
  notes: z.string().optional(),
})

type AddLeadForm = z.infer<typeof addLeadSchema>

export function AddLeadPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addNotification } = useNotifications()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddLeadForm>({
    resolver: zodResolver(addLeadSchema),
    defaultValues: { source: 'manual' },
  })

  const mutation = useMutation({
    mutationFn: async (data: AddLeadForm) => {
      const res = await api.post('/leads', data)
      return res.data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Lead created', description: 'The lead has been added successfully' })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEADS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STATS })
      reset()
      navigate('/leads')
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || 'Failed to create lead'
      addNotification({ type: 'error', title: 'Error', description: message })
    },
  })

  const onSubmit = (data: AddLeadForm) => {
    mutation.mutate(data)
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Lead</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new lead entry
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead Information</CardTitle>
          <CardDescription>Enter the details of the new lead</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" placeholder="John Doe" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="john@example.com" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+1 (555) 123-4567" {...register('phone')} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input id="state" placeholder="California" {...register('state')} />
                {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input id="source" placeholder="Website, Referral, etc." {...register('source')} />
              {errors.source && <p className="text-xs text-destructive">{errors.source.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Any additional notes..."
                {...register('notes')}
              />
              {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating...' : 'Create Lead'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/leads')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

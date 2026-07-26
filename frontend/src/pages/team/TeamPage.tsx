import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserPlus, Trash2, Shield, User, Mail, Clock } from 'lucide-react'
import { SEMANTIC_COLORS } from '@/lib/statusColors'

interface TeamUser {
  _id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'member'
  status: string
  createdAt: string
}

const USER_STATUS_COLOR: Record<string, { bg: string; text: string; ring: string }> = {
  active: SEMANTIC_COLORS.positive,
  pending: SEMANTIC_COLORS.caution,
  inactive: SEMANTIC_COLORS.neutral,
}

export function TeamPage() {
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const queryClient = useQueryClient()

  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      const { data } = await api.get('/auth/users')
      return data.data?.users ?? data.users ?? []
    },
  })
  const users: TeamUser[] = Array.isArray(usersData) ? usersData : []

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/invite', {
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
      })
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] })
      const errorMsg = data?.error
      if (errorMsg) {
        addNotification({
          type: 'warning',
          title: 'Invite issue',
          description: errorMsg,
        })
      } else {
        addNotification({
          type: 'success',
          title: 'Invite sent',
          description: `${inviteName} has been invited to your team.`,
        })
      }
      setInviteName('')
      setInviteEmail('')
      setInviteRole('member')
      setShowInvite(false)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Could not send invite.'
      addNotification({ type: 'error', title: 'Failed', description: msg })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/auth/users/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] })
      addNotification({ type: 'success', title: 'User removed', description: 'User has been removed from your team.' })
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Failed', description: err?.response?.data?.error || 'Could not remove user.' })
    },
  })

  const resendInviteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post(`/auth/invite/${userId}/resend`)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] })
      addNotification({
        type: 'success',
        title: 'Invite resent',
        description: data?.data?.message || 'A fresh invite has been sent.',
      })
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Failed', description: err?.response?.data?.error || 'Could not resend invite.' })
    },
  })

  const getStatusBadge = (status: string) => {
    const colors = USER_STATUS_COLOR[status] || USER_STATUS_COLOR.active
    const label = status === 'pending' ? 'Pending' : status === 'active' ? 'Active' : 'Inactive'
    return (
      <Badge className={`text-[10px] px-2 py-0.5 ${colors.bg} ${colors.text} ${colors.ring}`}>
        {label}
      </Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-400 border-purple-500/20">Owner</Badge>
      case 'admin':
        return <Badge className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border-blue-500/20">Admin</Badge>
      case 'member':
        return <Badge className="text-[10px] px-2 py-0.5 bg-white/[0.06] text-muted-foreground border-white/[0.08]">Member</Badge>
      default:
        return <Badge className="text-[10px] px-2 py-0.5">{role}</Badge>
    }
  }

  const getInitials = (name: string) => {
    return name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  const canManageUsers = user?.role === 'super_admin' || user?.role === 'admin'

  return (
    <div className="mx-auto max-w-[640px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-white tracking-tight">Team</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Manage users and their access roles
          </p>
        </div>
        {canManageUsers && (
          <Button variant="cta" size="sm" onClick={() => setShowInvite(!showInvite)}>
            <UserPlus size={14} className="mr-1.5" />
            Invite User
          </Button>
        )}
      </div>

      {showInvite && (
        <Card className="border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-[14px]">Invite New User</CardTitle>
            <CardDescription>They'll receive an email to set their own password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Full Name</label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Role</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInviteRole('admin')}
                  className={`flex-1 flex items-center gap-2 rounded-lg border p-3 transition-colors ${
                    inviteRole === 'admin'
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                      : 'border-white/[0.08] text-muted-foreground hover:border-white/[0.14]'
                  }`}
                >
                  <Shield size={14} />
                  <div className="text-left">
                    <p className="text-[13px] font-medium">Admin</p>
                    <p className="text-[10px] opacity-70">Full access</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setInviteRole('member')}
                  className={`flex-1 flex items-center gap-2 rounded-lg border p-3 transition-colors ${
                    inviteRole === 'member'
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                      : 'border-white/[0.08] text-muted-foreground hover:border-white/[0.14]'
                  }`}
                >
                  <User size={14} />
                  <div className="text-left">
                    <p className="text-[13px] font-medium">Member</p>
                    <p className="text-[10px] opacity-70">View &amp; create only</p>
                  </div>
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="cta"
                size="sm"
                disabled={!inviteName || !inviteEmail || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate()}
              >
                {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowInvite(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team Members ({users.length})</CardTitle>
          <CardDescription>People with access to this workspace</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="relative h-6 w-6">
                <div className="absolute inset-0 rounded-full border-2 border-white/[0.08]" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
              </div>
            </div>
          ) : users.length === 0 ? (
            <p className="px-6 pb-6 text-[12px] text-muted-foreground">No users found</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {users.map((u) => {
                const isCurrentUser = u._id === user?.id
                const isPending = u.status === 'pending'
                return (
                  <div key={u._id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-white/[0.05] text-[11px] font-medium text-muted-foreground">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-[13px] font-medium truncate ${isPending ? 'text-muted-foreground' : 'text-white'}`}>{u.name}</p>
                          {isCurrentUser && (
                            <span className="text-[10px] text-muted-foreground/60">(you)</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {getStatusBadge(u.status)}
                      {getRoleBadge(u.role)}
                      {canManageUsers && !isCurrentUser && u.role !== 'super_admin' && (
                        <>
                          {isPending && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-blue-400"
                              onClick={() => resendInviteMutation.mutate(u._id)}
                              disabled={resendInviteMutation.isPending}
                              title="Resend invite"
                            >
                              <Mail size={14} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-red-400"
                            onClick={() => {
                              if (confirm(`Remove ${u.name} from the team?`)) {
                                removeMutation.mutate(u._id)
                              }
                            }}
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

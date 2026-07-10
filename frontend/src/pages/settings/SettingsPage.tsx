import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LoadingScreen } from '@/components/feedback/LoadingScreen'
import { QUERY_KEYS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Session } from '@/types/auth'
import { LogOut, Monitor, Smartphone, Tablet } from 'lucide-react'

export function SettingsPage() {
  const { user, logout } = useAuth()
  const { addNotification } = useNotifications()
  const queryClient = useQueryClient()

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.trim() || user.email?.[0]?.toUpperCase() || 'U'
    : 'U'

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: QUERY_KEYS.SESSIONS,
    queryFn: async () => {
      const { data } = await fetchSessions()
      return data
    },
    enabled: !!user,
    retry: false,
  })

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await fetch(`/api/auth/sessions/${sessionId}`, { method: 'DELETE', credentials: 'include' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSIONS })
      addNotification({ type: 'success', title: 'Session removed', description: 'The session has been terminated.' })
    },
    onError: () => {
      addNotification({ type: 'error', title: 'Failed', description: 'Could not terminate the session.' })
    },
  })

  const list = sessions || []

  return (
    <div className="mx-auto max-w-[640px] space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-white tracking-tight">Settings</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Manage your account and sessions
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-blue-500/10 text-blue-400 text-[13px] font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-[14px]">{user?.firstName} {user?.lastName}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-[13px]">
            <div>
              <p className="text-muted-foreground text-[12px]">Role</p>
              <p className="font-medium capitalize">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[12px]">Tenant</p>
              <p className="font-medium">{user?.tenantName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Devices and browsers where you're currently signed in</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="relative h-6 w-6">
                <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
              </div>
            </div>
          ) : list.length === 0 ? (
            <p className="px-6 pb-6 text-[12px] text-muted-foreground">No active sessions</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {list.map((session: Session) => {
                const isCurrent = session.isCurrent || false
                return (
                  <div key={session._id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isCurrent ? 'bg-blue-500/10 text-blue-400' : 'bg-white/[0.03] text-muted-foreground'
                      }`}>
                        <Monitor size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium text-white/90 truncate">
                            {session.browser || 'Unknown browser'}
                          </p>
                          {isCurrent && (
                            <span className="shrink-0 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {session.os || 'Unknown OS'} · {session.device || 'Unknown device'}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60">
                          IP: {session.ipAddress || 'Unknown'} · Last active {session.lastActive ? formatDate(session.lastActive) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {!isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 ml-4 text-muted-foreground hover:text-red-400"
                        onClick={() => deleteMutation.mutate(session._id)}
                        disabled={deleteMutation.isPending}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign out */}
      <Card className="border-red-500/10">
        <CardHeader>
          <CardTitle className="text-[14px] text-red-400">Sign out</CardTitle>
          <CardDescription>End your current session across this device</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={logout}>
            <LogOut size={14} className="mr-2" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

async function fetchSessions() {
  const res = await fetch('/api/auth/sessions', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch sessions')
  const data = await res.json()
  return { data: data.sessions || data }
}

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

export function SettingsPage() {
  const { user, logout } = useAuth()
  const { addNotification } = useNotifications()
  const queryClient = useQueryClient()

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.trim() || user.username[0].toUpperCase()
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and sessions
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{user?.firstName} {user?.lastName}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Username</p>
              <p className="font-medium">{user?.username}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Role</p>
              <p className="font-medium capitalize">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tenant</p>
              <p className="font-medium">{user?.tenantName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tenant ID</p>
              <p className="font-medium text-xs font-mono">{user?.tenantId}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Sessions</CardTitle>
          <CardDescription>Devices and browsers where you're currently signed in</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : list.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No active sessions</p>
          ) : (
            <div className="divide-y">
              {list.map((session: Session) => {
                const isCurrent = session.isCurrent || false
                return (
                  <div key={session._id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {session.browser || 'Unknown browser'}
                          </p>
                          {isCurrent && (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {session.os || 'Unknown OS'} &middot; {session.device || 'Unknown device'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          IP: {session.ipAddress || 'Unknown'} &middot; Last active {session.lastActive ? formatDate(session.lastActive) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {!isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 ml-4 text-muted-foreground hover:text-destructive"
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

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Sign out</CardTitle>
          <CardDescription>End your current session across this device</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={logout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
            </svg>
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

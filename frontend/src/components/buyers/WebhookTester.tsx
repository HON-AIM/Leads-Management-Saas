import { useState } from 'react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { Client, WebhookTestResult } from '@/types'

interface WebhookTesterProps {
  client: Client
}

export function WebhookTester({ client }: WebhookTesterProps) {
  const [webhookUrl, setWebhookUrl] = useState(client.delivery.config.webhookUrl || '')
  const [customHeaders, setCustomHeaders] = useState(
    client.delivery.config.customHeaders
      ? JSON.stringify(client.delivery.config.customHeaders, null, 2)
      : '{\n  \n}'
  )
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<WebhookTestResult[]>([])

  const runTest = async () => {
    setTesting(true)
    const start = performance.now()
    try {
      let headers: Record<string, string> = {}
      try { headers = JSON.parse(customHeaders) } catch {}

      const res = await api.post('/webhook/test', {
        url: webhookUrl,
        headers,
        payload: {
          test: true,
          timestamp: new Date().toISOString(),
          lead: {
            name: 'Test Lead',
            email: 'test@example.com',
            state: 'CA',
            source: 'webhook_test',
          },
        },
      })
      const duration = Math.round(performance.now() - start)
      const result: WebhookTestResult = {
        status: res.status,
        statusText: res.statusText,
        body: JSON.stringify(res.data, null, 2),
        duration,
        timestamp: new Date().toISOString(),
      }
      setResults((prev) => [result, ...prev])
    } catch (err: any) {
      const duration = Math.round(performance.now() - start)
      const result: WebhookTestResult = {
        status: err.response?.status || 0,
        statusText: err.response?.statusText || 'Network Error',
        body: err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message,
        duration,
        timestamp: new Date().toISOString(),
      }
      setResults((prev) => [result, ...prev])
    } finally {
      setTesting(false)
    }
  }

  const statusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
    if (status >= 400) return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Webhook Tester</h3>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Webhook URL</Label>
          <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hook.example.com/endpoint" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Custom Headers (JSON)</Label>
          <textarea
            value={customHeaders}
            onChange={(e) => setCustomHeaders(e.target.value)}
            rows={4}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Button size="sm" onClick={runTest} disabled={testing || !webhookUrl}>
          {testing ? 'Testing...' : 'Send Test'}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <Badge className={statusColor(r.status)}>
                  {r.status} {r.statusText}
                </Badge>
                <span className="text-xs text-muted-foreground">{r.duration}ms</span>
              </div>
              {r.body && (
                <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-24">{r.body}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

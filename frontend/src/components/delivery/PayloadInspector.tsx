import { useState } from 'react'
import type { DeliveryLog } from '@/types/delivery'

interface PayloadInspectorProps {
  log: DeliveryLog
  onClose: () => void
}

export function PayloadInspector({ log, onClose }: PayloadInspectorProps) {
  const [tab, setTab] = useState<'request' | 'response'>('request')

  const requestJson = log.requestPayload ? JSON.stringify(log.requestPayload, null, 2) : null
  const responseJson = log.responsePayload ? JSON.stringify(log.responsePayload, null, 2) : null

  const leadName = typeof log.leadId === 'object' ? log.leadId?.name : 'Unknown'
  const buyerName = typeof log.buyerId === 'object' ? log.buyerId?.name : 'Unknown'

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <div className="absolute inset-0 bg-black/30" />
      </div>
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-2xl border-l bg-background shadow-xl">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">Payload Inspector</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {leadName} → {buyerName} · Attempt {log.attempt}
              </p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="flex gap-4 border-b px-6 py-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Status: </span>
              <span className={log.status === 'success' ? 'text-emerald-600' : log.status === 'failed' ? 'text-red-600' : 'text-amber-600'}>{log.status}</span>
            </div>
            <div><span className="font-medium text-foreground">Provider: </span>{log.provider}</div>
            <div><span className="font-medium text-foreground">Duration: </span>{log.duration != null ? `${log.duration}ms` : '-'}</div>
            <div><span className="font-medium text-foreground">Response: </span>{log.responseCode || '-'}</div>
          </div>

          {log.error && (
            <div className="px-6 py-2 bg-red-50 dark:bg-red-950/30 border-b">
              <p className="text-xs font-medium text-red-600 dark:text-red-400">Error: {log.error}</p>
            </div>
          )}

          <div className="flex border-b">
            <button
              onClick={() => setTab('request')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === 'request' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
              }`}
            >
              Request Payload
            </button>
            <button
              onClick={() => setTab('response')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === 'response' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
              }`}
            >
              Response Payload
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {tab === 'request' ? (
              requestJson ? (
                <pre className="text-xs font-mono bg-muted rounded-lg p-4 overflow-x-auto min-h-[200px] whitespace-pre-wrap">{requestJson}</pre>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No request payload recorded</div>
              )
            ) : (
              responseJson ? (
                <pre className="text-xs font-mono bg-muted rounded-lg p-4 overflow-x-auto min-h-[200px] whitespace-pre-wrap">{responseJson}</pre>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No response payload recorded</div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  )
}

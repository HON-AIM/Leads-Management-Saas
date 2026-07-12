import { useState } from 'react'
import type { DeliveryLog } from '@/types/delivery'
import { X } from 'lucide-react'

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
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      </div>
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-2xl border-l border-white/[0.08] bg-[#0e1428] shadow-drawer animate-slide-in-right">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
            <div>
              <h2 className="text-[14px] font-semibold text-white">Payload Inspector</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {leadName} → {buyerName} · Attempt {log.attempt}
              </p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="flex gap-4 border-b border-white/[0.06] px-6 py-2.5 text-[12px] text-muted-foreground">
            <div>
              <span className="font-medium text-white/70">Status: </span>
              <span className={log.status === 'success' ? 'text-emerald-400' : log.status === 'failed' ? 'text-red-400' : 'text-amber-400'}>{log.status}</span>
            </div>
            <div><span className="font-medium text-white/70">Provider: </span>{log.provider}</div>
            <div><span className="font-medium text-white/70">Duration: </span>{log.duration != null ? `${log.duration}ms` : '-'}</div>
            <div><span className="font-medium text-white/70">Response: </span>{log.responseCode || '-'}</div>
          </div>

          {log.error && (
            <div className="px-6 py-2 bg-red-500/10 border-b border-white/[0.06]">
              <p className="text-[12px] font-medium text-red-400">Error: {log.error}</p>
            </div>
          )}

          <div className="flex border-b border-white/[0.06]">
            <button
              onClick={() => setTab('request')}
              className={`px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors ${
                tab === 'request' ? 'border-blue-500 text-white' : 'border-transparent text-muted-foreground hover:text-white/60'
              }`}
            >
              Request Payload
            </button>
            <button
              onClick={() => setTab('response')}
              className={`px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors ${
                tab === 'response' ? 'border-blue-500 text-white' : 'border-transparent text-muted-foreground hover:text-white/60'
              }`}
            >
              Response Payload
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {tab === 'request' ? (
              requestJson ? (
                <pre className="text-[11px] font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg p-4 overflow-x-auto min-h-[200px] whitespace-pre-wrap text-white/70">{requestJson}</pre>
              ) : (
                <div className="flex items-center justify-center h-full text-[12px] text-muted-foreground">No request payload recorded</div>
              )
            ) : (
              responseJson ? (
                <pre className="text-[11px] font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg p-4 overflow-x-auto min-h-[200px] whitespace-pre-wrap text-white/70">{responseJson}</pre>
              ) : (
                <div className="flex items-center justify-center h-full text-[12px] text-muted-foreground">No response payload recorded</div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  )
}

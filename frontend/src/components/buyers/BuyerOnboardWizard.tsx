import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'
import type { Buyer } from '@/types/buyer'
import type { Campaign } from '@/types/campaign'
import {
  ArrowLeft, ArrowRight, Send, Check, X as XIcon,
  Loader2, Zap, Building2, FileCheck, CheckCircle2,
  Circle, Globe, Settings2,
} from 'lucide-react'

interface BuyerOnboardWizardProps {
  onComplete: (buyerId: string) => void
  onCancel: () => void
}

interface TestSendResult {
  payloadSent: object
  statusCode: number
  responseBody: string
  success: boolean
  accepted: boolean
  acceptanceReason: string
  durationMs: number
}

interface CampaignAssignment {
  campaignId: string
  weight: number
  priority: number
}

const STEPS = ['Template', 'Details', 'Test', 'Campaigns', 'Review']

export function BuyerOnboardWizard({ onComplete, onCancel }: BuyerOnboardWizardProps) {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()

  const [step, setStep] = useState(0)
  const [sourceBuyerId, setSourceBuyerId] = useState<string>('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [url, setUrl] = useState('')
  const [testResult, setTestResult] = useState<TestSendResult | null>(null)
  const [testPassed, setTestPassed] = useState<boolean | null>(null)
  const [campaignAssignments, setCampaignAssignments] = useState<CampaignAssignment[]>([])

  const { data: buyersData } = useQuery<{ success: boolean; data: Buyer[] }>({
    queryKey: QUERY_KEYS.BUYERS,
    queryFn: async () => {
      const { data } = await api.get('/buyers', { params: { limit: 200 } })
      return data
    },
  })
  const buyers = buyersData?.data || []

  const { data: campaignsData } = useQuery<{ success: boolean; data: Campaign[] }>({
    queryKey: QUERY_KEYS.CAMPAIGNS,
    queryFn: async () => {
      const { data } = await api.get('/campaigns', { params: { limit: 200 } })
      return data
    },
  })
  const campaigns = campaignsData?.data || []

  useEffect(() => {
    if (!sourceBuyerId) return
    const source = buyers.find((b) => b._id === sourceBuyerId)
    if (source) {
      setName(`${source.name} (Copy)`)
      setEmail(source.email)
      setUrl('')
      setTestResult(null)
      setTestPassed(null)
    }
  }, [sourceBuyerId, buyers])

  const createBuyer = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/buyers', {
        name: name.trim() || 'New Buyer',
        email: email.trim(),
        phone: '',
        ghlUserId: '',
        weight: 1,
        priority: 0,
        allowedStates: [],
        leadCap: 0,
        dailyCap: 0,
        monthlyCap: 0,
        delivery: {
          provider: url.trim() ? 'webhook' : 'none',
          url: url.trim(),
          apiKey: '',
          locationId: '',
        },
      })
      return data.data
    },
  })

  const duplicateBuyer = useMutation({
    mutationFn: async (newBuyerId: string) => {
      const { data } = await api.post(`/buyers/${sourceBuyerId}/duplicate`, {
        name: name.trim(),
        email: email.trim(),
        url: url.trim(),
      })
      return data.data
    },
  })

  const saveTemplateMutation = useMutation({
    mutationFn: async ({ buyerId, template }: { buyerId: string; template: string }) => {
      await api.put(`/buyers/${buyerId}/payload-template`, { template })
    },
  })

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const buyerId = sourceBuyerId ? duplicateBuyer.data?._id : createBuyer.data?._id
      if (!buyerId) throw new Error('Buyer not created yet')

      let template = ''
      if (sourceBuyerId) {
        template = (await api.get(`/buyers/${sourceBuyerId}/payload-template`)).data.data?.template || ''
      } else {
        template = (await api.get(`/buyers/${buyerId}/payload-template`)).data.data?.template || ''
      }

      try {
        const { data } = await api.post(`/buyers/${buyerId}/payload-template/test-send`, { template })
        return data.data ?? data
      } catch (err: any) {
        return {
          payloadSent: {},
          statusCode: 0,
          responseBody: err?.response?.data?.error || err.message || 'Connection failed',
          success: false,
          accepted: false,
          acceptanceReason: err?.response?.data?.error || err.message || 'Connection failed',
          durationMs: 0,
        }
      }
    },
    onSuccess: (result: TestSendResult) => {
      setTestResult(result)
      setTestPassed(result.success || (result.statusCode >= 200 && result.statusCode < 300))
    },
  })

  const assignCampaigns = useMutation({
    mutationFn: async ({ buyerId }: { buyerId: string }) => {
      for (const ca of campaignAssignments) {
        await api.post(`/campaigns/${ca.campaignId}/buyers`, {
          buyerId,
          weight: ca.weight,
          priority: ca.priority,
        })
      }
    },
  })

  const activateBuyer = useMutation({
    mutationFn: async (buyerId: string) => {
      const { data } = await api.patch(`/buyers/${buyerId}/status`, { status: 'active' })
      return data.data
    },
  })

  const sourceBuyer = sourceBuyerId ? buyers.find((b) => b._id === sourceBuyerId) : null

  const canProceed = () => {
    if (step === 0) return true
    if (step === 1) return name.trim().length > 0 && email.trim().length > 0
    if (step === 2) return testPassed === true
    return true
  }

  const handleNext = async () => {
    if (step === 0 && sourceBuyerId) {
      setStep(1)
      return
    }
    if (step === 0 && !sourceBuyerId) {
      setStep(1)
      return
    }
    if (step === 1) {
      try {
        if (sourceBuyerId) {
          await duplicateBuyer.mutateAsync(sourceBuyerId)
        } else {
          await createBuyer.mutateAsync()
        }
        setStep(2)
      } catch (err: any) {
        addNotification({
          type: 'error',
          title: 'Creation failed',
          description: err?.response?.data?.error || err.message || 'Failed to create buyer',
        })
      }
      return
    }
    if (step === 2) {
      setStep(3)
      return
    }
    if (step === 3) {
      setStep(4)
      return
    }
    if (step === 4) {
      try {
        const buyerId = sourceBuyerId ? duplicateBuyer.data?._id : createBuyer.data?._id
        if (!buyerId) throw new Error('No buyer ID')

        if (campaignAssignments.length > 0) {
          await assignCampaigns.mutateAsync({ buyerId })
        }

        await activateBuyer.mutateAsync(buyerId)

        qc.invalidateQueries({ queryKey: QUERY_KEYS.BUYERS })
        qc.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS })

        addNotification({
          type: 'success',
          title: 'Buyer onboarded',
          description: `${name} is active and ready to receive leads`,
        })

        onComplete(buyerId)
      } catch (err: any) {
        addNotification({
          type: 'error',
          title: 'Failed to activate',
          description: err?.response?.data?.error || err.message || 'Could not activate buyer',
        })
      }
    }
  }

  const handleTestConnection = () => {
    testConnectionMutation.mutate()
  }

  const toggleCampaign = (campaignId: string) => {
    setCampaignAssignments((prev) => {
      const exists = prev.find((ca) => ca.campaignId === campaignId)
      if (exists) return prev.filter((ca) => ca.campaignId !== campaignId)
      return [...prev, { campaignId, weight: 1, priority: 0 }]
    })
  }

  const newBuyerId = sourceBuyerId ? duplicateBuyer.data?._id : createBuyer.data?._id

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-white tracking-tight">Onboard New Buyer</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Set up a new sub-account buyer in under a minute</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-white/[0.08]'}`} />
            <p className={`text-[10px] mt-1 ${i === step ? 'text-white font-medium' : i < step ? 'text-blue-400' : 'text-muted-foreground'}`}>{s}</p>
          </div>
        ))}
      </div>

      {/* Step 1: Template */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground">
            Start from an existing buyer's configuration or set up from scratch.
          </p>

          <div
            onClick={() => setSourceBuyerId('')}
            className={`rounded-xl border p-4 cursor-pointer transition-all ${
              !sourceBuyerId
                ? 'border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/20'
                : 'border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.02]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${!sourceBuyerId ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.05] text-muted-foreground'}`}>
                <Zap size={18} />
              </div>
              <div>
                <p className="text-[13px] font-medium text-white">Start from scratch</p>
                <p className="text-[11px] text-muted-foreground">Configure everything manually</p>
              </div>
            </div>
          </div>

          {buyers.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Clone from existing buyer</p>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {buyers.map((b) => (
                  <div
                    key={b._id}
                    onClick={() => setSourceBuyerId(b._id)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      sourceBuyerId === b._id
                        ? 'border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/20'
                        : 'border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.05]">
                          <Building2 size={16} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-white">{b.name}</p>
                          <p className="text-[11px] text-muted-foreground">{b.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {b.delivery?.provider !== 'none' && (
                          <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium bg-emerald-500/10 text-emerald-400">
                            {b.delivery.provider === 'ghl' ? 'GHL' : 'Webhook'}
                          </span>
                        )}
                        {sourceBuyerId === b._id && (
                          <Check size={16} className="text-blue-400 mt-1 ml-auto" />
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2 ml-[52px]">
                      {b.allowedStates.length > 0 && (
                        <span className="text-[10px] text-muted-foreground/70">{b.allowedStates.length} states</span>
                      )}
                      {b.dailyCap > 0 && (
                        <span className="text-[10px] text-muted-foreground/70">{b.dailyCap}/day</span>
                      )}
                      {b.minimumScore != null && (
                        <span className="text-[10px] text-muted-foreground/70">min {b.minimumScore}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Details */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground">
            Enter the buyer's information. {sourceBuyer ? `Settings from "${sourceBuyer.name}" will be cloned.` : 'Configure everything from scratch.'}
          </p>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Buyer Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John's Insurance Leads"
                className="text-white"
              />
              <p className="text-[10px] text-muted-foreground/60">Internal display name</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px]">Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="buyer@example.com"
                className="text-white"
              />
              <p className="text-[10px] text-muted-foreground/60">Contact email for this buyer</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px]">Webhook URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://their-sub-account.webhook.site/abc123"
                className="font-mono text-[12px] text-white"
              />
              <p className="text-[10px] text-muted-foreground/60">
                The sub-account's delivery webhook. {sourceBuyer?.delivery?.url ? `Source buyer has: ${sourceBuyer.delivery.url}` : 'Leave blank if delivery is managed externally.'}
              </p>
            </div>
          </div>

          {sourceBuyer && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
              <p className="text-[11px] text-blue-300/80 font-medium">Will be cloned from "{sourceBuyer.name}":</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {sourceBuyer.delivery?.payloadTemplate && (
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400">Payload Template</span>
                )}
                {sourceBuyer.delivery?.acceptanceRule?.enabled && (
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400">Acceptance Rule</span>
                )}
                {sourceBuyer.delivery?.provider !== 'none' && (
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400">Provider: {sourceBuyer.delivery.provider}</span>
                )}
                {sourceBuyer.allowedStates.length > 0 && (
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400">States ({sourceBuyer.allowedStates.length})</span>
                )}
                {(sourceBuyer.dailyCap > 0 || sourceBuyer.monthlyCap > 0) && (
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400">Caps</span>
                )}
                {sourceBuyer.minimumScore != null && (
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400">Min Score: {sourceBuyer.minimumScore}</span>
                )}
                {sourceBuyer.schedule?.enabled && (
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400">Schedule</span>
                )}
                {sourceBuyer.weight !== 1 && (
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400">Weight: {sourceBuyer.weight}</span>
                )}
                {sourceBuyer.priority !== 0 && (
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400">Priority: {sourceBuyer.priority}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Test Connection */}
      {step === 2 && (
        <div className="space-y-4">
          {url.trim() ? (
            <>
              <p className="text-[13px] text-muted-foreground">
                Verify the webhook URL is correct before creating the buyer.
              </p>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[13px] font-medium text-white">Target Webhook</p>
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5 break-all">{url}</p>
                  </div>
                  {testPassed === true && (
                    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-400">
                      <CheckCircle2 size={13} /> Passed
                    </span>
                  )}
                  {testPassed === false && (
                    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium bg-red-500/10 text-red-400">
                      <XIcon size={13} /> Failed
                    </span>
                  )}
                </div>

                <Button
                  onClick={handleTestConnection}
                  disabled={testConnectionMutation.isPending}
                  variant={testPassed === true ? 'outline' : 'cta'}
                  size="sm"
                >
                  {testConnectionMutation.isPending ? (
                    <><Loader2 size={13} className="mr-1.5 animate-spin" /> Sending test payload...</>
                  ) : testPassed === true ? (
                    <><Send size={13} className="mr-1.5" /> Retest</>
                  ) : (
                    <><Send size={13} className="mr-1.5" /> Send Test Payload</>
                  )}
                </Button>

                {testResult && (
                  <div className="mt-4 rounded-lg border border-white/[0.08] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        {testResult.success ? (
                          <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                            <Check size={13} /> Connection successful
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[11px] font-medium text-red-400">
                            <XIcon size={13} /> Connection failed
                          </span>
                        )}
                        {testResult.statusCode > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            HTTP {testResult.statusCode} · {testResult.durationMs}ms
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {testResult.acceptanceReason && (
                        <div className={`rounded-md px-2.5 py-1.5 text-[10px] ${
                          testResult.success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
                        }`}>
                          {testResult.acceptanceReason}
                        </div>
                      )}
                      {testResult.payloadSent && Object.keys(testResult.payloadSent).length > 0 && (
                        <div>
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Payload Sent</p>
                          <pre className="font-mono text-[10px] text-white/60 whitespace-pre-wrap max-h-24 overflow-auto">
                            {JSON.stringify(testResult.payloadSent, null, 2)}
                          </pre>
                        </div>
                      )}
                      {testResult.responseBody && (
                        <div>
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Response</p>
                          <pre className="font-mono text-[10px] text-white/60 whitespace-pre-wrap max-h-24 overflow-auto">
                            {testResult.responseBody?.slice(0, 500) || '(empty)'}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <p className="text-[11px] text-amber-300/80">
                  <strong className="text-amber-200">Tip:</strong> Use a <a href="https://webhook.site" target="_blank" rel="noopener noreferrer" className="underline text-amber-400 hover:text-amber-300">webhook.site</a> URL during testing. It will show the received payload in real time.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">
                No webhook URL was entered. You can test the connection later from the buyer's Payload tab.
              </p>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
                <Globe size={28} className="text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-[13px] text-white/60">No webhook URL to test</p>
                <p className="text-[11px] text-muted-foreground mt-1">The buyer will be created with delivery provider set to "none".</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Campaigns */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground">
            Optionally assign this buyer to existing campaigns. They'll be added as inactive until activated.
          </p>

          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.12] p-8 text-center">
              <p className="text-[13px] text-muted-foreground">No campaigns exist yet</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">You can assign campaigns later from the campaign workspace</p>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => {
                const selected = campaignAssignments.find((ca) => ca.campaignId === c._id)
                return (
                  <div
                    key={c._id}
                    onClick={() => toggleCampaign(c._id)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      selected
                        ? 'border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/20'
                        : 'border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selected ? 'bg-blue-500/20' : 'bg-white/[0.05]'}`}>
                          {selected ? <CheckCircle2 size={14} className="text-blue-400" /> : <Circle size={14} className="text-muted-foreground/50" />}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-white">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">{c.routingMode?.replace('_', ' ') || 'round_robin'}</p>
                        </div>
                      </div>
                      {selected && (
                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Weight</span>
                            <Input
                              type="number"
                              min={1}
                              value={selected.weight}
                              onChange={(e) => setCampaignAssignments((prev) =>
                                prev.map((ca) => ca.campaignId === c._id ? { ...ca, weight: Number(e.target.value) } : ca)
                              )}
                              className="w-16 h-7 text-[11px] text-white"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Priority</span>
                            <Input
                              type="number"
                              min={0}
                              value={selected.priority}
                              onChange={(e) => setCampaignAssignments((prev) =>
                                prev.map((ca) => ca.campaignId === c._id ? { ...ca, priority: Number(e.target.value) } : ca)
                              )}
                              className="w-16 h-7 text-[11px] text-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 5: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground">
            Review everything. Click "Create & Activate" to finish.
          </p>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.06]">
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Buyer Info</p>
              <div className="grid grid-cols-2 gap-3">
                <ReviewItem label="Name" value={name || '—'} />
                <ReviewItem label="Email" value={email || '—'} />
                <ReviewItem label="Status" value="Active" badge />
                <ReviewItem label="Webhook" value={url || 'Not set'} mono />
              </div>
            </div>

            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {sourceBuyer ? `Cloned from "${sourceBuyer.name}"` : 'Settings'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <ReviewItem
                  label="Provider"
                  value={sourceBuyer?.delivery?.provider === 'webhook' ? 'Webhook' : sourceBuyer?.delivery?.provider === 'ghl' ? 'GHL' : url.trim() ? 'Webhook' : 'None'}
                />
                <ReviewItem label="Weight" value={String(sourceBuyer?.weight ?? 1)} />
                <ReviewItem label="Priority" value={String(sourceBuyer?.priority ?? 0)} />
                <ReviewItem
                  label="Daily Cap"
                  value={sourceBuyer?.dailyCap ? String(sourceBuyer.dailyCap) : 'Unlimited'}
                />
                <ReviewItem
                  label="Monthly Cap"
                  value={sourceBuyer?.monthlyCap ? String(sourceBuyer.monthlyCap) : 'Unlimited'}
                />
                <ReviewItem
                  label="Total Cap"
                  value={sourceBuyer?.leadCap ? String(sourceBuyer.leadCap) : 'Unlimited'}
                />
                <ReviewItem
                  label="States"
                  value={sourceBuyer?.allowedStates?.length ? `${sourceBuyer.allowedStates.length} states` : 'All states'}
                />
                <ReviewItem
                  label="Min Score"
                  value={sourceBuyer?.minimumScore != null ? String(sourceBuyer.minimumScore) : 'No minimum'}
                />
                <ReviewItem
                  label="Payload Template"
                  value={sourceBuyer?.delivery?.payloadTemplate ? 'Custom' : 'Default'}
                />
                <ReviewItem
                  label="Acceptance Rule"
                  value={sourceBuyer?.delivery?.acceptanceRule?.enabled ? 'Active' : 'Disabled'}
                />
                <ReviewItem
                  label="Schedule"
                  value={sourceBuyer?.schedule?.enabled ? 'Enabled' : 'Disabled'}
                />
              </div>
            </div>

            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Campaigns</p>
              {campaignAssignments.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">No campaigns assigned</p>
              ) : (
                <div className="space-y-2">
                  {campaignAssignments.map((ca) => {
                    const c = campaigns.find((cam) => cam._id === ca.campaignId)
                    return (
                      <div key={ca.campaignId} className="flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2">
                        <span className="text-[12px] text-white/80">{c?.name || 'Unknown'}</span>
                        <div className="flex gap-3">
                          {ca.weight !== 1 && <span className="text-[10px] text-muted-foreground">W: {ca.weight}</span>}
                          {ca.priority !== 0 && <span className="text-[10px] text-muted-foreground">P: {ca.priority}</span>}
                          <span className="text-[10px] text-muted-foreground">inactive</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <p className="text-[11px] text-emerald-300/80">
              <strong className="text-emerald-200">After creation:</strong> The buyer will be active and ready to receive leads immediately.
              {campaignAssignments.length > 0 && ` It will be added to ${campaignAssignments.length} campaign(s) as inactive — activate it from the campaign workspace when ready.`}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => step > 0 ? setStep(step - 1) : onCancel()}
          disabled={step === 0 && !sourceBuyerId}
        >
          <ArrowLeft size={13} className="mr-1.5" />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>

        <div className="flex gap-2">
          {step < 4 ? (
            <Button
              size="sm"
              onClick={handleNext}
              disabled={!canProceed() || createBuyer.isPending || duplicateBuyer.isPending || testConnectionMutation.isPending}
              variant="cta"
            >
              {createBuyer.isPending || duplicateBuyer.isPending ? (
                <><Loader2 size={13} className="mr-1.5 animate-spin" /> Creating...</>
              ) : step === 2 && url.trim() ? (
                testPassed === true ? (
                  <>Next <ArrowRight size={13} className="ml-1.5" /></>
                ) : (
                  <><Send size={13} className="mr-1.5" /> Test & Continue</>
                )
              ) : (
                <>Next <ArrowRight size={13} className="ml-1.5" /></>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleNext}
              disabled={activateBuyer.isPending || assignCampaigns.isPending}
              variant="cta"
            >
              {activateBuyer.isPending || assignCampaigns.isPending ? (
                <><Loader2 size={13} className="mr-1.5 animate-spin" /> Activating...</>
              ) : (
                <><CheckCircle2 size={13} className="mr-1.5" /> Create & Activate</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewItem({ label, value, badge, mono }: { label: string; value: string; badge?: boolean; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground/70">{label}</p>
      <p className={`text-[12px] font-medium ${mono ? 'font-mono text-white/70' : badge ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

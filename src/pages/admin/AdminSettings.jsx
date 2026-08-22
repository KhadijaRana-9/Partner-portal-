import { useEffect, useState } from 'react'
import { Percent, Wallet, CreditCard, Landmark, RefreshCw } from 'lucide-react'
import { adminSettingsService } from '@/services/adminSettingsService'
import { useToast } from '@/context/ToastContext'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Label, Input, Textarea } from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { CardSkeleton } from '@/components/ui/Skeleton'

const emptyPaymentDraft = { jazzcashAccount: '', easypaisaAccount: '', bankDetails: '', cryptoDetails: '', cashInstructions: '' }
const emptyPartnerDraft = {
  enabled: false, minInvestment: '', maxInvestment: '', noMax: true,
  profitCalculationType: 'manual', profitRatePercentage: '', profitFrequency: 'weekly',
  allowPrincipalWithdrawal: true, allowProfitOnlyWithdrawal: true, withdrawalFeePercentage: '',
}

export default function AdminSettings() {
  const { toast } = useToast()
  const [levels, setLevels] = useState(null)
  const [levelDraft, setLevelDraft] = useState({})
  const [savingLevels, setSavingLevels] = useState(false)

  const [settings, setSettings] = useState(null)
  const [settingsDraft, setSettingsDraft] = useState({ minWithdrawal: '', maxWithdrawal: '', noMax: true, withdrawalFeePercentage: '' })
  const [savingSettings, setSavingSettings] = useState(false)

  const [paymentDraft, setPaymentDraft] = useState(emptyPaymentDraft)
  const [savingPayment, setSavingPayment] = useState(false)

  const [partnerSettings, setPartnerSettings] = useState(null)
  const [partnerDraft, setPartnerDraft] = useState(emptyPartnerDraft)
  const [savingPartner, setSavingPartner] = useState(false)
  const [runningCycle, setRunningCycle] = useState(false)

  useEffect(() => {
    adminSettingsService.getCommissionLevels().then((ls) => {
      setLevels(ls)
      const draft = {}
      ls.forEach((l) => (draft[l.level] = String(l.percentage)))
      setLevelDraft(draft)
    })
    adminSettingsService.getPlatformSettings().then((s) => {
      setSettings(s)
      setSettingsDraft({
        minWithdrawal: String(s.minWithdrawal),
        maxWithdrawal: s.maxWithdrawal !== null ? String(s.maxWithdrawal) : '',
        noMax: s.maxWithdrawal === null,
        withdrawalFeePercentage: String(s.withdrawalFeePercentage),
      })
      setPaymentDraft({
        jazzcashAccount: s.jazzcashAccount || '',
        easypaisaAccount: s.easypaisaAccount || '',
        bankDetails: s.bankDetails || '',
        cryptoDetails: s.cryptoDetails || '',
        cashInstructions: s.cashInstructions || '',
      })
    })
    adminSettingsService.getPartnerSettings().then((p) => {
      setPartnerSettings(p)
      setPartnerDraft({
        enabled: p.enabled,
        minInvestment: String(p.minInvestment),
        maxInvestment: p.maxInvestment !== null ? String(p.maxInvestment) : '',
        noMax: p.maxInvestment === null,
        profitCalculationType: p.profitCalculationType,
        profitRatePercentage: String(p.profitRatePercentage),
        profitFrequency: p.profitFrequency,
        allowPrincipalWithdrawal: p.allowPrincipalWithdrawal,
        allowProfitOnlyWithdrawal: p.allowProfitOnlyWithdrawal,
        withdrawalFeePercentage: String(p.withdrawalFeePercentage),
      })
    })
  }, [])

  async function savePayment(e) {
    e.preventDefault()
    setSavingPayment(true)
    try {
      const fresh = await adminSettingsService.updatePlatformSettings(paymentDraft)
      setSettings(fresh)
      toast({ title: 'Payment accounts saved', description: 'Checkout now shows these details for manual payment methods.' })
    } catch (err) {
      toast({ title: 'Could not save payment accounts', description: err.message, variant: 'error' })
    } finally {
      setSavingPayment(false)
    }
  }

  async function savePartnerSettings(e) {
    e.preventDefault()
    setSavingPartner(true)
    try {
      const fields = {
        enabled: partnerDraft.enabled,
        minInvestment: Number(partnerDraft.minInvestment) || 0,
        maxInvestment: partnerDraft.noMax ? null : Number(partnerDraft.maxInvestment) || 0,
        profitCalculationType: partnerDraft.profitCalculationType,
        profitRatePercentage: Number(partnerDraft.profitRatePercentage) || 0,
        profitFrequency: partnerDraft.profitFrequency,
        allowPrincipalWithdrawal: partnerDraft.allowPrincipalWithdrawal,
        allowProfitOnlyWithdrawal: partnerDraft.allowProfitOnlyWithdrawal,
        withdrawalFeePercentage: Number(partnerDraft.withdrawalFeePercentage) || 0,
      }
      const fresh = await adminSettingsService.updatePartnerSettings(fields)
      setPartnerSettings(fresh)
      toast({ title: 'Partner investment settings saved' })
    } catch (err) {
      toast({ title: 'Could not save partner settings', description: err.message, variant: 'error' })
    } finally {
      setSavingPartner(false)
    }
  }

  async function runProfitCycle() {
    setRunningCycle(true)
    try {
      const count = await adminSettingsService.runPartnerProfitCycle()
      toast({
        title: count > 0 ? `Profit posted to ${count} investment${count === 1 ? '' : 's'}` : 'No profit posted',
        description: count > 0 ? undefined : 'Enable fixed-percentage mode with a rate above 0% to run an automatic cycle.',
      })
    } catch (err) {
      toast({ title: 'Could not run profit cycle', description: err.message, variant: 'error' })
    } finally {
      setRunningCycle(false)
    }
  }

  async function saveLevels(e) {
    e.preventDefault()
    setSavingLevels(true)
    try {
      await Promise.all(levels.map((l) => adminSettingsService.updateCommissionLevel(l.level, Number(levelDraft[l.level]))))
      const fresh = await adminSettingsService.getCommissionLevels()
      setLevels(fresh)
      toast({ title: 'Commission levels saved', description: 'Every page reading getCommissionLevels() now reflects the new percentages.' })
    } catch (err) {
      toast({ title: 'Could not save commission levels', description: err.message, variant: 'error' })
    } finally {
      setSavingLevels(false)
    }
  }

  async function saveSettings(e) {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const fields = {
        minWithdrawal: Number(settingsDraft.minWithdrawal) || 0,
        maxWithdrawal: settingsDraft.noMax ? null : Number(settingsDraft.maxWithdrawal) || 0,
        withdrawalFeePercentage: Number(settingsDraft.withdrawalFeePercentage) || 0,
      }
      const fresh = await adminSettingsService.updatePlatformSettings(fields)
      setSettings(fresh)
      toast({ title: 'Withdrawal rules saved', description: 'Applied immediately to new withdrawal requests platform-wide.' })
    } catch (err) {
      toast({ title: 'Could not save withdrawal rules', description: err.message, variant: 'error' })
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="The single source of truth for commission percentages and withdrawal rules — every other page reads these values live."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><Percent className="h-4 w-4 text-brand-600" />Commission Levels</CardTitle>
              <CardDescription>Percentage of order subtotal paid to each of the 5 upline levels.</CardDescription>
            </div>
          </CardHeader>
          {!levels ? (
            <CardContent><CardSkeleton className="h-48 border-0 p-0" /></CardContent>
          ) : (
            <form onSubmit={saveLevels}>
              <CardContent className="space-y-3">
                {levels.map((l) => (
                  <div key={l.level} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">L{l.level}</span>
                    <Label htmlFor={`level-${l.level}`} className="mb-0 w-24 shrink-0">Level {l.level}</Label>
                    <Input
                      id={`level-${l.level}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={levelDraft[l.level] ?? ''}
                      onChange={(e) => setLevelDraft((d) => ({ ...d, [l.level]: e.target.value }))}
                      className="max-w-[120px]"
                    />
                    <span className="text-sm text-ink-500">%</span>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="submit" loading={savingLevels}>Save commission levels</Button>
              </CardFooter>
            </form>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" />Withdrawal Rules</CardTitle>
              <CardDescription>Minimum/maximum request amounts and the platform fee.</CardDescription>
            </div>
          </CardHeader>
          {!settings ? (
            <CardContent><CardSkeleton className="h-48 border-0 p-0" /></CardContent>
          ) : (
            <form onSubmit={saveSettings}>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="min-withdrawal">Minimum withdrawal (PKR)</Label>
                  <Input
                    id="min-withdrawal"
                    type="number"
                    min="0"
                    value={settingsDraft.minWithdrawal}
                    onChange={(e) => setSettingsDraft((d) => ({ ...d, minWithdrawal: e.target.value }))}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="max-withdrawal" className="mb-0">Maximum withdrawal (PKR)</Label>
                    <label className="flex items-center gap-1.5 text-xs text-ink-500">
                      <input
                        type="checkbox"
                        checked={settingsDraft.noMax}
                        onChange={(e) => setSettingsDraft((d) => ({ ...d, noMax: e.target.checked }))}
                        className="h-3.5 w-3.5 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                      />
                      No maximum
                    </label>
                  </div>
                  <Input
                    id="max-withdrawal"
                    type="number"
                    min="0"
                    disabled={settingsDraft.noMax}
                    value={settingsDraft.maxWithdrawal}
                    onChange={(e) => setSettingsDraft((d) => ({ ...d, maxWithdrawal: e.target.value }))}
                    className="mt-1.5"
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <Label htmlFor="fee-pct">Withdrawal fee (%)</Label>
                  <Input
                    id="fee-pct"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settingsDraft.withdrawalFeePercentage}
                    onChange={(e) => setSettingsDraft((d) => ({ ...d, withdrawalFeePercentage: e.target.value }))}
                  />
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="submit" loading={savingSettings}>Save withdrawal rules</Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-brand-600" />Payment Accounts</CardTitle>
              <CardDescription>Shown to customers at checkout for each manual payment method. Never hardcoded in the storefront.</CardDescription>
            </div>
          </CardHeader>
          {!settings ? (
            <CardContent><CardSkeleton className="h-64 border-0 p-0" /></CardContent>
          ) : (
            <form onSubmit={savePayment}>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="jazzcash">JazzCash account</Label>
                  <Input id="jazzcash" value={paymentDraft.jazzcashAccount} onChange={(e) => setPaymentDraft((d) => ({ ...d, jazzcashAccount: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="easypaisa">Easypaisa account</Label>
                  <Input id="easypaisa" value={paymentDraft.easypaisaAccount} onChange={(e) => setPaymentDraft((d) => ({ ...d, easypaisaAccount: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="bank">Bank details</Label>
                  <Input id="bank" value={paymentDraft.bankDetails} onChange={(e) => setPaymentDraft((d) => ({ ...d, bankDetails: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="crypto">Crypto wallet / details</Label>
                  <Input id="crypto" value={paymentDraft.cryptoDetails} onChange={(e) => setPaymentDraft((d) => ({ ...d, cryptoDetails: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="cash">Cash payment instructions</Label>
                  <Textarea id="cash" rows={2} value={paymentDraft.cashInstructions} onChange={(e) => setPaymentDraft((d) => ({ ...d, cashInstructions: e.target.value }))} />
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="submit" loading={savingPayment}>Save payment accounts</Button>
              </CardFooter>
            </form>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><Landmark className="h-4 w-4 text-brand-600" />Partner Investment Settings</CardTitle>
              <CardDescription>
                No profit formula was specified in the requirements — every value below defaults to disabled/zero.
                Configure real terms here before affiliates can apply.
              </CardDescription>
            </div>
          </CardHeader>
          {!partnerSettings ? (
            <CardContent><CardSkeleton className="h-64 border-0 p-0" /></CardContent>
          ) : (
            <form onSubmit={savePartnerSettings}>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={partnerDraft.enabled}
                    onChange={(e) => setPartnerDraft((d) => ({ ...d, enabled: e.target.checked }))}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                  />
                  Partner investment program enabled
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="min-inv">Minimum investment (PKR)</Label>
                    <Input id="min-inv" type="number" min="0" value={partnerDraft.minInvestment} onChange={(e) => setPartnerDraft((d) => ({ ...d, minInvestment: e.target.value }))} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="max-inv" className="mb-0">Maximum investment</Label>
                      <label className="flex items-center gap-1.5 text-xs text-ink-500">
                        <input
                          type="checkbox"
                          checked={partnerDraft.noMax}
                          onChange={(e) => setPartnerDraft((d) => ({ ...d, noMax: e.target.checked }))}
                          className="h-3.5 w-3.5 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                        />
                        None
                      </label>
                    </div>
                    <Input
                      id="max-inv" type="number" min="0" disabled={partnerDraft.noMax}
                      value={partnerDraft.maxInvestment} onChange={(e) => setPartnerDraft((d) => ({ ...d, maxInvestment: e.target.value }))}
                      className="mt-1.5" placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="calc-type">Profit calculation type</Label>
                  <Select id="calc-type" value={partnerDraft.profitCalculationType} onChange={(e) => setPartnerDraft((d) => ({ ...d, profitCalculationType: e.target.value }))}>
                    <option value="manual">Manual — admin posts each profit entry by hand</option>
                    <option value="fixed_percentage">Fixed percentage — auto-post per period at a configured rate</option>
                  </Select>
                </div>

                {partnerDraft.profitCalculationType === 'fixed_percentage' && (
                  <div className="grid grid-cols-2 gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3">
                    <div>
                      <Label htmlFor="rate">Profit rate (%)</Label>
                      <Input id="rate" type="number" min="0" step="0.01" value={partnerDraft.profitRatePercentage} onChange={(e) => setPartnerDraft((d) => ({ ...d, profitRatePercentage: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="freq">Frequency</Label>
                      <Select id="freq" value={partnerDraft.profitFrequency} onChange={(e) => setPartnerDraft((d) => ({ ...d, profitFrequency: e.target.value }))}>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </Select>
                    </div>
                    <p className="col-span-2 text-xs text-warning-800">
                      Rate stays at 0% (no-op) until set to a real, business-approved value.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-ink-700">
                    <input type="checkbox" checked={partnerDraft.allowPrincipalWithdrawal} onChange={(e) => setPartnerDraft((d) => ({ ...d, allowPrincipalWithdrawal: e.target.checked }))} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
                    Allow whole-amount withdrawal
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ink-700">
                    <input type="checkbox" checked={partnerDraft.allowProfitOnlyWithdrawal} onChange={(e) => setPartnerDraft((d) => ({ ...d, allowProfitOnlyWithdrawal: e.target.checked }))} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
                    Allow profit-only withdrawal
                  </label>
                </div>

                <div>
                  <Label htmlFor="partner-fee">Partner withdrawal fee (%)</Label>
                  <Input id="partner-fee" type="number" min="0" step="0.1" value={partnerDraft.withdrawalFeePercentage} onChange={(e) => setPartnerDraft((d) => ({ ...d, withdrawalFeePercentage: e.target.value }))} />
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button type="button" variant="secondary" onClick={runProfitCycle} loading={runningCycle}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Run profit cycle now
                </Button>
                <Button type="submit" loading={savingPartner}>Save partner settings</Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

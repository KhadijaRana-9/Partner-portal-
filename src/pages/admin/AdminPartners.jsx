import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Landmark, Check, X, Banknote, TrendingUp, AlertCircle } from 'lucide-react'
import { adminPartnerService } from '@/services/adminPartnerService'
import { useToast } from '@/context/ToastContext'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Tabs from '@/components/ui/Tabs'
import { Label, Input, Textarea, FieldError } from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/Skeleton'
import WithdrawalStatusBadge from '@/components/wallet/WithdrawalStatusBadge'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'

const INVESTMENT_STATUS_VARIANT = { pending: 'warning', active: 'success', closed: 'neutral', rejected: 'danger' }

const WITHDRAWAL_ACTIONS_BY_STATUS = {
  pending: [
    { label: 'Approve', nextStatus: 'approved', variant: 'primary', icon: Check },
    { label: 'Reject', nextStatus: 'rejected', variant: 'dangerOutline', icon: X, requireNote: true },
  ],
  approved: [
    { label: 'Mark Paid', nextStatus: 'paid', variant: 'primary', icon: Banknote },
    { label: 'Reject', nextStatus: 'rejected', variant: 'dangerOutline', icon: X, requireNote: true },
  ],
}

export default function AdminPartners() {
  const { toast } = useToast()
  const [tab, setTab] = useState('applications')

  const [investments, setInvestments] = useState(null)
  const [withdrawals, setWithdrawals] = useState(null)

  const [reviewTarget, setReviewTarget] = useState(null) // { investment, decision: 'active'|'rejected' }
  const [reviewNote, setReviewNote] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewing, setReviewing] = useState(false)

  const [profitTarget, setProfitTarget] = useState(null) // investment
  const [profitAmount, setProfitAmount] = useState('')
  const [profitDate, setProfitDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [profitNote, setProfitNote] = useState('')
  const [profitError, setProfitError] = useState('')
  const [postingProfit, setPostingProfit] = useState(false)

  const [wdAction, setWdAction] = useState(null) // { withdrawal, action }
  const [wdNote, setWdNote] = useState('')
  const [wdError, setWdError] = useState('')
  const [wdBusyId, setWdBusyId] = useState(null)

  function refreshInvestments() {
    adminPartnerService.listInvestments({ pageSize: 100 }).then((r) => setInvestments(r.items))
  }
  function refreshWithdrawals() {
    adminPartnerService.listWithdrawals({ pageSize: 100 }).then((r) => setWithdrawals(r.items))
  }

  useEffect(() => {
    refreshInvestments()
    refreshWithdrawals()
  }, [])

  const pending = (investments || []).filter((i) => i.status === 'pending')
  const nonPending = (investments || []).filter((i) => i.status !== 'pending')

  async function confirmReview() {
    if (!reviewTarget) return
    if (reviewTarget.decision === 'rejected' && !reviewNote.trim()) {
      setReviewError('A reason is required.')
      return
    }
    setReviewing(true)
    try {
      await adminPartnerService.setInvestmentStatus(reviewTarget.investment.id, reviewTarget.decision, reviewNote.trim() || undefined)
      toast({ title: `Application ${reviewTarget.decision}`, description: reviewTarget.investment.affiliateName })
      setReviewTarget(null)
      setReviewNote('')
      refreshInvestments()
    } catch (err) {
      setReviewError(err.message)
    } finally {
      setReviewing(false)
    }
  }

  async function submitProfit() {
    const amount = Number(profitAmount)
    if (!amount || amount <= 0) {
      setProfitError('Enter a valid amount.')
      return
    }
    setPostingProfit(true)
    try {
      await adminPartnerService.postProfit(profitTarget.id, amount, profitDate, profitNote.trim() || undefined)
      toast({ title: 'Profit posted', description: `${formatCurrency(amount, 'PKR')} added to ${profitTarget.affiliateName}'s investment.` })
      setProfitTarget(null)
      setProfitAmount('')
      setProfitNote('')
      refreshInvestments()
    } catch (err) {
      setProfitError(err.message)
    } finally {
      setPostingProfit(false)
    }
  }

  async function runWdAction(withdrawal, action, note) {
    setWdBusyId(withdrawal.id)
    try {
      await adminPartnerService.setWithdrawalStatus(withdrawal.id, action.nextStatus, note || undefined)
      toast({ title: `Withdrawal ${action.nextStatus}` })
      refreshWithdrawals()
      refreshInvestments()
      return true
    } catch (err) {
      toast({ title: 'Could not update withdrawal', description: err.message, variant: 'error' })
      return false
    } finally {
      setWdBusyId(null)
    }
  }

  function handleWdClick(withdrawal, action) {
    if (action.requireNote) {
      setWdAction({ withdrawal, action })
      setWdNote('')
      setWdError('')
    } else {
      runWdAction(withdrawal, action)
    }
  }

  async function confirmWdAction() {
    if (!wdAction) return
    if (wdAction.action.requireNote && !wdNote.trim()) {
      setWdError('A reason is required.')
      return
    }
    const ok = await runWdAction(wdAction.withdrawal, wdAction.action, wdNote.trim())
    if (ok) setWdAction(null)
  }

  return (
    <div>
      <PageHeader
        title="Partner Investments"
        description="A separate module from the affiliate referral program — investment applications, profit ledger and withdrawals."
        actions={<Link to="/super-admin/settings"><Button variant="secondary">Program Settings</Button></Link>}
      />

      <Tabs
        tabs={[
          { value: 'applications', label: 'Applications', count: pending.length },
          { value: 'investments', label: 'Investments', count: nonPending.length },
          { value: 'withdrawals', label: 'Withdrawals', count: (withdrawals || []).length },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-4"
      />

      {tab === 'applications' && (
        <Card>
          {investments === null ? (
            <TableSkeleton />
          ) : pending.length === 0 ? (
            <EmptyState icon={Landmark} title="No pending applications" description="New investment applications will appear here for review." className="border-0" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Affiliate</TH>
                  <TH>Amount</TH>
                  <TH>Applied</TH>
                  <TH>Proof</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {pending.map((inv) => (
                  <TR key={inv.id}>
                    <TD className="font-medium text-ink-900">{inv.affiliateName}</TD>
                    <TD>{formatCurrency(inv.principalAmount, 'PKR')}</TD>
                    <TD>{formatDate(inv.createdAt)}</TD>
                    <TD>
                      {inv.proofImageUrl ? (
                        <a href={inv.proofImageUrl} target="_blank" rel="noreferrer">
                          <img src={inv.proofImageUrl} alt="Proof" className="h-10 w-10 rounded-md border border-ink-200 object-cover" />
                        </a>
                      ) : (
                        <span className="text-xs text-ink-300">—</span>
                      )}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" onClick={() => { setReviewTarget({ investment: inv, decision: 'active' }); setReviewNote(''); setReviewError('') }}>
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="dangerOutline" onClick={() => { setReviewTarget({ investment: inv, decision: 'rejected' }); setReviewNote(''); setReviewError('') }}>
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}

      {tab === 'investments' && (
        <Card>
          {investments === null ? (
            <TableSkeleton />
          ) : nonPending.length === 0 ? (
            <EmptyState icon={Landmark} title="No investments yet" description="Approved investments appear here." className="border-0" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Affiliate</TH>
                  <TH>Status</TH>
                  <TH>Principal</TH>
                  <TH>Available Principal</TH>
                  <TH>Available Profit</TH>
                  <TH>Total Profit Earned</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {nonPending.map((inv) => (
                  <TR key={inv.id}>
                    <TD className="font-medium text-ink-900">{inv.affiliateName}</TD>
                    <TD><Badge variant={INVESTMENT_STATUS_VARIANT[inv.status] || 'neutral'} dot>{inv.status}</Badge></TD>
                    <TD>{formatCurrency(inv.principalAmount, 'PKR')}</TD>
                    <TD>{formatCurrency(inv.availablePrincipal, 'PKR')}</TD>
                    <TD>{formatCurrency(inv.availableProfit, 'PKR')}</TD>
                    <TD className="font-semibold text-ink-900">{formatCurrency(inv.totalProfitEarned, 'PKR')}</TD>
                    <TD>
                      {inv.status === 'active' && (
                        <Button size="sm" variant="secondary" onClick={() => { setProfitTarget(inv); setProfitAmount(''); setProfitNote(''); setProfitError('') }}>
                          <TrendingUp className="h-3.5 w-3.5" /> Post Profit
                        </Button>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}

      {tab === 'withdrawals' && (
        <Card>
          {withdrawals === null ? (
            <TableSkeleton />
          ) : withdrawals.length === 0 ? (
            <EmptyState icon={Landmark} title="No partner withdrawal requests" className="border-0" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Requested</TH>
                  <TH>Affiliate</TH>
                  <TH>Type</TH>
                  <TH>Amount</TH>
                  <TH>Net</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {withdrawals.map((w) => {
                  const actions = WITHDRAWAL_ACTIONS_BY_STATUS[w.status] || []
                  return (
                    <TR key={w.id}>
                      <TD>{formatDateTime(w.requestedAt)}</TD>
                      <TD className="font-medium text-ink-900">{w.affiliateName}</TD>
                      <TD className="capitalize">{w.withdrawalType === 'whole' ? 'Whole amount' : 'Profit only'}</TD>
                      <TD>{formatCurrency(w.amount, 'PKR')}</TD>
                      <TD className="font-semibold text-ink-900">{formatCurrency(w.netAmount, 'PKR')}</TD>
                      <TD><WithdrawalStatusBadge status={w.status} /></TD>
                      <TD>
                        {actions.length === 0 ? (
                          <span className="text-xs text-ink-300">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {actions.map((a) => (
                              <Button key={a.nextStatus} size="sm" variant={a.variant} loading={wdBusyId === w.id} onClick={() => handleWdClick(w, a)}>
                                <a.icon className="h-3.5 w-3.5" />
                                {a.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          )}
        </Card>
      )}

      <Modal open={!!reviewTarget} onClose={() => setReviewTarget(null)} title={reviewTarget?.decision === 'active' ? 'Approve application' : 'Reject application'} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            {reviewTarget?.investment.affiliateName} · {reviewTarget && formatCurrency(reviewTarget.investment.principalAmount, 'PKR')}
          </p>
          <div>
            <Label htmlFor="review-note">{reviewTarget?.decision === 'active' ? 'Note (optional)' : 'Reason'}</Label>
            <Textarea id="review-note" rows={3} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
            <FieldError>{reviewError}</FieldError>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReviewTarget(null)}>Cancel</Button>
            <Button variant={reviewTarget?.decision === 'active' ? 'primary' : 'danger'} loading={reviewing} onClick={confirmReview}>Confirm</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!profitTarget} onClose={() => setProfitTarget(null)} title="Post profit entry" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-600">{profitTarget?.affiliateName}</p>
          <div className="flex items-start gap-2 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This posts a manual, date-wise profit entry to the ledger — it does not represent a guaranteed or ongoing rate.
          </div>
          <div>
            <Label htmlFor="profit-amount">Amount (PKR)</Label>
            <Input id="profit-amount" type="number" min="0" value={profitAmount} onChange={(e) => setProfitAmount(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="profit-date">Date</Label>
            <Input id="profit-date" type="date" value={profitDate} onChange={(e) => setProfitDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="profit-note">Note (optional)</Label>
            <Input id="profit-note" value={profitNote} onChange={(e) => setProfitNote(e.target.value)} placeholder="e.g. Week of Aug 18" />
          </div>
          <FieldError>{profitError}</FieldError>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setProfitTarget(null)}>Cancel</Button>
            <Button loading={postingProfit} onClick={submitProfit}>Post profit</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!wdAction} onClose={() => setWdAction(null)} title={`${wdAction?.action.label} withdrawal`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-600">{wdAction?.withdrawal.affiliateName} · {wdAction && formatCurrency(wdAction.withdrawal.amount, 'PKR')}</p>
          <div>
            <Label htmlFor="wd-note">Reason</Label>
            <Textarea id="wd-note" rows={3} value={wdNote} onChange={(e) => setWdNote(e.target.value)} />
            <FieldError>{wdError}</FieldError>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setWdAction(null)}>Cancel</Button>
            <Button variant="danger" loading={wdBusyId === wdAction?.withdrawal.id} onClick={confirmWdAction}>Confirm</Button>
          </div>
        </div>
      </Modal>

      <Card className="mt-6 border-dashed">
        <CardContent className="flex items-start gap-2 p-4 text-xs text-ink-500">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          The profit-calculation formula shown to affiliates is whatever is configured in Program Settings. No rate is invented
          here — everything defaults to manual, admin-entered ledger rows until a real business rate is provided.
        </CardContent>
      </Card>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Wallet as WalletIcon, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { walletService } from '@/services/walletService'
import { commissionService } from '@/services/commissionService'
import PageHeader from '@/components/layout/PageHeader'
import MetricCard from '@/components/dashboard/MetricCard'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import Tabs from '@/components/ui/Tabs'
import Modal from '@/components/ui/Modal'
import { Label, Input } from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import WithdrawalStatusBadge from '@/components/wallet/WithdrawalStatusBadge'
import { formatCurrency, formatDateTime } from '@/lib/utils'

const METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'easypaisa', label: 'Easypaisa' },
  { value: 'crypto', label: 'Crypto (USDT)' },
]

export default function Wallet() {
  const { affiliate } = useAuth()
  const { toast } = useToast()
  const [wallet, setWallet] = useState(null)
  const [commissions, setCommissions] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [settings, setSettings] = useState(null)
  const [tab, setTab] = useState('commissions')
  const [modalOpen, setModalOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('bank_transfer')
  const [accountDetails, setAccountDetails] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function refresh() {
    walletService.getWallet(affiliate.id).then(setWallet)
    commissionService.listMyCommissions(affiliate.id).then(setCommissions)
    walletService.listWithdrawals(affiliate.id).then(setWithdrawals)
  }

  useEffect(() => {
    refresh()
    walletService.getPlatformSettings().then(setSettings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affiliate.id])

  const feePct = settings?.withdrawalFeePercentage ?? 5
  const amountNum = Number(amount) || 0
  const feeAmount = Math.round(amountNum * (feePct / 100) * 100) / 100
  const netAmount = amountNum - feeAmount

  async function handleWithdraw(e) {
    e.preventDefault()
    setError('')
    if (!amountNum || amountNum <= 0) {
      setError('Enter a valid amount.')
      return
    }
    setSubmitting(true)
    try {
      await walletService.requestWithdrawal(amountNum, method, accountDetails, affiliate.id)
      toast({ title: 'Withdrawal requested', description: 'Your request is pending admin review.' })
      setModalOpen(false)
      setAmount('')
      setAccountDetails('')
      refresh()
    } catch (err) {
      setError(err.message || 'Could not submit withdrawal request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Wallet"
        description="Your commission balance and withdrawal history."
        actions={<Button onClick={() => setModalOpen(true)}>Request Withdrawal</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Available Balance" value={wallet ? formatCurrency(wallet.availableBalance, 'PKR') : '—'} icon={WalletIcon} tone="success" />
        <MetricCard label="Lifetime Earned" value={wallet ? formatCurrency(wallet.lifetimeEarned, 'PKR') : '—'} icon={TrendingUp} tone="brand" />
        <MetricCard label="Total Withdrawn" value={wallet ? formatCurrency(wallet.lifetimeWithdrawn, 'PKR') : '—'} icon={TrendingDown} tone="info" />
      </div>

      <div className="mt-6">
        <Tabs
          tabs={[
            { value: 'commissions', label: 'Commission History', count: commissions.length },
            { value: 'withdrawals', label: 'Withdrawal History', count: withdrawals.length },
          ]}
          value={tab}
          onChange={setTab}
          className="mb-4"
        />

        <Card>
          {tab === 'commissions' ? (
            commissions.length === 0 ? (
              <EmptyState icon={WalletIcon} title="No commissions yet" description="Commission appears here once an order in your network is payment-approved." className="border-0" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Date</TH>
                    <TH>Source</TH>
                    <TH>Level</TH>
                    <TH>%</TH>
                    <TH>Amount</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {commissions.map((c) => (
                    <TR key={c.id}>
                      <TD>{formatDateTime(c.createdAt)}</TD>
                      <TD>{c.sourceAffiliateName}</TD>
                      <TD>L{c.level}</TD>
                      <TD>{c.commissionPercentage}%</TD>
                      <TD className="font-semibold text-ink-900">{formatCurrency(c.commissionAmount, 'PKR')}</TD>
                      <TD className="capitalize">{c.status}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )
          ) : withdrawals.length === 0 ? (
            <EmptyState icon={WalletIcon} title="No withdrawal requests yet" description="Request a withdrawal to see it listed here." className="border-0" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Requested</TH>
                  <TH>Amount</TH>
                  <TH>Fee</TH>
                  <TH>Net</TH>
                  <TH>Method</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {withdrawals.map((w) => (
                  <TR key={w.id}>
                    <TD>{formatDateTime(w.requestedAt)}</TD>
                    <TD>{formatCurrency(w.amount, 'PKR')}</TD>
                    <TD>{formatCurrency(w.feeAmount, 'PKR')}</TD>
                    <TD className="font-semibold text-ink-900">{formatCurrency(w.netAmount, 'PKR')}</TD>
                    <TD className="capitalize">{w.method.replace('_', ' ')}</TD>
                    <TD><WithdrawalStatusBadge status={w.status} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Request Withdrawal" size="sm">
        <form onSubmit={handleWithdraw} className="space-y-4">
          <div>
            <Label htmlFor="w-amount">Amount (PKR)</Label>
            <Input id="w-amount" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Min ${settings?.minWithdrawal ?? 1000}`} />
          </div>
          <div>
            <Label htmlFor="w-method">Method</Label>
            <Select id="w-method" value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="w-account">Account details</Label>
            <Input id="w-account" value={accountDetails} onChange={(e) => setAccountDetails(e.target.value)} placeholder="Account number / wallet address" />
          </div>

          {amountNum > 0 && (
            <div className="rounded-lg border border-ink-200 bg-ink-50 px-3.5 py-3 text-xs text-ink-600">
              <div className="flex justify-between"><span>Withdrawal</span><span>{formatCurrency(amountNum, 'PKR')}</span></div>
              <div className="flex justify-between"><span>Fee ({feePct}%)</span><span>-{formatCurrency(feeAmount, 'PKR')}</span></div>
              <div className="mt-1 flex justify-between border-t border-ink-200 pt-1 font-semibold text-ink-900"><span>Net amount</span><span>{formatCurrency(netAmount, 'PKR')}</span></div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm text-danger-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" loading={submitting}>Submit request</Button>
        </form>
      </Modal>
    </div>
  )
}

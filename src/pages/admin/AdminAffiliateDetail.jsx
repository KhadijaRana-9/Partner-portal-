import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Ban, CheckCircle2, Loader2, Mail, Phone, MapPin, ShieldCheck, Wallet as WalletIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { adminAffiliateService } from '@/services/adminAffiliateService'
import { useToast } from '@/context/ToastContext'
import PageHeader from '@/components/layout/PageHeader'
import MetricCard from '@/components/dashboard/MetricCard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Tabs from '@/components/ui/Tabs'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import OrderStatusBadge from '@/components/orders/OrderStatusBadge'
import WithdrawalStatusBadge from '@/components/wallet/WithdrawalStatusBadge'
import { formatCurrency, formatDate, formatDateTime, initials } from '@/lib/utils'

const STATUS_VARIANT = { active: 'success', suspended: 'danger', pending: 'warning' }
const ROLE_VARIANT = { admin: 'brand', affiliate: 'neutral' }

export default function AdminAffiliateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [detail, setDetail] = useState(null)
  const [tab, setTab] = useState('orders')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  function refresh() {
    adminAffiliateService.getAffiliateDetail(id).then(setDetail)
  }

  useEffect(() => {
    setDetail(null)
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function confirmStatusChange() {
    if (!detail) return
    setProcessing(true)
    try {
      const nextStatus = detail.affiliate.status === 'active' ? 'suspended' : 'active'
      await adminAffiliateService.setAffiliateStatus(id, nextStatus)
      toast({ title: `Affiliate ${nextStatus}`, description: `${detail.affiliate.fullName} is now ${nextStatus}.` })
      setConfirmOpen(false)
      refresh()
    } catch (err) {
      toast({ title: 'Could not update status', description: err.message, variant: 'error' })
    } finally {
      setProcessing(false)
    }
  }

  if (!detail) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  const { affiliate, upline, directReferrals, networkStats, orders, commissions, wallet, withdrawals } = detail
  const isActive = affiliate.status === 'active'

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-brand-600">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>
      <PageHeader
        title={affiliate.fullName}
        description={`Referral code ${affiliate.referralCode} · Joined ${formatDate(affiliate.createdAt)}`}
        actions={
          affiliate.role === 'admin' ? (
            <Badge variant="brand">Admin account</Badge>
          ) : isActive ? (
            <Button variant="dangerOutline" onClick={() => setConfirmOpen(true)}>
              <Ban className="h-4 w-4" />
              Suspend affiliate
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setConfirmOpen(true)}>
              <CheckCircle2 className="h-4 w-4" />
              Activate affiliate
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {initials(affiliate.fullName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">{affiliate.fullName}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge variant={ROLE_VARIANT[affiliate.role] || 'neutral'}>{affiliate.role}</Badge>
                  <Badge variant={STATUS_VARIANT[affiliate.status] || 'neutral'} dot>{affiliate.status}</Badge>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm text-ink-600">
              <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-ink-400" />{affiliate.email || '—'}</div>
              <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-ink-400" />{affiliate.phone || '—'}</div>
              <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-ink-400" />{affiliate.city || '—'}</div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-ink-400" />
                {upline ? (
                  <span>
                    Referred by{' '}
                    <Link to={`/super-admin/affiliates/${upline.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                      {upline.fullName}
                    </Link>
                  </span>
                ) : (
                  'No upline (root account)'
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Available Balance" value={formatCurrency(wallet.availableBalance, 'PKR')} icon={WalletIcon} tone="success" />
            <MetricCard label="Lifetime Earned" value={formatCurrency(wallet.lifetimeEarned, 'PKR')} icon={TrendingUp} tone="brand" />
            <MetricCard label="Total Withdrawn" value={formatCurrency(wallet.lifetimeWithdrawn, 'PKR')} icon={TrendingDown} tone="info" />
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Network — {networkStats.totalDirect} direct, {networkStats.totalIndirect} indirect</CardTitle>
                <CardDescription>5-level referral reach</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-ink-100">
                {networkStats.byLevel.map((l) => (
                  <div key={l.level} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">L{l.level}</span>
                      <p className="text-sm font-medium text-ink-900">Level {l.level} · {l.percentage}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink-900">{l.count} referrals</p>
                      <p className="text-xs text-ink-500">{l.withSales} with sales</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div>
            <CardTitle>Direct Referrals</CardTitle>
            <CardDescription>{directReferrals.length} affiliate{directReferrals.length === 1 ? '' : 's'} referred directly</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {directReferrals.length === 0 ? (
            <EmptyState title="No direct referrals yet" className="border-0" />
          ) : (
            <div className="divide-y divide-ink-100">
              {directReferrals.map((r) => (
                <Link key={r.id} to={`/super-admin/affiliates/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-ink-50">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                      {initials(r.fullName)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink-900">{r.fullName}</p>
                      <p className="text-xs text-ink-400">{r.city}</p>
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[r.status] || 'neutral'} dot>{r.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Tabs
          tabs={[
            { value: 'orders', label: 'Orders', count: orders.length },
            { value: 'commissions', label: 'Commissions', count: commissions.length },
            { value: 'withdrawals', label: 'Withdrawals', count: withdrawals.length },
          ]}
          value={tab}
          onChange={setTab}
          className="mb-4"
        />
        <Card>
          {tab === 'orders' &&
            (orders.length === 0 ? (
              <EmptyState title="No orders yet" className="border-0" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Order</TH>
                    <TH>Date</TH>
                    <TH>Total</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {orders.map((o) => (
                    <TR key={o.id} className="cursor-pointer" onClick={() => navigate(`/super-admin/orders/${o.id}`)}>
                      <TD className="font-mono text-xs font-medium text-brand-600">{o.orderNumber}</TD>
                      <TD>{formatDate(o.placedAt)}</TD>
                      <TD className="font-semibold text-ink-900">{formatCurrency(o.total, 'PKR')}</TD>
                      <TD><OrderStatusBadge status={o.status} /></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ))}

          {tab === 'commissions' &&
            (commissions.length === 0 ? (
              <EmptyState title="No commissions yet" className="border-0" />
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
            ))}

          {tab === 'withdrawals' &&
            (withdrawals.length === 0 ? (
              <EmptyState title="No withdrawal requests yet" className="border-0" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Requested</TH>
                    <TH>Amount</TH>
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
                      <TD className="font-semibold text-ink-900">{formatCurrency(w.netAmount, 'PKR')}</TD>
                      <TD className="capitalize">{w.method.replace('_', ' ')}</TD>
                      <TD><WithdrawalStatusBadge status={w.status} /></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ))}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmStatusChange}
        loading={processing}
        variant={isActive ? 'danger' : 'primary'}
        title={isActive ? 'Suspend this affiliate?' : 'Activate this affiliate?'}
        description={
          isActive
            ? `${affiliate.fullName} will lose access to their dashboard until reinstated.`
            : `${affiliate.fullName} will regain access to their dashboard.`
        }
        confirmLabel={isActive ? 'Suspend' : 'Activate'}
      />
    </div>
  )
}

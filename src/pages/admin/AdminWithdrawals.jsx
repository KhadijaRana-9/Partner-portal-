import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Wallet, Check, X, Banknote } from 'lucide-react'
import { adminWithdrawalService } from '@/services/adminWithdrawalService'
import { useToast } from '@/context/ToastContext'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Label, Textarea, FieldError } from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import { TableSkeleton } from '@/components/ui/Skeleton'
import WithdrawalStatusBadge from '@/components/wallet/WithdrawalStatusBadge'
import { formatCurrency, formatDateTime } from '@/lib/utils'

const PAGE_SIZE = 15

const ACTIONS_BY_STATUS = {
  pending: [
    { label: 'Approve', nextStatus: 'approved', variant: 'primary', icon: Check },
    { label: 'Reject', nextStatus: 'rejected', variant: 'dangerOutline', icon: X, requireNote: true },
  ],
  approved: [
    { label: 'Mark Paid', nextStatus: 'paid', variant: 'primary', icon: Banknote },
    { label: 'Reject', nextStatus: 'rejected', variant: 'dangerOutline', icon: X, requireNote: true },
  ],
}

export default function AdminWithdrawals() {
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const page = Number(params.get('page') || 1)

  const [rows, setRows] = useState(null)
  const [total, setTotal] = useState(0)
  const [actioningId, setActioningId] = useState(null)
  const [pendingAction, setPendingAction] = useState(null) // { withdrawal, action }
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')

  function refresh() {
    adminWithdrawalService.listWithdrawals({ status: status || undefined, page, pageSize: PAGE_SIZE }).then((r) => {
      setRows(r.items)
      setTotal(r.total)
    })
  }

  useEffect(() => {
    setRows(null)
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page])

  function updateParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  async function runAction(withdrawal, action, noteText) {
    setActioningId(withdrawal.id)
    try {
      await adminWithdrawalService.setWithdrawalStatus(withdrawal.id, action.nextStatus, noteText || undefined)
      toast({ title: `Withdrawal ${action.nextStatus}`, description: `${withdrawal.affiliateName}'s request is now ${action.nextStatus}.` })
      refresh()
      return true
    } catch (err) {
      toast({ title: 'Could not update withdrawal', description: err.message, variant: 'error' })
      return false
    } finally {
      setActioningId(null)
    }
  }

  function handleActionClick(withdrawal, action) {
    if (action.requireNote) {
      setPendingAction({ withdrawal, action })
      setNote('')
      setNoteError('')
    } else {
      runAction(withdrawal, action)
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return
    if (pendingAction.action.requireNote && !note.trim()) {
      setNoteError('A reason is required.')
      return
    }
    const ok = await runAction(pendingAction.withdrawal, pendingAction.action, note.trim())
    if (ok) setPendingAction(null)
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <PageHeader title="Withdrawals" description="Review and process affiliate withdrawal requests." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Select value={status} onChange={(e) => updateParam('status', e.target.value)} className="sm:w-48">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      <Card>
        {rows === null ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={Wallet} title="No withdrawal requests found" description="Try a different filter." className="border-0" />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Requested</TH>
                  <TH>Affiliate</TH>
                  <TH>Amount</TH>
                  <TH>Fee</TH>
                  <TH>Net</TH>
                  <TH>Method</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((w) => {
                  const actions = ACTIONS_BY_STATUS[w.status] || []
                  return (
                    <TR key={w.id}>
                      <TD>{formatDateTime(w.requestedAt)}</TD>
                      <TD className="font-medium text-ink-900">{w.affiliateName}</TD>
                      <TD>{formatCurrency(w.amount, 'PKR')}</TD>
                      <TD>{formatCurrency(w.feeAmount, 'PKR')}</TD>
                      <TD className="font-semibold text-ink-900">{formatCurrency(w.netAmount, 'PKR')}</TD>
                      <TD className="capitalize">{w.method.replace('_', ' ')}</TD>
                      <TD><WithdrawalStatusBadge status={w.status} /></TD>
                      <TD>
                        {actions.length === 0 ? (
                          <span className="text-xs text-ink-300">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {actions.map((a) => (
                              <Button key={a.nextStatus} size="sm" variant={a.variant} loading={actioningId === w.id} onClick={() => handleActionClick(w, a)}>
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
            <Pagination page={page} pageCount={pageCount} totalItems={total} pageSize={PAGE_SIZE} onPageChange={(p) => updateParam('page', String(p))} />
          </>
        )}
      </Card>

      <Modal open={!!pendingAction} onClose={() => setPendingAction(null)} title={`${pendingAction?.action.label} withdrawal`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-600">{pendingAction?.withdrawal.affiliateName} · {pendingAction && formatCurrency(pendingAction.withdrawal.amount, 'PKR')}</p>
          <div>
            <Label htmlFor="wd-note">Reason</Label>
            <Textarea id="wd-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Account details could not be verified." />
            <FieldError>{noteError}</FieldError>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPendingAction(null)}>Cancel</Button>
            <Button type="button" variant="danger" loading={actioningId === pendingAction?.withdrawal.id} onClick={confirmPendingAction}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

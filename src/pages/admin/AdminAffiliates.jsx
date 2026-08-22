import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, UserCog, Ban, CheckCircle2 } from 'lucide-react'
import { adminAffiliateService } from '@/services/adminAffiliateService'
import { useToast } from '@/context/ToastContext'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Input } from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { useDebouncedValue } from '@/lib/hooks'
import { formatDate, initials } from '@/lib/utils'

const PAGE_SIZE = 10

const STATUS_VARIANT = { active: 'success', suspended: 'danger', pending: 'warning' }

export default function AdminAffiliates() {
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') || '')
  const debouncedSearch = useDebouncedValue(search, 300)
  const status = params.get('status') || ''
  const page = Number(params.get('page') || 1)

  const [rows, setRows] = useState(null)
  const [total, setTotal] = useState(0)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [processing, setProcessing] = useState(false)

  function refresh() {
    adminAffiliateService
      .listAffiliates({ search: debouncedSearch || undefined, status: status || undefined, role: 'affiliate', page, pageSize: PAGE_SIZE })
      .then((r) => {
        setRows(r.items)
        setTotal(r.total)
      })
  }

  useEffect(() => {
    setRows(null)
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status, page])

  function updateParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  async function confirmStatusChange() {
    if (!confirmTarget) return
    setProcessing(true)
    try {
      const nextStatus = confirmTarget.status === 'active' ? 'suspended' : 'active'
      await adminAffiliateService.setAffiliateStatus(confirmTarget.id, nextStatus)
      toast({ title: `Affiliate ${nextStatus}`, description: `${confirmTarget.fullName} is now ${nextStatus}.` })
      setConfirmTarget(null)
      refresh()
    } catch (err) {
      toast({ title: 'Could not update status', description: err.message, variant: 'error' })
    } finally {
      setProcessing(false)
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <PageHeader title="Affiliates" description="Manage affiliate accounts — suspend or reinstate access." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            icon={Search}
            placeholder="Search by name, email or referral code…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              updateParam('q', e.target.value)
            }}
          />
        </div>
        <Select value={status} onChange={(e) => updateParam('status', e.target.value)} className="sm:w-44">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </Select>
      </div>

      <Card>
        {rows === null ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={UserCog} title="No affiliates found" description="Try a different search term or filter." className="border-0" />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Affiliate</TH>
                  <TH>Contact</TH>
                  <TH>Referral Code</TH>
                  <TH>Status</TH>
                  <TH>Joined</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      <Link to={`/super-admin/affiliates/${a.id}`} className="flex items-center gap-2.5 hover:text-brand-600">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                          {initials(a.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-900">{a.fullName}</p>
                          <p className="truncate text-xs text-ink-400">{a.city}</p>
                        </div>
                      </Link>
                    </TD>
                    <TD>
                      <p className="text-ink-700">{a.email}</p>
                      <p className="text-xs text-ink-400">{a.phone}</p>
                    </TD>
                    <TD className="font-mono text-xs">{a.referralCode}</TD>
                    <TD><Badge variant={STATUS_VARIANT[a.status] || 'neutral'} dot>{a.status}</Badge></TD>
                    <TD>{formatDate(a.createdAt)}</TD>
                    <TD>
                      {a.status === 'active' ? (
                        <Button size="sm" variant="dangerOutline" onClick={() => setConfirmTarget(a)}>
                          <Ban className="h-3.5 w-3.5" />
                          Suspend
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setConfirmTarget(a)}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Activate
                        </Button>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageCount={pageCount} totalItems={total} pageSize={PAGE_SIZE} onPageChange={(p) => updateParam('page', String(p))} />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmStatusChange}
        loading={processing}
        variant={confirmTarget?.status === 'active' ? 'danger' : 'primary'}
        title={confirmTarget?.status === 'active' ? 'Suspend this affiliate?' : 'Activate this affiliate?'}
        description={
          confirmTarget?.status === 'active'
            ? `${confirmTarget?.fullName} will lose access to their dashboard until reinstated.`
            : `${confirmTarget?.fullName} will regain access to their dashboard.`
        }
        confirmLabel={confirmTarget?.status === 'active' ? 'Suspend' : 'Activate'}
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { adminAffiliateService } from '@/services/adminAffiliateService'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Input } from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { useDebouncedValue } from '@/lib/hooks'
import { formatDate, initials } from '@/lib/utils'

const PAGE_SIZE = 10

const STATUS_VARIANT = { active: 'success', suspended: 'danger', pending: 'warning' }
const ROLE_VARIANT = { admin: 'brand', affiliate: 'neutral' }

export default function AdminUsers() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') || '')
  const debouncedSearch = useDebouncedValue(search, 300)
  const status = params.get('status') || ''
  const role = params.get('role') || ''
  const page = Number(params.get('page') || 1)

  const [rows, setRows] = useState(null)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setRows(null)
    adminAffiliateService
      .listAffiliates({ search: debouncedSearch || undefined, status: status || undefined, role: role || undefined, page, pageSize: PAGE_SIZE })
      .then((r) => {
        setRows(r.items)
        setTotal(r.total)
      })
  }, [debouncedSearch, status, role, page])

  function updateParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <PageHeader title="Users" description="Every registered account on the platform — every user is an affiliate; guest checkout customers don't have accounts." />

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
        <Select value={role} onChange={(e) => updateParam('role', e.target.value)} className="sm:w-40">
          <option value="">All roles</option>
          <option value="affiliate">Affiliate</option>
          <option value="admin">Admin</option>
        </Select>
      </div>

      <Card>
        {rows === null ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="Try a different search term or filter." className="border-0" />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>User</TH>
                  <TH>Contact</TH>
                  <TH>Referral Code</TH>
                  <TH>Role</TH>
                  <TH>Status</TH>
                  <TH>Joined</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((a) => (
                  <TR key={a.id} className="cursor-pointer" onClick={() => navigate(`/super-admin/affiliates/${a.id}`)}>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                          {initials(a.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-900">{a.fullName}</p>
                          <p className="truncate text-xs text-ink-400">{a.city}</p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <p className="text-ink-700">{a.email}</p>
                      <p className="text-xs text-ink-400">{a.phone}</p>
                    </TD>
                    <TD className="font-mono text-xs">{a.referralCode}</TD>
                    <TD><Badge variant={ROLE_VARIANT[a.role] || 'neutral'}>{a.role}</Badge></TD>
                    <TD><Badge variant={STATUS_VARIANT[a.status] || 'neutral'} dot>{a.status}</Badge></TD>
                    <TD>{formatDate(a.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageCount={pageCount} totalItems={total} pageSize={PAGE_SIZE} onPageChange={(p) => updateParam('page', String(p))} />
          </>
        )}
      </Card>
    </div>
  )
}

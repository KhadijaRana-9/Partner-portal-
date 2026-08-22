import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Package, Plus, Pencil, Check, X, Archive } from 'lucide-react'
import { adminProductService } from '@/services/adminProductService'
import { useToast } from '@/context/ToastContext'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Input, Label, Textarea, FieldError } from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { useDebouncedValue } from '@/lib/hooks'
import { formatCurrency } from '@/lib/utils'

const PAGE_SIZE = 10

const STATUS_VARIANT = { pending: 'warning', approved: 'success', rejected: 'danger', archived: 'neutral' }

const EMPTY_FORM = { name: '', categoryId: '', description: '', price: '', compareAtPrice: '', stockQuantity: '', sku: '', imageUrl: '' }

export default function AdminProducts() {
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') || '')
  const debouncedSearch = useDebouncedValue(search, 300)
  const status = params.get('status') || ''
  const categoryId = params.get('category') || ''
  const page = Number(params.get('page') || 1)

  const [categories, setCategories] = useState([])
  const [rows, setRows] = useState(null)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [actioningId, setActioningId] = useState(null)

  function refresh() {
    adminProductService
      .listProducts({ search: debouncedSearch || undefined, status: status || undefined, categoryId: categoryId || undefined, page, pageSize: PAGE_SIZE })
      .then((r) => {
        setRows(r.items)
        setTotal(r.total)
      })
  }

  useEffect(() => {
    adminProductService.listCategories().then(setCategories)
  }, [])

  useEffect(() => {
    setRows(null)
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status, categoryId, page])

  function updateParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({
      name: p.name,
      categoryId: p.categoryId,
      description: p.description || '',
      price: String(p.price),
      compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
      stockQuantity: String(p.stockQuantity),
      sku: p.sku || '',
      imageUrl: p.imageUrl || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim() || !form.categoryId || !form.price) {
      setFormError('Name, category and price are required.')
      return
    }
    setSaving(true)
    try {
      const fields = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        description: form.description,
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        stockQuantity: Number(form.stockQuantity) || 0,
        sku: form.sku,
        imageUrl: form.imageUrl || undefined,
      }
      if (editing) {
        await adminProductService.updateProduct(editing.id, fields)
        toast({ title: 'Product updated', description: `${fields.name} was saved.` })
      } else {
        await adminProductService.createProduct(fields)
        toast({ title: 'Product created', description: `${fields.name} was added, pending approval.` })
      }
      setModalOpen(false)
      refresh()
    } catch (err) {
      setFormError(err.message || 'Could not save product.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(product, newStatus) {
    setActioningId(product.id)
    try {
      await adminProductService.setProductStatus(product.id, newStatus)
      toast({ title: `Product ${newStatus}`, description: `${product.name} is now ${newStatus}.` })
      refresh()
    } catch (err) {
      toast({ title: 'Could not update product', description: err.message, variant: 'error' })
    } finally {
      setActioningId(null)
    }
  }

  async function confirmArchive() {
    if (!archiveTarget) return
    setArchiving(true)
    try {
      await adminProductService.deleteProduct(archiveTarget.id)
      toast({ title: 'Product archived', description: `${archiveTarget.name} was removed from the storefront.` })
      setArchiveTarget(null)
      refresh()
    } catch (err) {
      toast({ title: 'Could not archive product', description: err.message, variant: 'error' })
    } finally {
      setArchiving(false)
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <PageHeader
        title="Products"
        description="Only approved + active products are visible on the storefront — approving a product here publishes it."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" />Add product</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            icon={Search}
            placeholder="Search by name or SKU…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              updateParam('q', e.target.value)
            }}
          />
        </div>
        <Select value={status} onChange={(e) => updateParam('status', e.target.value)} className="sm:w-44">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="archived">Archived</option>
        </Select>
        <Select value={categoryId} onChange={(e) => updateParam('category', e.target.value)} className="sm:w-52">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>

      <Card>
        {rows === null ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={Package} title="No products found" description="Try a different search term or filter." className="border-0" />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Product</TH>
                  <TH>Category</TH>
                  <TH>Price</TH>
                  <TH>Stock</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((p) => (
                  <TR key={p.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <img src={p.imageUrl} alt={p.name} className="h-10 w-10 shrink-0 rounded-lg border border-ink-200 object-cover" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-900">{p.name}</p>
                          <p className="text-xs text-ink-400">{p.sku || '—'}</p>
                        </div>
                      </div>
                    </TD>
                    <TD>{p.categoryName || '—'}</TD>
                    <TD>
                      <p className="font-semibold text-ink-900">{formatCurrency(p.price, 'PKR')}</p>
                      {p.compareAtPrice && <p className="text-xs text-ink-400 line-through">{formatCurrency(p.compareAtPrice, 'PKR')}</p>}
                    </TD>
                    <TD>{p.stockQuantity}</TD>
                    <TD><Badge variant={STATUS_VARIANT[p.status] || 'neutral'} dot>{p.status}</Badge></TD>
                    <TD>
                      <div className="flex items-center gap-1.5">
                        {p.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" loading={actioningId === p.id} onClick={() => handleStatusChange(p, 'approved')}>
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button size="sm" variant="dangerOutline" loading={actioningId === p.id} onClick={() => handleStatusChange(p, 'rejected')}>
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label="Edit product">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {p.status !== 'archived' && (
                          <Button size="icon" variant="ghost" onClick={() => setArchiveTarget(p)} aria-label="Archive product">
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageCount={pageCount} totalItems={total} pageSize={PAGE_SIZE} onPageChange={(p) => updateParam('page', String(p))} />
          </>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit product' : 'Add product'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="p-category">Category</Label>
              <Select id="p-category" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="p-sku">SKU</Label>
              <Input id="p-sku" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="p-price">Price (PKR)</Label>
              <Input id="p-price" type="number" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="p-compare">Compare-at price (optional)</Label>
              <Input id="p-compare" type="number" min="0" value={form.compareAtPrice} onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="p-stock">Stock quantity</Label>
              <Input id="p-stock" type="number" min="0" value={form.stockQuantity} onChange={(e) => setForm((f) => ({ ...f, stockQuantity: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="p-image">Image URL</Label>
              <Input id="p-image" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://…" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <FieldError>{formError}</FieldError>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Save changes' : 'Create product'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
        loading={archiving}
        title="Archive this product?"
        description={`${archiveTarget?.name} will be hidden from the storefront and marked archived.`}
        confirmLabel="Archive"
      />
    </div>
  )
}

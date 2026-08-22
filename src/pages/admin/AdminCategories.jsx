import { useEffect, useState } from 'react'
import { Tags, Plus, Pencil, Trash2 } from 'lucide-react'
import { adminProductService } from '@/services/adminProductService'
import { useToast } from '@/context/ToastContext'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Input, Label, FieldError } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/Skeleton'

const EMPTY_FORM = { name: '', slug: '' }

export default function AdminCategories() {
  const { toast } = useToast()
  const [categories, setCategories] = useState(null)
  const [counts, setCounts] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  function refresh() {
    Promise.all([adminProductService.listCategories(), adminProductService.listProducts({ pageSize: 1000 })]).then(([cats, productPage]) => {
      setCategories(cats)
      const byCategory = {}
      productPage.items.forEach((p) => {
        byCategory[p.categoryId] = (byCategory[p.categoryId] || 0) + 1
      })
      setCounts(byCategory)
    })
  }

  useEffect(() => {
    refresh()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(c) {
    setEditing(c)
    setForm({ name: c.name, slug: c.slug })
    setFormError('')
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim()) {
      setFormError('Category name is required.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await adminProductService.updateCategory(editing.id, { name: form.name.trim(), slug: form.slug.trim() || undefined })
        toast({ title: 'Category updated' })
      } else {
        await adminProductService.createCategory({ name: form.name.trim(), slug: form.slug.trim() || undefined })
        toast({ title: 'Category created' })
      }
      setModalOpen(false)
      refresh()
    } catch (err) {
      setFormError(err.message || 'Could not save category.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await adminProductService.deleteCategory(deleteTarget.id)
      toast({ title: 'Category deleted', description: `${deleteTarget.name} was removed.` })
      setDeleteTarget(null)
      refresh()
    } catch (err) {
      toast({ title: 'Could not delete category', description: err.message, variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Product categories shown on the storefront."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" />Add category</Button>}
      />

      <Card>
        {categories === null ? (
          <TableSkeleton />
        ) : categories.length === 0 ? (
          <EmptyState icon={Tags} title="No categories yet" description="Create your first category to start adding products." className="border-0" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Slug</TH>
                <TH>Products</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {categories.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium text-ink-900">{c.name}</TD>
                  <TD className="font-mono text-xs text-ink-500">{c.slug}</TD>
                  <TD>{counts[c.id] || 0}</TD>
                  <TD>
                    <div className="flex items-center gap-1.5">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)} aria-label="Edit category">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(c)} aria-label="Delete category">
                        <Trash2 className="h-4 w-4 text-danger-600" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit category' : 'Add category'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="c-slug">Slug (optional)</Label>
            <Input id="c-slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="auto-generated from name" />
          </div>
          <FieldError>{formError}</FieldError>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Save changes' : 'Create category'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete this category?"
        description={`${deleteTarget?.name} will be permanently removed. This fails if products are still assigned to it.`}
        confirmLabel="Delete"
      />
    </div>
  )
}

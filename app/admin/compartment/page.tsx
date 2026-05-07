'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Trash2, RefreshCw, AlertTriangle, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getCompartments, deleteCompartment, Compartment } from '@/api/oci.api'
import { useTranslation } from 'react-i18next'
import { formatDateTime } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const PAGE_SIZE = 10
const POLL_INTERVAL_MS = 60_000 // 1 minute
const LS_KEY = 'compartment-deleting-ids' // localStorage key
const MAX_STALE_MS = 4 * 60 * 60 * 1000 // 4 hours — auto-clear old entries

interface StoredEntry { id: string; ts: number }

function loadStoredDeletingIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return new Set()
    const entries: StoredEntry[] = JSON.parse(raw)
    const now = Date.now()
    const valid = entries.filter(e => now - e.ts < MAX_STALE_MS)
    return new Set(valid.map(e => e.id))
  } catch {
    return new Set()
  }
}

function saveStoredDeletingIds(ids: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    const existing: StoredEntry[] = (() => {
      try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
    })()
    const now = Date.now()
    // Merge: keep existing timestamps, add new ones
    const map = new Map<string, number>(existing.map(e => [e.id, e.ts]))
    for (const id of ids) {
      if (!map.has(id)) map.set(id, now)
    }
    // Remove ids no longer in the set
    for (const id of map.keys()) {
      if (!ids.has(id)) map.delete(id)
    }
    const entries: StoredEntry[] = [...map.entries()].map(([id, ts]) => ({ id, ts }))
    localStorage.setItem(LS_KEY, JSON.stringify(entries))
  } catch {}
}

export default function CompartmentManagementPage() {
  const { t } = useTranslation()
  const [compartments, setCompartments] = useState<Compartment[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCompartment, setSelectedCompartment] = useState<Compartment | null>(null)
  // Hydrate from localStorage so deleting state survives F5
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => loadStoredDeletingIds())
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { toast } = useToast()
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep localStorage in sync whenever deletingIds changes
  useEffect(() => {
    saveStoredDeletingIds(deletingIds)
  }, [deletingIds])

  // Initial load (full reload with spinner)
  const loadCompartments = async () => {
    try {
      setLoading(true)
      const data = await getCompartments()
      setCompartments(data)
      // Clean up deletingIds that are no longer in OCI (deletion completed while user was away)
      const freshIds = new Set(data.map(c => c.id))
      setDeletingIds(prev => {
        if (prev.size === 0) return prev
        const next = new Set([...prev].filter(id => freshIds.has(id)))
        return next.size === prev.size ? prev : next
      })
    } catch (error: any) {
      toast({
        title: t('admin.compartment.toast.loadError', { message: '' }).split(':')[0],
        description: t('admin.compartment.toast.loadError', { message: error.message }),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Silent background refresh — only updates rows that changed, no full spinner
  const refreshSilently = async (watchingIds: Set<string>) => {
    if (watchingIds.size === 0) return
    try {
      const fresh = await getCompartments()
      const freshIds = new Set(fresh.map(c => c.id))
      setCompartments(prev => {
        // Replace each compartment with fresh data if available; keep others as-is
        const updated = prev.map(c => fresh.find(f => f.id === c.id) ?? c)
        // Remove compartments that are gone from OCI (not in fresh list) AND we were deleting them
        return updated.filter(c => !watchingIds.has(c.id) || freshIds.has(c.id))
      })
      // Stop tracking IDs that are fully gone from OCI list
      const nowGone = [...watchingIds].filter(id => !freshIds.has(id))
      if (nowGone.length > 0) {
        setDeletingIds(prev => {
          const next = new Set(prev)
          nowGone.forEach(id => next.delete(id))
          return next
        })
        setCompartments(prev => prev.filter(c => !nowGone.includes(c.id)))
        nowGone.forEach(() => {
          toast({ title: t('admin.compartment.toast.deleteSuccess', 'Compartment deleted successfully') })
        })
      }
    } catch {
      // Ignore errors in background poll
    }
  }

  // Start / stop polling whenever deletingIds changes
  useEffect(() => {
    if (deletingIds.size === 0) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      return
    }
    // Capture snapshot of ids to watch
    const watching = new Set(deletingIds)
    if (!pollTimerRef.current) {
      pollTimerRef.current = setInterval(() => {
        setDeletingIds(current => {
          refreshSilently(current)
          return current
        })
      }, POLL_INTERVAL_MS)
    }
    return () => {}
  }, [deletingIds])

  // Cleanup on unmount
  useEffect(() => {
    loadCompartments()
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [])
  const handleDeleteClick = (compartment: Compartment) => {
    setSelectedCompartment(compartment)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedCompartment) return
    const compartmentToDelete = selectedCompartment
    setDeleteDialogOpen(false)
    setSelectedCompartment(null)
    setDeletingIds(prev => new Set(prev).add(compartmentToDelete.id))

    try {
      await deleteCompartment(compartmentToDelete.name)
      toast({
        title: t('admin.compartment.toast.deleteInitiated', { name: compartmentToDelete.name }),
        description: t('admin.compartment.toast.deleteInitiatedDesc'),
      })
      // Mark as DELETING in local state immediately (no full reload)
      setCompartments(prev =>
        prev.map(c => c.id === compartmentToDelete.id ? { ...c, lifecycleState: 'DELETING' } : c)
      )
    } catch (error: any) {
      toast({
        title: t('admin.compartment.toast.deleteError', { message: '' }).split(':')[0],
        description: t('admin.compartment.toast.deleteError', { message: error.response?.data?.message || error.message }),
        variant: 'destructive',
      })
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(compartmentToDelete.id)
        return next
      })
    }
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'ACTIVE': return 'bg-green-500'
      case 'CREATING': return 'bg-blue-500'
      case 'DELETING': return 'bg-orange-500'
      case 'DELETED': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  // Search filter: match name, id (OCID), or description (which contains email)
  const q = search.trim().toLowerCase()
  const filtered = compartments.filter(c =>
    !q ||
    c.name.toLowerCase().includes(q) ||
    c.id.toLowerCase().includes(q) ||
    (c.description ?? '').toLowerCase().includes(q)
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Reset to page 1 when search changes
  const handleSearch = (v: string) => {
    setSearch(v)
    setPage(1)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.compartment.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('admin.compartment.subtitle')}</p>
        </div>
        <Button onClick={loadCompartments} disabled={loading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('admin.compartment.refresh')}
        </Button>
      </div>

      {/* Search box */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('admin.compartment.searchPlaceholder', 'Search by name, OCID, or email...')}
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">{t('admin.compartment.loading')}</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? t('admin.compartment.noResults', 'No compartments match your search.') : t('admin.compartment.noCompartments')}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {paged.map((compartment) => (
              <Card key={compartment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{compartment.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {compartment.description || t('admin.compartment.noDescription')}
                      </p>
                    </div>
                    <Badge className={getStateColor(
                      deletingIds.has(compartment.id) ? 'DELETING' : compartment.lifecycleState
                    )}>
                      {deletingIds.has(compartment.id) ? 'DELETING' : compartment.lifecycleState}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('admin.compartment.compartmentIdLabel')}</p>
                      <p className="text-sm font-mono break-all">{compartment.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('admin.compartment.createdAt')}</p>
                      <p className="text-sm">{formatDateTime(compartment.timeCreated)}</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(compartment)}
                      disabled={compartment.lifecycleState !== 'ACTIVE' || deletingIds.has(compartment.id)}
                    >
                      {deletingIds.has(compartment.id) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('admin.compartment.dialog.deleting')}
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('admin.compartment.deleteButton')}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                {t('admin.compartment.pagination.showing', {
                  from: (safePage - 1) * PAGE_SIZE + 1,
                  to: Math.min(safePage * PAGE_SIZE, filtered.length),
                  total: filtered.length,
                  defaultValue: `Showing {{from}}–{{to}} of {{total}}`
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {t('admin.compartment.pagination.page', {
                    page: safePage,
                    total: totalPages,
                    defaultValue: `Page {{page}} of {{total}}`
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('admin.compartment.dialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {t('admin.compartment.dialog.description1')}{' '}
                <strong className="text-foreground">{selectedCompartment?.name}</strong>
                {t('admin.compartment.dialog.description2')}
              </p>
              <p className="text-destructive font-medium">
                {t('admin.compartment.dialog.warning')}
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>{t('admin.compartment.dialog.items.vms')}</li>
                <li>{t('admin.compartment.dialog.items.vcns')}</li>
                <li>{t('admin.compartment.dialog.items.subnets')}</li>
                <li>{t('admin.compartment.dialog.items.gateways')}</li>
                <li>{t('admin.compartment.dialog.items.routes')}</li>
              </ul>
              <p className="font-medium">{t('admin.compartment.dialog.irreversible')}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.compartment.dialog.cancelButton')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('admin.compartment.dialog.confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

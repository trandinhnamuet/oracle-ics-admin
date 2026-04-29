'use client'

import React, { useEffect, useState } from 'react'
import {
  HeadphonesIcon, Search, RefreshCw, Trash2, CheckCircle2,
  XCircle, AlertCircle, Clock, ChevronDown, ChevronUp, Save,
  Paperclip, FileText, Image as ImageIcon, Download, Eye,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { getAllTickets, updateTicket, deleteTicket, parseAttachments, SupportTicket, TicketAttachment } from '@/api/support-ticket.api'
import { useTranslation } from 'react-i18next'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { formatDateTime } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { className: string; icon: React.ElementType }> = {
  open:        { className: 'bg-blue-100 text-blue-700 border-blue-200',   icon: AlertCircle },
  in_progress: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: RefreshCw },
  resolved:    { className: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  closed:      { className: 'bg-gray-100 text-gray-500 border-gray-200',   icon: XCircle },
}

const PRIORITY_CONFIG: Record<string, { className: string }> = {
  low:    { className: 'bg-slate-100 text-slate-600' },
  medium: { className: 'bg-blue-100 text-blue-600' },
  high:   { className: 'bg-orange-100 text-orange-600' },
  urgent: { className: 'bg-red-100 text-red-600 font-semibold' },
}

const SERVICES: Record<string, string> = {}

const API_BASE = (typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:3003'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AdminAttachmentItem({ att }: { att: TicketAttachment }) {
  const base = API_BASE.replace(/\/$/, '')
  const isImage = att.mimeType.startsWith('image/')
  const fullUrl = att.url.startsWith('http') ? att.url : `${base}${att.url}`

  const handleDownload = async () => {
    try {
      const response = await fetch(fullUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = att.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(fullUrl, '_blank')
    }
  }

  return (
    <div className="flex items-center gap-3 bg-muted/40 border border-border rounded-lg px-3 py-2">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fullUrl} alt={att.name} className="h-10 w-10 object-cover rounded shrink-0" />
      ) : (
        <FileText className="h-8 w-8 text-orange-500 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{att.name}</p>
        <p className="text-xs text-muted-foreground">{att.mimeType} · {formatBytes(att.size)}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <a href={fullUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View">
            <Eye className="h-4 w-4" />
          </Button>
        </a>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Download" onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function AdminSupportTicketsPage() {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [filtered, setFiltered] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editNote, setEditNote] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [pendingDeleteTicketId, setPendingDeleteTicketId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getAllTickets()
      setTickets(data)
      setFiltered(data)
    } catch {
      toast({ title: t('admin.supportTickets.toast.error'), description: t('admin.supportTickets.toast.loadError'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Filtering
  useEffect(() => {
    let list = [...tickets]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.customer_name.toLowerCase().includes(q)
      )
    }
    if (filterStatus !== 'all') list = list.filter(t => t.status === filterStatus)
    if (filterPriority !== 'all') list = list.filter(t => t.priority === filterPriority)
    setFiltered(list)
  }, [search, filterStatus, filterPriority, tickets])

  const handleUpdate = async (id: number, data: { status?: string; priority?: string; admin_note?: string }) => {
    // Optimistic update: apply the changed field immediately so the Select
    // reflects the new value without waiting for the API round-trip.
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...data } : t))
    setSaving(prev => ({ ...prev, [id]: true }))
    try {
      const updated = await updateTicket(id, data)
      // Merge (not replace) so that any field the server omits doesn't wipe
      // out the existing value that was already showing correctly.
      setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t))
      // Clear local edit state so the textarea reflects the saved value
      if ('admin_note' in data) {
        setEditNote(prev => { const n = { ...prev }; delete n[id]; return n })
      }
      toast({ title: t('admin.supportTickets.toast.updated'), description: t('admin.supportTickets.toast.updateSuccess') })
    } catch (e: any) {
      // Revert optimistic update on error
      setTickets(prev => prev.map(t => t.id === id ? { ...t, ...data } : t))
      toast({ title: t('admin.supportTickets.toast.error'), description: e.message, variant: 'destructive' })
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleDelete = (id: number) => {
    setPendingDeleteTicketId(id)
  }

  const executeDeleteTicket = async () => {
    if (pendingDeleteTicketId === null) return
    const id = pendingDeleteTicketId
    setPendingDeleteTicketId(null)
    try {
      await deleteTicket(id)
      setTickets(prev => prev.filter(t => t.id !== id))
      toast({ title: t('admin.supportTickets.toast.deleted') })
    } catch (e: any) {
      toast({ title: t('admin.supportTickets.toast.error'), description: e.message, variant: 'destructive' })
    }
  }

  // Stats
  const stats = {
    total:       tickets.length,
    open:        tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved:    tickets.filter(t => t.status === 'resolved').length,
    urgent:      tickets.filter(t => t.priority === 'urgent').length,
  }

  const formatDate = (d: string) => formatDateTime(d)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <HeadphonesIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('admin.supportTickets.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('admin.supportTickets.subtitle')}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('admin.supportTickets.refresh')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: t('admin.supportTickets.stats.total'),     value: stats.total,       color: 'text-foreground' },
          { label: t('admin.supportTickets.stats.open'),       value: stats.open,        color: 'text-blue-600' },
          { label: t('admin.supportTickets.stats.inProgress'), value: stats.in_progress, color: 'text-yellow-600' },
          { label: t('admin.supportTickets.stats.resolved'),   value: stats.resolved,    color: 'text-green-600' },
          { label: t('admin.supportTickets.stats.urgent'),     value: stats.urgent,      color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.supportTickets.filters.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder={t('admin.supportTickets.filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.supportTickets.filters.allStatus')}</SelectItem>
                <SelectItem value="open">{t('admin.supportTickets.status.open')}</SelectItem>
                <SelectItem value="in_progress">{t('admin.supportTickets.status.inProgress')}</SelectItem>
                <SelectItem value="resolved">{t('admin.supportTickets.status.resolved')}</SelectItem>
                <SelectItem value="closed">{t('admin.supportTickets.status.closed')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t('admin.supportTickets.filters.priority')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.supportTickets.filters.allPriority')}</SelectItem>
                <SelectItem value="urgent">{t('admin.supportTickets.priority.urgent')}</SelectItem>
                <SelectItem value="high">{t('admin.supportTickets.priority.high')}</SelectItem>
                <SelectItem value="medium">{t('admin.supportTickets.priority.medium')}</SelectItem>
                <SelectItem value="low">{t('admin.supportTickets.priority.low')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base">{t('admin.supportTickets.table.title', { count: filtered.length })}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">{t('admin.supportTickets.table.noData')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10">{t('admin.supportTickets.table.id')}</TableHead>
                    <TableHead>{t('admin.supportTickets.table.titleHeader')}</TableHead>
                    <TableHead>{t('admin.supportTickets.table.service')}</TableHead>
                    <TableHead>{t('admin.supportTickets.table.status')}</TableHead>
                    <TableHead>{t('admin.supportTickets.table.priority')}</TableHead>
                    <TableHead>{t('admin.supportTickets.table.date')}</TableHead>
                    <TableHead className="text-right">{t('admin.supportTickets.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(ticket => {
                    const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open
                    const priorityCfg = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.medium
                    const isExpanded = expandedId === ticket.id
                    const StatusIcon = statusCfg.icon

                    return (
                      <React.Fragment key={ticket.id}>
                        <TableRow
                          className={`cursor-pointer hover:bg-muted/30 ${isExpanded ? 'bg-muted/20 border-b-0' : ''}`}
                          onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">#{ticket.id}</TableCell>
                          <TableCell>
                            <div className="font-medium line-clamp-1">{ticket.title}</div>
                            <div className="text-xs text-muted-foreground">{ticket.customer_name} · {ticket.email}</div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{ticket.service ? t(`admin.supportTickets.services.${ticket.service}`) : '—'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusCfg.className} flex items-center gap-1 w-fit`}>
                              <StatusIcon className="h-3 w-3" />
                              {ticket.status === 'in_progress' ? t('admin.supportTickets.status.inProgress') : t(`admin.supportTickets.status.${ticket.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${priorityCfg.className} border-0 text-xs`}>
                              {t(`admin.supportTickets.priority.${ticket.priority}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(ticket.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:text-destructive"
                                onClick={() => handleDelete(ticket.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded detail row */}
                        {isExpanded && (
                          <TableRow className="bg-muted/10 hover:bg-muted/10">
                            <TableCell colSpan={7} className="p-0">
                              <div className="px-6 py-5 space-y-4 border-t border-dashed">
                                {/* Contact info */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                  {ticket.phone && <div><span className="text-muted-foreground">{t('admin.supportTickets.detail.phone')}:</span> {ticket.phone}</div>}
                                  {ticket.address && <div className="sm:col-span-2"><span className="text-muted-foreground">{t('admin.supportTickets.detail.address')}:</span> {ticket.address}</div>}
                                </div>

                                {/* Content */}
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('admin.supportTickets.detail.content')}:</p>
                                  <p className="text-sm whitespace-pre-wrap bg-background border rounded-md p-3">{ticket.content}</p>
                                </div>

                                {/* Attachments */}
                                {(() => {
                                  const atts = parseAttachments(ticket)
                                  return atts.length > 0 ? (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-2">
                                        <Paperclip className="h-3 w-3 inline mr-1" />
                                        {t('admin.supportTickets.detail.attachments')} ({atts.length})
                                      </p>
                                      <div className="space-y-2">
                                        {atts.map((att, idx) => (
                                          <AdminAttachmentItem key={idx} att={att} />
                                        ))}
                                      </div>
                                    </div>
                                  ) : null
                                })()}

                                {/* Admin actions */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
                                  {/* Status */}
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground">{t('admin.supportTickets.detail.statusLabel')}</p>
                                    <Select
                                      value={ticket.status}
                                      onValueChange={v => handleUpdate(ticket.id, { status: v })}
                                    >
                                      <SelectTrigger className="h-8 text-sm">
                                        <SelectValue>
                                          {ticket.status === 'in_progress'
                                            ? t('admin.supportTickets.status.inProgress')
                                            : t(`admin.supportTickets.status.${ticket.status}`)}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="open">{t('admin.supportTickets.status.open')}</SelectItem>
                                        <SelectItem value="in_progress">{t('admin.supportTickets.status.inProgress')}</SelectItem>
                                        <SelectItem value="resolved">{t('admin.supportTickets.status.resolved')}</SelectItem>
                                        <SelectItem value="closed">{t('admin.supportTickets.status.closed')}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Priority */}
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground">{t('admin.supportTickets.detail.priorityLabel')}</p>
                                    <Select
                                      value={ticket.priority ?? 'medium'}
                                      onValueChange={v => handleUpdate(ticket.id, { priority: v })}
                                    >
                                      <SelectTrigger className="h-8 text-sm">
                                        <SelectValue>
                                          {t(`admin.supportTickets.priority.${ticket.priority ?? 'medium'}`)}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="low">{t('admin.supportTickets.priority.low')}</SelectItem>
                                        <SelectItem value="medium">{t('admin.supportTickets.priority.medium')}</SelectItem>
                                        <SelectItem value="high">{t('admin.supportTickets.priority.high')}</SelectItem>
                                        <SelectItem value="urgent">{t('admin.supportTickets.priority.urgent')}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Resolved info */}
                                  {ticket.resolved_at && (
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-medium text-muted-foreground">{t('admin.supportTickets.detail.resolvedAt')}</p>
                                      <p className="text-sm">{formatDate(ticket.resolved_at)}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Admin note */}
                                <div className="space-y-1.5">
                                  <p className="text-xs font-medium text-muted-foreground">{t('admin.supportTickets.detail.adminNote')}</p>
                                  <Textarea
                                    rows={3}
                                    placeholder={t('admin.supportTickets.detail.adminNotePlaceholder')}
                                    value={editNote[ticket.id] ?? ticket.admin_note ?? ''}
                                    onChange={e => setEditNote(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                                    className="text-sm"
                                  />
                                  <Button
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    disabled={saving[ticket.id]}
                                    onClick={() => handleUpdate(ticket.id, { admin_note: editNote[ticket.id] ?? ticket.admin_note ?? '' })}
                                  >
                                    {saving[ticket.id]
                                      ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />{t('admin.supportTickets.detail.saving')}</>
                                      : <><Save className="h-4 w-4 mr-2" />{t('admin.supportTickets.detail.save')}</>
                                    }
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={pendingDeleteTicketId !== null} onOpenChange={(open) => !open && setPendingDeleteTicketId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.supportTickets.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.supportTickets.delete.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.supportTickets.delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteTicket} className="bg-destructive hover:bg-destructive/90">{t('admin.supportTickets.delete.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react'
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

export default function CompartmentManagementPage() {
  const { t } = useTranslation()
  const [compartments, setCompartments] = useState<Compartment[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCompartment, setSelectedCompartment] = useState<Compartment | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const loadCompartments = async () => {
    try {
      setLoading(true)
      const data = await getCompartments()
      setCompartments(data)
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

  useEffect(() => {
    loadCompartments()
  }, [])

  const handleDeleteClick = (compartment: Compartment) => {
    setSelectedCompartment(compartment)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedCompartment) return
    const compartmentToDelete = selectedCompartment

    // Close dialog immediately so user can delete other compartments right away
    setDeleteDialogOpen(false)
    setSelectedCompartment(null)
    setDeletingIds(prev => new Set(prev).add(compartmentToDelete.id))

    try {
      await deleteCompartment(compartmentToDelete.name)
      
      // Backend returns 202 - deletion initiated in background
      toast({
        title: t('admin.compartment.toast.deleteInitiated', { name: compartmentToDelete.name }),
        description: t('admin.compartment.toast.deleteInitiatedDesc'),
      })

      // Reload immediately to show DELETING state, then auto-refresh after 10s
      await loadCompartments()
      setTimeout(() => loadCompartments(), 10000)
    } catch (error: any) {
      toast({
        title: t('admin.compartment.toast.deleteError', { message: '' }).split(':')[0],
        description: t('admin.compartment.toast.deleteError', { message: error.response?.data?.message || error.message }),
        variant: 'destructive',
      })
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(compartmentToDelete.id)
        return next
      })
    }
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'ACTIVE':
        return 'bg-green-500'
      case 'CREATING':
        return 'bg-blue-500'
      case 'DELETING':
        return 'bg-orange-500'
      case 'DELETED':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.compartment.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('admin.compartment.subtitle')}
          </p>
        </div>
        <Button onClick={loadCompartments} disabled={loading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('admin.compartment.refresh')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">{t('admin.compartment.loading')}</span>
        </div>
      ) : compartments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
          {t('admin.compartment.noCompartments')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {compartments.map((compartment) => (
            <Card key={compartment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{compartment.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {compartment.description || t('admin.compartment.noDescription')}
                    </p>
                  </div>
                  <Badge className={getStateColor(compartment.lifecycleState)}>
                    {compartment.lifecycleState}
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
                    <p className="text-sm">
                      {formatDateTime(compartment.timeCreated)}
                    </p>
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
                <strong className="text-foreground">
                  {selectedCompartment?.name}
                </strong>
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
              <p className="font-medium">
                {t('admin.compartment.dialog.irreversible')}
              </p>
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

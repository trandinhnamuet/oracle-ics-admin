'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Zap,
  Shield,
  Crown,
  BrainCircuit,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/hooks/use-auth-store'
import {
  CloudPackage,
  getAllCloudPackages,
  createCloudPackage,
  updateCloudPackage,
  deleteCloudPackage,
} from '@/api/cloud-package.api'
import CreateNewPackagePopup from './components/create-new-package-popup'

const CATEGORY_INFO: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  starter:      { name: 'Starter',       icon: Zap,          color: 'bg-blue-500' },
  professional: { name: 'Professional',  icon: Shield,        color: 'bg-green-500' },
  enterprise:   { name: 'Enterprise',    icon: Crown,         color: 'bg-purple-500' },
  ai:           { name: 'AI',            icon: BrainCircuit,  color: 'bg-orange-500' },
}

export default function PackagesManagementPage() {
  const { toast } = useToast()
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)

  const [packages, setPackages] = useState<CloudPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<CloudPackage | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const fetchPackages = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const data = await getAllCloudPackages(token)
      setPackages(data)
    } catch {
      toast({ title: t('admin.packages.management.toast.loadError'), variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPackages()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Filter
  const filteredPackages = packages.filter((pkg) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      pkg.name.toLowerCase().includes(term) ||
      (pkg.type ?? '').toLowerCase().includes(term)
    const matchesCategory =
      selectedCategory === 'all' || pkg.type === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleCreatePackage = async (data: Partial<CloudPackage>) => {
    if (!token) return
    try {
      await createCloudPackage(token, data)
      toast({ title: t('admin.packages.management.toast.createSuccess') })
      await fetchPackages()
    } catch {
      toast({ title: t('admin.packages.management.toast.createError'), variant: 'destructive' })
    }
  }

  const handleUpdatePackage = async (data: Partial<CloudPackage>) => {
    if (!token || !editingPackage) return
    try {
      await updateCloudPackage(token, editingPackage.id, data)
      toast({ title: t('admin.packages.management.toast.updateSuccess') })
      await fetchPackages()
    } catch {
      toast({ title: t('admin.packages.management.toast.updateError'), variant: 'destructive' })
    }
  }

  const handleDeletePackage = (id: number) => {
    if (!token) return
    setPendingDeleteId(id)
  }

  const executeDeletePackage = async () => {
    if (!token || pendingDeleteId === null) return
    const id = pendingDeleteId
    setPendingDeleteId(null)
    try {
      await deleteCloudPackage(token, id)
      toast({ title: t('admin.packages.management.toast.deleteSuccess') })
      setPackages((prev) => prev.filter((p) => p.id !== id))
    } catch {
      toast({ title: t('admin.packages.management.toast.deleteError'), variant: 'destructive' })
    }
  }

  const handleEditPackage = (pkg: CloudPackage) => {
    setEditingPackage(pkg)
    setIsCreateModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
    setEditingPackage(null)
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground">
              {t('admin.packages.management.title')}
            </h1>
            <p className="text-gray-600 dark:text-muted-foreground">{t('admin.packages.management.subtitle')}</p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#E60000] hover:bg-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('admin.packages.management.createNewPackage')}
          </Button>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={t('admin.packages.management.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-border rounded-md bg-white dark:bg-background dark:text-foreground"
                >
                  <option value="all">{t('admin.packages.management.filter.allCategories')}</option>
                  <option value="starter">{t('admin.packages.management.filter.starter')}</option>
                  <option value="professional">{t('admin.packages.management.filter.professional')}</option>
                  <option value="enterprise">{t('admin.packages.management.filter.enterprise')}</option>
                  <option value="ai">{t('admin.packages.management.filter.ai')}</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {Object.entries(CATEGORY_INFO).map(([key, info]) => {
            const count = packages.filter((p) => p.type === key).length
            const Icon = info.icon
            return (
              <Card key={key}>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${info.color} mr-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-muted-foreground">{info.name}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-foreground">{count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Package Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t('admin.packages.management.packageCount', { count: filteredPackages.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E60000]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-muted border-b dark:border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase tracking-wider">
                        {t('admin.packagesExtra.table.package')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase tracking-wider">
                        {t('admin.packagesExtra.table.type')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase tracking-wider">
                        {t('admin.packagesExtra.table.price')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase tracking-wider">
                        {t('admin.packagesExtra.table.specs')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase tracking-wider">
                        {t('admin.packagesExtra.table.features')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase tracking-wider">
                        {t('admin.packagesExtra.table.status')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase tracking-wider">
                        {t('admin.packagesExtra.table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-card divide-y divide-gray-200 dark:divide-border">
                    {filteredPackages.map((pkg) => {
                      const catKey = pkg.type ?? 'starter'
                      const catInfo = CATEGORY_INFO[catKey] ?? CATEGORY_INFO.starter
                      const Icon = catInfo.icon
                      return (
                        <tr key={pkg.id} className="hover:bg-gray-50 dark:hover:bg-muted/50">
                          {/* Name */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`p-2 rounded-lg ${catInfo.color} mr-3`}>
                                <Icon className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-foreground">{pkg.name}</div>
                                <div className="text-xs text-gray-500 dark:text-muted-foreground">{t('admin.packages.management.table.idLabel')}: {pkg.id}</div>
                              </div>
                            </div>
                          </td>
                          {/* Type */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline">{catInfo.name}</Badge>
                          </td>
                          {/* Price */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900 dark:text-foreground">
                              ${Number(pkg.cost).toFixed(2)}/mo
                            </div>
                            <div className="text-xs text-gray-500 dark:text-muted-foreground">
                              {Number(pkg.cost_vnd).toLocaleString('vi-VN')} ₫
                            </div>
                          </td>
                          {/* Specs */}
                          <td className="px-6 py-4">
                            <div className="text-xs text-gray-600 dark:text-muted-foreground space-y-0.5">
                              {pkg.cpu && <div>{t('admin.packages.management.table.specs.cpu')}: {pkg.cpu}</div>}
                              {pkg.ram && <div>{t('admin.packages.management.table.specs.ram')}: {pkg.ram}</div>}
                              {pkg.memory && <div>{t('admin.packages.management.table.specs.ssd')}: {pkg.memory}</div>}
                              {pkg.bandwidth && <div>{t('admin.packages.management.table.specs.bw')}: {pkg.bandwidth}</div>}
                            </div>
                          </td>
                          {/* Feature text */}
                          <td className="px-6 py-4">
                            <div
                              className="text-xs text-gray-600 dark:text-muted-foreground max-w-[180px] truncate"
                              title={pkg.feature ?? ''}
                            >
                              {pkg.feature || '—'}
                            </div>
                          </td>
                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {pkg.is_active ? (
                              <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0 gap-1">
                                <CheckCircle className="h-3 w-3" /> {t('admin.packages.management.table.active')}
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 dark:bg-muted text-gray-500 dark:text-muted-foreground border-0 gap-1">
                                <XCircle className="h-3 w-3" /> {t('admin.packages.management.table.inactive')}
                              </Badge>
                            )}
                          </td>
                          {/* Actions */}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPackage(pkg)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePackage(pkg.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {filteredPackages.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-muted-foreground">{t('admin.packages.management.table.noPackagesFound')}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Popup */}
        <CreateNewPackagePopup
          isOpen={isCreateModalOpen}
          onClose={handleCloseModal}
          onCreatePackage={handleCreatePackage}
          editingPackage={editingPackage}
          onUpdatePackage={handleUpdatePackage}
        />
        <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.packagesExtra.dialog.deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('admin.packagesExtra.dialog.deleteDesc')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('admin.packagesExtra.dialog.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={executeDeletePackage} className="bg-destructive hover:bg-destructive/90">{t('admin.packagesExtra.dialog.delete')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  )
}

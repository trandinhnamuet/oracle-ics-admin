'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from 'react-i18next'
import { CloudPackage } from '@/api/cloud-package.api'

interface CreateNewPackagePopupProps {
  isOpen: boolean
  onClose: () => void
  onCreatePackage: (packageData: Partial<CloudPackage>) => Promise<void>
  editingPackage?: CloudPackage | null
  onUpdatePackage?: (packageData: Partial<CloudPackage>) => Promise<void>
}

type FormData = {
  name: string
  type: string
  cost: string
  cost_vnd: string
  cpu: string
  ram: string
  memory: string
  bandwidth: string
  feature: string
  is_active: boolean
}

const defaultForm: FormData = {
  name: '',
  type: 'starter',
  cost: '',
  cost_vnd: '',
  cpu: '',
  ram: '',
  memory: '',
  bandwidth: '',
  feature: '',
  is_active: true,
}

export default function CreateNewPackagePopup({
  isOpen,
  onClose,
  onCreatePackage,
  editingPackage = null,
  onUpdatePackage,
}: CreateNewPackagePopupProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>(defaultForm)

  useEffect(() => {
    if (editingPackage) {
      setFormData({
        name: editingPackage.name ?? '',
        type: editingPackage.type ?? 'starter',
        cost: String(editingPackage.cost ?? ''),
        cost_vnd: String(editingPackage.cost_vnd ?? ''),
        cpu: editingPackage.cpu ?? '',
        ram: editingPackage.ram ?? '',
        memory: editingPackage.memory ?? '',
        bandwidth: editingPackage.bandwidth ?? '',
        feature: editingPackage.feature ?? '',
        is_active: editingPackage.is_active ?? true,
      })
    } else {
      setFormData(defaultForm)
    }
  }, [editingPackage, isOpen])

  const handleSubmit = async () => {
    if (!formData.name || !formData.cost) {
      toast({
        title: t('admin.packages.createPackage.validation.error'),
        description: t('admin.packages.createPackage.validation.fillAllFields'),
        variant: 'destructive',
      })
      return
    }

    const payload: Partial<CloudPackage> = {
      name: formData.name,
      type: formData.type || null,
      cost: parseFloat(formData.cost),
      cost_vnd: parseFloat(formData.cost_vnd) || 0,
      cpu: formData.cpu || null,
      ram: formData.ram || null,
      memory: formData.memory || null,
      bandwidth: formData.bandwidth || null,
      feature: formData.feature || null,
      is_active: formData.is_active,
    }

    setIsSubmitting(true)
    try {
      if (editingPackage && onUpdatePackage) {
        await onUpdatePackage(payload)
      } else {
        await onCreatePackage(payload)
      }
      handleClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData(defaultForm)
    onClose()
  }

  const field = (id: keyof FormData, label: string, placeholder = '') => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={formData[id] as string}
        onChange={(e) => setFormData({ ...formData, [id]: e.target.value })}
        placeholder={placeholder}
      />
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPackage
              ? t('admin.packages.createPackage.title.edit')
              : t('admin.packages.createPackage.title.create')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name + Type */}
          <div className="grid grid-cols-2 gap-4">
            {field('name', t('admin.packages.createPackage.form.packageName'), 'e.g. Starter Basic')}
            <div>
              <Label htmlFor="type">{t('admin.packages.createPackage.form.category')}</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-md bg-white dark:bg-background dark:text-foreground"
              >
                <option value="starter">{t('admin.packages.createPackage.form.categoryOptions.starter')}</option>
                <option value="professional">{t('admin.packages.createPackage.form.categoryOptions.professional')}</option>
                <option value="enterprise">{t('admin.packages.createPackage.form.categoryOptions.enterprise')}</option>
                <option value="ai">{t('admin.packages.createPackage.form.categoryOptions.ai')}</option>
              </select>
            </div>
          </div>

          {/* Cost + Cost VND */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost">{t('admin.packagesExtra.createForm.priceUSD')}</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="cost_vnd">{t('admin.packagesExtra.createForm.priceVND')}</Label>
              <Input
                id="cost_vnd"
                type="number"
                step="1"
                min="0"
                value={formData.cost_vnd}
                onChange={(e) => setFormData({ ...formData, cost_vnd: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 gap-4">
            {field('cpu', 'CPU', 'e.g. 2 vCPU')}
            {field('ram', 'RAM', 'e.g. 4 GB')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('memory', t('admin.packagesExtra.createForm.storage'), t('admin.packagesExtra.createForm.storagePlaceholder'))}
            {field('bandwidth', t('admin.packagesExtra.createForm.bandwidthLabel'), t('admin.packagesExtra.createForm.bandwidthPlaceholder'))}
          </div>

          {/* Feature (free text) */}
          <div>
            <Label htmlFor="feature">{t('admin.packagesExtra.createForm.feature')}</Label>
            <textarea
              id="feature"
              value={formData.feature}
              onChange={(e) => setFormData({ ...formData, feature: e.target.value })}
              placeholder={t('admin.packagesExtra.createForm.featurePlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-md resize-none text-sm bg-white dark:bg-background dark:text-foreground"
            />
          </div>

          {/* is_active */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <Label htmlFor="is_active">{t('admin.packagesExtra.createForm.isActive')}</Label>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {t('admin.packages.createPackage.buttons.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#E60000] hover:bg-red-700"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t('admin.packagesExtra.createForm.saving')
              : editingPackage
              ? t('admin.packages.createPackage.buttons.update')
              : t('admin.packages.createPackage.buttons.create')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

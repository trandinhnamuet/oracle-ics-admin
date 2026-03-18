'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import useAuthStore from '@/hooks/use-auth-store'
import axios from 'axios'

const createFormSchema = (t: any) => z.object({
  userName: z.string().min(2, t('homepage.form.customRegistration.validation.userNameMin')),
  email: z.string().email(t('homepage.form.customRegistration.validation.emailInvalid')),
  phoneNumber: z.string().min(10, t('homepage.form.customRegistration.validation.phoneNumberMin')).max(20, t('homepage.form.customRegistration.validation.phoneNumberMax')),
  company: z.string().optional(),
    cpu: z.string().min(1, t('homepage.form.customRegistration.validation.cpuRequired')),
    ram: z.string().min(1, t('homepage.form.customRegistration.validation.ramRequired')),
    storage: z.string().optional(),
    bandwidth: z.string().optional(),
  additionalNotes: z.string().optional(),
})

interface CustomRegistrationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CustomRegistrationForm({ open, onOpenChange }: CustomRegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { user, isAuthenticated } = useAuthStore()
  const { t } = useTranslation()
  
  const formSchema = createFormSchema(t)
  type FormValues = z.infer<typeof formSchema>

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userName: '',
      email: '',
      phoneNumber: '',
      company: '',
      cpu: '',
      ram: '',
      storage: '',
      bandwidth: '',
      additionalNotes: '',
    },
  })

  // Autofill form khi có thông tin user và form được mở
  useEffect(() => {
    if (open && isAuthenticated && user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
      form.reset({
        userName: fullName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        company: user.company || '',
        cpu: '',
        ram: '',
        storage: '',
        bandwidth: '',
        additionalNotes: '',
      })
    }
  }, [open, isAuthenticated, user, form])

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true)
    try {

      // Gộp thông tin detail thành JSON
      const detail = {
        cpu: values.cpu,
        ram: values.ram,
        storage: values.storage || '',
        bandwidth: values.bandwidth || '',
        additionalNotes: values.additionalNotes || ''
      }

      const payload = {
        userId: user?.id ? parseInt(user.id) : undefined,
        phoneNumber: values.phoneNumber,
        email: values.email,
        company: values.company || '',
  detail: JSON.stringify(detail),
        createdBy: values.userName,
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'
      await axios.post(`${API_URL}/custom-package-registrations`, payload)

      toast({
        title: t('homepage.form.customRegistration.success.title'),
        description: t('homepage.form.customRegistration.success.description'),
        variant: 'success',
      })

      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Registration error:', error)
      toast({
        title: t('homepage.form.customRegistration.error.title'),
        description: t('homepage.form.customRegistration.error.description'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('homepage.form.customRegistration.title')}</DialogTitle>
          <DialogDescription>
            {t('homepage.form.customRegistration.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="userName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('homepage.form.customRegistration.userName')} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('homepage.form.customRegistration.placeholders.userName')} {...field} className="placeholder:text-gray-400" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('homepage.form.customRegistration.email')} *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('homepage.form.customRegistration.placeholders.email')} {...field} className="placeholder:text-gray-400" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('homepage.form.customRegistration.phoneNumber')} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('homepage.form.customRegistration.placeholders.phoneNumber')} {...field} className="placeholder:text-gray-400" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('homepage.form.customRegistration.company')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('homepage.form.customRegistration.placeholders.company')} {...field} className="placeholder:text-gray-400" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('homepage.form.customRegistration.configRequirements')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cpu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('homepage.form.customRegistration.cpu')} *</FormLabel>
                      <FormControl>
                        <Input placeholder={t('homepage.form.customRegistration.placeholders.cpu')} {...field} className="placeholder:text-gray-400" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('homepage.form.customRegistration.ram')} *</FormLabel>
                      <FormControl>
                        <Input placeholder={t('homepage.form.customRegistration.placeholders.ram')} {...field} className="placeholder:text-gray-400" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="storage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('homepage.form.customRegistration.storage')} *</FormLabel>
                      <FormControl>
                        <Input placeholder={t('homepage.form.customRegistration.placeholders.storage')} {...field} className="placeholder:text-gray-400" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bandwidth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('homepage.form.customRegistration.bandwidth')} *</FormLabel>
                      <FormControl>
                        <Input placeholder={t('homepage.form.customRegistration.placeholders.bandwidth')} {...field} className="placeholder:text-gray-400" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('homepage.form.customRegistration.additionalNotes')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('homepage.form.customRegistration.placeholders.additionalNotes')}
                        className="min-h-[100px] placeholder:text-gray-400"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {t('homepage.form.customRegistration.buttons.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('homepage.form.customRegistration.buttons.register')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

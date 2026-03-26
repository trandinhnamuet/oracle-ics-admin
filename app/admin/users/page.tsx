'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import axios from 'axios'
import * as XLSX from 'xlsx'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Search, Download, Users, Calendar, Building, Trash2, Crown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Pencil } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toggleUserAdminRole } from '@/api/user.api'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/hooks/use-toast'
import { formatDateTime, formatDateOnly } from '@/lib/utils'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  phoneNumber?: string | null
  company?: string | null
  role?: string
  isActive: boolean
  gender?: string | null
  idCard?: string | null
  backupEmail?: string | null
  address?: string | null
  createdAt: string
  updatedAt: string
}

interface EditForm {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  company: string
  role: string
  isActive: boolean
  gender: string
  idCard: string
  backupEmail: string
  address: string
}

interface PaginatedResponse {
  data: User[]
  total: number
  totalActive: number
  totalInactive: number
  page: number
  limit: number
  totalPages: number
}

type SortOrder = 'ASC' | 'DESC'
type SortableColumn = 'id' | 'email' | 'firstName' | 'lastName' | 'company' | 'role' | 'isActive' | 'createdAt' | 'updatedAt'

const PAGE_SIZE = 20

export default function UserManagementPage() {
  const { t, i18n } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalActive, setTotalActive] = useState(0)
  const [totalInactive, setTotalInactive] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState<SortableColumn>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC')
  const { toast } = useToast()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    company: '',
    role: 'customer',
    isActive: true,
    gender: '',
    idCard: '',
    backupEmail: '',
    address: '',
  })

  const fetchUsers = useCallback(async (currentPage: number, search: string, col: SortableColumn, order: SortOrder) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_SIZE),
        search,
        sortBy: col,
        sortOrder: order,
      })
      const res = await axios.get<PaginatedResponse>(`${API_URL}/users?${params}`)
      setUsers(res.data.data)
      setTotal(res.data.total)
      setTotalActive(res.data.totalActive)
      setTotalInactive(res.data.totalInactive)
      setTotalPages(res.data.totalPages)
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers([])
      setTotal(0)
      setTotalActive(0)
      setTotalInactive(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [API_URL])

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 400)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [searchTerm])

  useEffect(() => {
    fetchUsers(page, debouncedSearch, sortBy, sortOrder)
  }, [page, debouncedSearch, sortBy, sortOrder, fetchUsers])

  // Animation effect
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      company: user.company || '',
      role: user.role || 'customer',
      isActive: user.isActive,
      gender: user.gender || '',
      idCard: user.idCard || '',
      backupEmail: user.backupEmail || '',
      address: user.address || '',
    })
    setEditDialogOpen(true)
  }

  const saveEditUser = async () => {
    if (!editingUser) return
    setEditSaving(true)
    try {
      await axios.patch(`${API_URL}/users/${editingUser.id}`, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phoneNumber: editForm.phoneNumber || null,
        company: editForm.company || null,
        role: editForm.role,
        isActive: editForm.isActive,
        gender: editForm.gender || null,
        idCard: editForm.idCard || null,
        backupEmail: editForm.backupEmail || null,
        address: editForm.address || null,
      })
      toast({ title: t('admin.users.toast.updateSuccess') })
      setEditDialogOpen(false)
      fetchUsers(page, debouncedSearch, sortBy, sortOrder)
    } catch (error) {
      console.error('Error updating user:', error)
      toast({ title: t('common.error'), description: t('admin.users.toast.updateError'), variant: 'destructive' })
    } finally {
      setEditSaving(false)
    }
  }

  // Toggle user active status
  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await axios.patch(`${API_URL}/users/${userId}`, { isActive: !currentStatus })
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isActive: !currentStatus } : user
      ))
    } catch (error) {
      console.error('Error updating user status:', error)
    }
  }

  // Delete user
  const deleteUser = (userId: number) => {
    setPendingDeleteUserId(userId)
  }

  const executeDeleteUser = async () => {
    if (pendingDeleteUserId === null) return
    const userId = pendingDeleteUserId
    setPendingDeleteUserId(null)
    try {
      await axios.delete(`${API_URL}/users/${userId}`)
      toast({ title: t('admin.users.toast.deleteSuccess') })
      fetchUsers(page, debouncedSearch, sortBy, sortOrder)
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({ title: t('common.error'), description: t('admin.users.toast.deleteError'), variant: 'destructive' })
    }
  }

  // Toggle admin role
  const toggleAdminRole = async (userId: number, currentRole: string = 'customer') => {
    try {
      const updatedUser = await toggleUserAdminRole(userId, currentRole)
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: updatedUser.role } : user
      ))
    } catch (error) {
      console.error('Error toggling admin role:', error)
    }
  }

  // Export to Excel
  const handleSort = (col: SortableColumn) => {
    if (sortBy === col) {
      setSortOrder(o => o === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortBy(col)
      setSortOrder('ASC')
    }
    setPage(1)
  }

  const SortIcon = ({ col }: { col: SortableColumn }) => {
    if (sortBy !== col) return <ChevronsUpDown className="inline h-3 w-3 ml-1 text-muted-foreground" />
    return sortOrder === 'ASC'
      ? <ChevronUp className="inline h-3 w-3 ml-1" />
      : <ChevronDown className="inline h-3 w-3 ml-1" />
  }

  // Export to Excel
  const exportToExcel = async () => {
    const locale = i18n.language
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: String(total || 10000),
        search: debouncedSearch,
        sortBy,
        sortOrder,
      })
      const res = await axios.get<PaginatedResponse>(`${API_URL}/users?${params}`)
      const allUsers = res.data.data

      const exportData = allUsers.map(user => ({
        'ID': user.id,
        'Email': user.email,
        [t('admin.users.export.fullName')]: `${user.firstName} ${user.lastName}`,
        [t('admin.users.export.phone')]: user.phoneNumber || t('admin.users.export.notAvailable'),
        [t('admin.users.export.company')]: user.company || t('admin.users.export.notAvailable'),
        [t('admin.users.export.role')]: user.role === 'admin' ? 'Admin' : 'Customer',
        [t('admin.users.export.status')]: user.isActive ? t('admin.users.export.active') : t('admin.users.export.locked'),
        [t('admin.users.export.createdAt')]: formatDateOnly(user.createdAt, locale),
        [t('admin.users.export.updatedAt')]: formatDateOnly(user.updatedAt, locale)
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, t('admin.users.export.sheetName'))

      const colWidths = [
        { wch: 5 },   // ID
        { wch: 25 },  // Email
        { wch: 20 },  // Họ tên
        { wch: 15 },  // Số điện thoại
        { wch: 20 },  // Công ty
        { wch: 12 },  // Vai trò
        { wch: 12 },  // Trạng thái
        { wch: 12 },  // Ngày tạo
        { wch: 12 }   // Ngày cập nhật
      ]
      ws['!cols'] = colWidths

      const fileName = `users-${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)
    } catch (error) {
      console.error('Error exporting users:', error)
      toast({ title: t('common.error'), variant: 'destructive' })
    }
  }

  const stats = {
    total,
    active: totalActive,
    inactive: totalInactive,
  }

  if (initialLoad) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">{t('admin.user.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header Section */}
      <div className={`flex flex-col space-y-4 transition-all duration-700 transform ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('admin.user.title')}</h1>
            <p className="text-muted-foreground">{t('admin.user.subtitle')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            {t('admin.user.exportExcel')}
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t('admin.user.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div 
        className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-700 transform ${
          isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
        }`}
        style={{ transitionDelay: '200ms' }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.user.stats.total')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.user.stats.active')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.user.stats.inactive')}</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card 
        className={`transition-all duration-700 transform ${
          isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
        }`}
        style={{ transitionDelay: '400ms' }}
      >
        <CardHeader>
          <CardTitle>{t('admin.user.title')} ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none w-12 shrink-0" onClick={() => handleSort('id')}>
                    {t('admin.user.table.id')}<SortIcon col="id" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none min-w-[160px]" onClick={() => handleSort('email')}>
                    {t('admin.user.table.email')}<SortIcon col="email" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none min-w-[120px]" onClick={() => handleSort('firstName')}>
                    {t('admin.user.table.name')}<SortIcon col="firstName" />
                  </TableHead>
                  <TableHead className="min-w-[110px]">{t('admin.user.table.phone')}</TableHead>
                  <TableHead className="cursor-pointer select-none min-w-[120px]" onClick={() => handleSort('company')}>
                    {t('admin.user.table.company')}<SortIcon col="company" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none min-w-[80px]" onClick={() => handleSort('role')}>
                    {t('admin.user.table.role')}<SortIcon col="role" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none min-w-[120px]" onClick={() => handleSort('isActive')}>
                    {t('admin.user.table.status')}<SortIcon col="isActive" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none min-w-[130px] whitespace-nowrap" onClick={() => handleSort('createdAt')}>
                    {t('admin.user.table.createdAt')}<SortIcon col="createdAt" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none min-w-[130px] whitespace-nowrap" onClick={() => handleSort('updatedAt')}>
                    {t('admin.user.table.updatedAt')}<SortIcon col="updatedAt" />
                  </TableHead>
                  <TableHead className="min-w-[100px]">{t('admin.user.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      {t('admin.user.loading')}
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      {debouncedSearch ? t('admin.user.table.noUserFound') : t('admin.user.table.noUser')}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium shrink-0">{user.id}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="block truncate" title={user.email}>{user.email}</span>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <span className="block break-words">{user.firstName} {user.lastName}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {user.phoneNumber ? (
                          <span>{user.phoneNumber}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-muted-foreground italic">{t('admin.user.table.noData')}</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        {user.company ? (
                          <span className="block truncate" title={user.company}>{user.company}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-muted-foreground italic">{t('admin.user.table.noData')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'destructive' : 'outline'}>
                          {user.role === 'admin' ? t('admin.user.table.admin') : t('admin.user.table.customer')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={() => toggleUserStatus(user.id, user.isActive)}
                          />
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? t('admin.user.table.active') : t('admin.user.table.inactive')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(user.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(user.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <div title={t('admin.users.editTooltip')}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                          <div title={user.role === 'admin' ? t('admin.user.actions.revokeAdmin') : t('admin.user.actions.grantAdmin')}>
                            <Button
                              variant={user.role === 'admin' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => toggleAdminRole(user.id, user.role || 'customer')}
                              className={user.role === 'admin' ? 'text-white bg-yellow-600 hover:bg-yellow-700' : ''}
                            >
                              <Crown className="h-4 w-4" />
                            </Button>
                          </div>
                          <div title={t('admin.user.actions.delete')}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {t('admin.users.pagination.info', { current: page, total: totalPages, count: total })}
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const startPage = Math.max(1, Math.min(page - 2, totalPages - 4))
                  const pageNum = startPage + i
                  if (pageNum > totalPages) return null
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      disabled={loading}
                      className="w-9"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin.users.editDialog.title', { id: editingUser?.id })}</DialogTitle>
            <DialogDescription>{t('admin.users.editDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('admin.users.editDialog.lastName')}</Label>
                <Input value={editForm.lastName} onChange={(e) => setEditForm(f => ({ ...f, lastName: e.target.value }))} placeholder={t('admin.users.editDialog.lastName')} />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.users.editDialog.firstName')}</Label>
                <Input value={editForm.firstName} onChange={(e) => setEditForm(f => ({ ...f, firstName: e.target.value }))} placeholder={t('admin.users.editDialog.firstName')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('admin.users.editDialog.email')}</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder={t('admin.users.editDialog.email')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('admin.users.editDialog.phone')}</Label>
                <Input value={editForm.phoneNumber} onChange={(e) => setEditForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder={t('admin.users.editDialog.phone')} />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.users.editDialog.backupEmail')}</Label>
                <Input type="email" value={editForm.backupEmail} onChange={(e) => setEditForm(f => ({ ...f, backupEmail: e.target.value }))} placeholder={t('admin.users.editDialog.backupEmail')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('admin.users.editDialog.company')}</Label>
              <Input value={editForm.company} onChange={(e) => setEditForm(f => ({ ...f, company: e.target.value }))} placeholder={t('admin.users.editDialog.company')} />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.users.editDialog.address')}</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder={t('admin.users.editDialog.address')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('admin.users.editDialog.idCard')}</Label>
                <Input value={editForm.idCard} onChange={(e) => setEditForm(f => ({ ...f, idCard: e.target.value }))} placeholder={t('admin.users.editDialog.idCard')} />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.users.editDialog.gender')}</Label>
                <Select value={editForm.gender} onValueChange={(v) => setEditForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.users.editDialog.genderPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('admin.users.editDialog.male')}</SelectItem>
                    <SelectItem value="female">{t('admin.users.editDialog.female')}</SelectItem>
                    <SelectItem value="other">{t('admin.users.editDialog.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('admin.users.editDialog.role')}</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">{t('admin.users.editDialog.roleCustomer')}</SelectItem>
                    <SelectItem value="admin">{t('admin.users.editDialog.roleAdmin')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('admin.users.editDialog.statusLabel')}</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    checked={editForm.isActive}
                    onCheckedChange={(checked) => setEditForm(f => ({ ...f, isActive: checked }))}
                  />
                  <span className="text-sm">{editForm.isActive ? t('admin.users.editDialog.active') : t('admin.users.editDialog.locked')}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={editSaving}>{t('admin.users.editDialog.cancel')}</Button>
            <Button onClick={saveEditUser} disabled={editSaving}>
              {editSaving ? t('admin.users.editDialog.saving') : t('admin.users.editDialog.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDeleteUserId !== null} onOpenChange={(open) => !open && setPendingDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.users.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.users.deleteDialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.users.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteUser} className="bg-destructive hover:bg-destructive/90">{t('admin.users.deleteDialog.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

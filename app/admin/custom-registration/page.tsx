
'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import * as XLSX from 'xlsx'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Filter, Download, Users, Calendar, Building } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDateOnly, formatDateTime } from '@/lib/utils'

interface CustomRegistration {
  id: number
  userId?: number
  phoneNumber: string
  email: string
  company?: string
  detail: string // JSON string
  createdAt: string
  createdBy?: string
  processed?: boolean
}

export default function CustomRegistrationAdminPage() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<CustomRegistration[]>([])
  const [filteredData, setFilteredData] = useState<CustomRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [filterProcessed, setFilterProcessed] = useState<'all' | 'processed' | 'unprocessed'>('all')
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

  const handleProcessedChange = async (id: number, value: boolean) => {
    try {
      await axios.patch(`${API_URL}/custom-package-registrations/${id}`, { processed: value })
      setData((prev) => prev.map(item => item.id === id ? { ...item, processed: value } : item))
    } catch {}
  }

  // Hàm xuất Excel
  const exportToExcel = () => {
    const locale = i18n.language
    // Chuẩn bị dữ liệu cho Excel
    const exportData = filteredData.map(reg => ({
      'ID': reg.id,
      [t('admin.customRegistration.export.phone')]: reg.phoneNumber,
      'Email': reg.email,
      [t('admin.customRegistration.table.company')]: reg.company || t('admin.customRegistration.export.notAvailable'),
      [t('admin.customRegistration.export.detail')]: typeof reg.detail === 'object' ? JSON.stringify(reg.detail) : reg.detail,
      [t('admin.customRegistration.table.status')]: reg.processed ? t('admin.customRegistration.filter.processed') : t('admin.customRegistration.filter.unprocessed'),
      [t('admin.customRegistration.export.createdAt')]: formatDateOnly(reg.createdAt, locale),
      [t('admin.customRegistration.export.createdBy')]: reg.createdBy || t('admin.customRegistration.export.system')
    }))

    // Tạo workbook
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, t('admin.customRegistration.export.sheetName'))

    // Điều chỉnh độ rộng cột
    const colWidths = [
      { wch: 5 },   // ID
      { wch: 15 },  // Số điện thoại
      { wch: 25 },  // Email
      { wch: 20 },  // Công ty
      { wch: 30 },  // Chi tiết
      { wch: 12 },  // Trạng thái
      { wch: 12 },  // Ngày tạo
      { wch: 15 }   // Người tạo
    ]
    ws['!cols'] = colWidths

    // Xuất file
    const fileName = `custom-registrations-${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }
  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'
        const res = await axios.get(`${API_URL}/custom-package-registrations`)
        setData(res.data)
        setFilteredData(res.data)
      } catch (err) {
        setData([])
        setFilteredData([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Animation effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Filter and search logic
  useEffect(() => {
    let filtered = data

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.phoneNumber.includes(searchTerm) ||
        (item.createdBy && item.createdBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.company && item.company.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filter by processed status
    if (filterProcessed !== 'all') {
      filtered = filtered.filter(item => 
        filterProcessed === 'processed' ? item.processed : !item.processed
      )
    }

    setFilteredData(filtered)
  }, [data, searchTerm, filterProcessed])

  const stats = {
    total: data.length,
    processed: data.filter(item => item.processed).length,
    unprocessed: data.filter(item => !item.processed).length
  }


  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header Section */}
      <div className={`flex flex-col space-y-4 transition-all duration-700 transform ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('admin.customRegistration.title')}</h1>
            <p className="text-muted-foreground">{t('admin.customRegistration.subtitle')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            {t('admin.customRegistration.exportExcel')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-700 transform ${
          isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
        }`} style={{ transitionDelay: '200ms' }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.customRegistration.stats.total')}</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.customRegistration.stats.processed')}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.processed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.customRegistration.stats.unprocessed')}</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.unprocessed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className={`flex flex-col sm:flex-row gap-4 transition-all duration-700 transform ${
          isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
        }`} style={{ transitionDelay: '400ms' }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.customRegistration.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterProcessed}
              onChange={(e) => setFilterProcessed(e.target.value as any)}
              className="border rounded-md px-3 py-2 text-sm bg-background text-foreground border-border focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">{t('admin.customRegistration.filter.all')}</option>
              <option value="processed">{t('admin.customRegistration.filter.processed')}</option>
              <option value="unprocessed">{t('admin.customRegistration.filter.unprocessed')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}

      <Card className={`transition-all duration-700 transform ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
      }`} style={{ transitionDelay: '600ms' }}>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">{t('admin.customRegistration.loading')}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">{t('admin.customRegistration.table.id')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.customRegistration.table.user')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.customRegistration.table.contact')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.customRegistration.table.company')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.customRegistration.table.config')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.customRegistration.table.note')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.customRegistration.table.time')}</TableHead>
                    <TableHead className="font-semibold text-center">{t('admin.customRegistration.table.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => {
                    let detailObj: any = {}
                    try {
                      detailObj = JSON.parse(item.detail)
                    } catch {}
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">#{item.id}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{item.createdBy || 'N/A'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm">{item.email}</p>
                            <p className="text-sm text-muted-foreground">{item.phoneNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.company || t('admin.customRegistration.table.noCompany')}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {detailObj.cpu && <Badge variant="secondary" className="mr-1">{t('admin.customRegistration.table.cpu')}: {detailObj.cpu}</Badge>}
                            {detailObj.ram && <Badge variant="secondary" className="mr-1">{t('admin.customRegistration.table.ram')}: {detailObj.ram}</Badge>}
                            {detailObj.storage && <div><Badge variant="outline" className="mr-1">{t('admin.customRegistration.table.storage')}: {detailObj.storage}</Badge></div>}
                            {detailObj.bandwidth && <div><Badge variant="outline">{t('admin.customRegistration.table.bandwidth')}: {detailObj.bandwidth}</Badge></div>}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm text-muted-foreground truncate" title={detailObj.additionalNotes}>
                            {detailObj.additionalNotes || '-'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{formatDateTime(item.createdAt, i18n.language)}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={!!item.processed}
                              onCheckedChange={(checked) => handleProcessedChange(item.id, !!checked)}
                              className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredData.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                        {t('admin.customRegistration.table.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        {t('admin.customRegistration.footer', { current: filteredData.length, total: data.length })}
      </div>
    </div>
  )
}

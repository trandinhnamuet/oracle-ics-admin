'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, FileText, Package, HardDrive, DollarSign, LogIn, BarChart3, Activity, HeadphonesIcon, TrendingDown, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const adminLinks = (t: any) => [
	{
		title: t('admin.userTitle'),
		description: t('admin.userDesc'),
		href: '/admin/users',
		icon: Users,
		color: 'bg-blue-500',
		stats: t('admin.userStats', { count: 24 }),
	},
	{
		title: t('admin.customRegTitle'),
		description: t('admin.customRegDesc'),
		href: '/admin/custom-registration',
		icon: FileText,
		color: 'bg-green-500',
		stats: t('admin.customRegStats', { count: 5 }),
	},
	{
		title: t('admin.packagesTitle'),
		description: t('admin.packagesDesc'),
		href: '/admin/packages',
		icon: Package,
		color: 'bg-purple-500',
		stats: t('admin.packagesStats', { count: 25 }),
	},
    {
        title: t('admin.subscriptionsTitle'),
        description: t('admin.subscriptionsDesc'),
        href: '/admin/subscriptions',
        icon: Package,
        color: 'bg-orange-500',
        stats: t('admin.subscriptionsStats'),
    },
	{
		title: t('admin.paymentsTitle'),
		description: t('admin.paymentsDesc'),
		href: '/admin/payments',
		icon: DollarSign,
		color: 'bg-emerald-500',
		stats: t('admin.paymentsStats'),
	},
	{
		title: t('admin.loginHistoryTitle'),
		description: t('admin.loginHistoryDesc'),
		href: '/admin/login-history',
		icon: LogIn,
		color: 'bg-indigo-500',
		stats: t('admin.loginHistoryStats'),
	},
	{
		title: t('admin.compartmentTitle'),
		description: t('admin.compartmentDesc'),
		href: '/admin/compartment',
		icon: HardDrive,
		color: 'bg-red-500',
		stats: t('admin.compartmentStats'),
	},
	{
		title: t('admin.analyticsTitle'),
		description: t('admin.analyticsDesc'),
		href: '/admin/analytics',
		icon: BarChart3,
		color: 'bg-cyan-500',
		stats: t('admin.analyticsStats'),
	},
	{
		title: t('admin.bandwidthTitle'),
		description: t('admin.bandwidthDesc'),
		href: '/admin/bandwidth-management',
		icon: Activity,
		color: 'bg-pink-500',
		stats: t('admin.bandwidthStats'),
	},
	{
		title: t('admin.supportTicketsTitle'),
		description: t('admin.supportTicketsDesc'),
		href: '/admin/support-tickets',
		icon: HeadphonesIcon,
		color: 'bg-teal-500',
		stats: t('admin.supportTicketsStats'),
	},
	{
		title: t('admin.costsTitle'),
		description: t('admin.costsDesc'),
		href: '/admin/costs',
		icon: TrendingDown,
		color: 'bg-yellow-500',
		stats: t('admin.costsStats'),
	},
	{
		title: 'Quản lý Wallet Transactions',
		description: 'Xem lịch sử giao dịch ví của người dùng',
		href: '/admin/wallet-transactions',
		icon: Wallet,
		color: 'bg-amber-500',
		stats: 'Tất cả giao dịch',
	},
]

export default function AdminDashboard() {
	const { t } = useTranslation()
	const [isVisible, setIsVisible] = useState(false)

	useEffect(() => {
		// Trigger animation after component mounts
		const timer = setTimeout(() => {
			setIsVisible(true)
		}, 100)

		return () => clearTimeout(timer)
	}, [])

	const links = adminLinks(t)

	return (
		<div className="container mx-auto py-8 px-4 space-y-8 min-h-screen">
			{/* Admin Links */}
			<div
				className={`space-y-4 transition-all duration-700 transform ${
					isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
				}`}
			>
				<h2 className="text-2xl font-semibold">{t('admin.title')}</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{links.map((link, index) => (
						<Card
							key={index}
							className={`hover:shadow-lg transition-all duration-700 transform ${
								isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
							}`}
							style={{
								transitionDelay: `${index * 200}ms`,
							}}
						>
							<CardHeader>
								<div className="flex items-center space-x-4">
									<div className={`p-3 rounded-lg ${link.color}`}>
										<link.icon className="h-6 w-6 text-white" />
									</div>
									<div className="flex-1">
										<CardTitle className="text-lg">{link.title}</CardTitle>
										<p className="text-sm text-muted-foreground mt-1">
											{link.description}
										</p>
									</div>
								</div>
							</CardHeader>
							<CardContent className="pt-0">
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">{link.stats}</span>
									<Link href={link.href}>
										<Button variant="outline" size="sm">
											{t('admin.access')}
										</Button>
									</Link>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	)
}
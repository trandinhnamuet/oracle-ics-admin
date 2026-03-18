// hooks/use-payment-status.ts
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { paymentApi } from '@/api/payment.api'

export const usePaymentStatus = (userId: number, packageId: number, enabled: boolean = true) => {
  const [isPaid, setIsPaid] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!enabled || !userId || !packageId) return

    let interval: NodeJS.Timeout

    const checkPaymentStatus = async () => {
      try {
        setIsChecking(true)
        const result = await paymentApi.checkPaymentStatus(userId, packageId)
        
        if (result.isPaid) {
          setIsPaid(true)
          clearInterval(interval)
          
          // Chuyển sang trang success
          setTimeout(() => {
            router.push('/checkout/success')
          }, 1000)
        }
      } catch (error) {
        console.error('Error checking payment status:', error)
      } finally {
        setIsChecking(false)
      }
    }

    // Kiểm tra ngay lập tức
    checkPaymentStatus()

    // Sau đó kiểm tra mỗi 5 giây
    interval = setInterval(checkPaymentStatus, 5000)

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [userId, packageId, enabled, router])

  return { isPaid, isChecking }
}
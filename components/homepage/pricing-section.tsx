'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Check, Star, Zap, Shield, Crown, BrainCircuit, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight, Info, Wallet, CreditCard } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { customPlan } from "@/types/pricing-plans"
import { PricingCategory, PricingPlan } from "@/types/pricing-types"
import { CloudPackage, buildFeatures, getActiveCloudPackages } from "@/api/cloud-package.api"
import { formatPrice, roundMoney } from "@/lib/utils"
import CustomRegistrationForm from "./customRegistrationForm"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import BalanceDisplay from "@/components/wallet/balance-display"
import { subscribeWithBalance, subscribeWithPayment } from "@/api/subscription.api"
import { getUserBalance } from "@/api/user-wallet.api"

export function PricingSection() {
  const { t } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()
  const [expandedCategory, setExpandedCategory] = useState<string | null>('starter')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [closingCategory, setClosingCategory] = useState<string | null>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [showPaymentMethodPopup, setShowPaymentMethodPopup] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [monthsCount, setMonthsCount] = useState(1)
  const [userBalance, setUserBalance] = useState<number>(0)
  const [isConfirming, setIsConfirming] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<number>>(new Set())
  const isConfirmingRef = useRef(false)

  const togglePlanFeatures = (planId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedPlanIds(prev => {
      const next = new Set(prev)
      if (next.has(planId)) { next.delete(planId) } else { next.add(planId) }
      return next
    })
  }

  // ── Cloud packages from backend ──────────────────────────────────────────
  const [cloudPackages, setCloudPackages] = useState<CloudPackage[]>([])
  const [isLoadingPackages, setIsLoadingPackages] = useState(true)

  useEffect(() => {
    getActiveCloudPackages()
      .then(setCloudPackages)
      .catch(() => { /* backend may be down – show empty list */ })
      .finally(() => setIsLoadingPackages(false))
  }, [])

  // Map type → icon & i18n description key
  const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; description: string }> = {
    starter:      { icon: Zap,          description: 'pricing.categories.starter.description' },
    professional: { icon: Shield,        description: 'pricing.categories.professional.description' },
    enterprise:   { icon: Crown,         description: 'pricing.categories.enterprise.description' },
    ai:           { icon: BrainCircuit,  description: 'pricing.categories.ai.description' },
  }
  const CATEGORY_ORDER = ['starter', 'professional', 'enterprise', 'ai']

  /** Dynamic pricingCategories built from the DB records */
  const pricingCategories = useMemo((): PricingCategory[] => {
    const grouped: Record<string, CloudPackage[]> = {}
    for (const pkg of cloudPackages) {
      const type = (pkg.type || 'starter').toLowerCase()
      if (!grouped[type]) grouped[type] = []
      grouped[type].push(pkg)
    }
    return CATEGORY_ORDER
      .filter(cat => grouped[cat]?.length > 0)
      .map(cat => {
        const config = CATEGORY_CONFIG[cat] ?? { icon: Star, description: '' }
        const plans: PricingPlan[] = grouped[cat].map((pkg, i) => ({
          id: pkg.id,
          name: pkg.name,
          description: '',
          price: String(pkg.cost),
          priceVnd: pkg.cost_vnd,
          period: 'tháng',
          icon: config.icon as any,
          popular: i === 0,
          category: cat as PricingPlan['category'],
          subPlanNumber: i + 1,
          features: buildFeatures(pkg),
          limitations: [],
        }))
        return {
          name: cat,
          basePrice: plans[0]?.price ?? '0',
          icon: config.icon as any,
          popular: cat === 'professional',
          description: config.description,
          plans,
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudPackages])
  
  // Refs for scrolling
  const mainCardsRef = useRef<HTMLDivElement>(null)
  const expandedSectionRef = useRef<HTMLDivElement>(null)
  const expandedHeaderRef = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Lấy tỉ giá từ localStorage
  function getExchangeRate() {
    if (typeof window !== 'undefined') {
      const rate = localStorage.getItem('usdvnd_sell');
      return rate ? Number(rate) : 26500;
    }
    return 26500;
  }

  // Fetch user balance when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const fetchBalance = async () => {
        try {
          const response = await getUserBalance()
          setUserBalance(response.balance)
        } catch (error) {
          console.error('Error fetching balance:', error)
          setUserBalance(0)
        }
      }
      fetchBalance()
    }
  }, [isAuthenticated])

  const handleSelectPlan = (plan: any, category: string) => {
    if (!isAuthenticated) {
      toast({
        title: t('homepage.pricing.auth.loginRequired'),
        description: t('pricing.loginRequired'),
        variant: "destructive",
      })
      return
    }
    setSelectedPlan(plan)
    setSelectedCategory(category)
    setSelectedPaymentMethod('')
    setAgreedToTerms(false)
    setMonthsCount(1)
    // Reset lock for fresh payment attempt
    isConfirmingRef.current = false
    setIsConfirming(false)
    setShowPaymentMethodPopup(true)
  }

  const handleCustomPlanClick = () => {
    if (!isAuthenticated) {
      toast({
        title: t('homepage.pricing.auth.loginRequired'),
        description: t('homepage.pricing.auth.loginToRegister'),
        variant: "destructive",
      })
      return
    }
    setShowCustomForm(true)
  }

  const handleConfirmPaymentMethod = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const clickTime = new Date().toISOString()
    const btn = e.currentTarget

    console.log(`[PAY-DEBUG] === CLICK EVENT at ${clickTime} ===`)
    console.log(`[PAY-DEBUG] btn.disabled (DOM, before set):`, btn.disabled)
    console.log(`[PAY-DEBUG] isConfirmingRef.current (before check):`, isConfirmingRef.current)
    console.log(`[PAY-DEBUG] isConfirming state:`, isConfirming)

    // Disable button via DOM immediately - bypasses React render cycle entirely
    btn.disabled = true
    btn.textContent = t('pricingModal.processing')
    console.log(`[PAY-DEBUG] btn.disabled (DOM, after set):`, btn.disabled)

    if (isConfirmingRef.current) {
      console.log(`[PAY-DEBUG] BLOCKED by isConfirmingRef — returning early`)
      return
    }
    isConfirmingRef.current = true
    setIsConfirming(true)
    console.log(`[PAY-DEBUG] LOCK ACQUIRED — proceeding with payment`)

    let succeeded = false

    try {
      if (!selectedPaymentMethod) {
        toast({
          title: t('pricingModal.errorTitle'),
          description: t('pricingModal.errorSelectMethod'),
          variant: 'destructive'
        })
        return
      }

      if (monthsCount < 1 || monthsCount > 24) {
        toast({
          title: t('pricingModal.errorTitle'),
          description: t('pricingModal.errorMonths'),
          variant: 'destructive'
        })
        return
      }

      if (selectedPaymentMethod === 'account_balance') {
        // Phương thức 1: Trừ tiền tài khoản
        const currentBalance = parseFloat(String(userBalance)) // Current balance in VND
        const planPriceVND = parseFloat(String(selectedPlan.priceVnd))
        const totalAmount = planPriceVND * monthsCount
        
        if (totalAmount > currentBalance) {
          toast({
            title: t('pricingModal.insufficientBalanceTitle'),
            description: t('pricingModal.insufficientBalanceDesc'),
            variant: 'destructive'
          })
          return
        }

        console.log(`[PAY-DEBUG] Calling subscribeWithBalance API...`)
        // Call API to subscribe with balance
        const subscription = await subscribeWithBalance({
          cloudPackageId: selectedPlan.id,
          monthsCount: monthsCount,
          autoRenew: false
        })
        console.log(`[PAY-DEBUG] subscribeWithBalance API call SUCCESS`)
        succeeded = true

        setShowPaymentMethodPopup(false)
        toast({
          title: t('pricingModal.successTitle'),
          description: t('pricingModal.successDesc', { planName: selectedPlan?.name }),
          variant: 'default',
          className: 'bg-green-50 border-green-500 text-green-800 [&>*]:text-green-800',
        })

        // Navigate to VM configuration page
        router.push(`/cloud/configuration/${subscription.id}`)

        // Refresh balance
        const response = await getUserBalance()
        setUserBalance(response.balance)

      } else if (selectedPaymentMethod === 'direct_payment') {
        // Phương thức 2: Thanh toán trực tiếp
        console.log(`[PAY-DEBUG] Calling subscribeWithPayment API...`)
        // Call API to create subscription with payment
        const result = await subscribeWithPayment({
          cloudPackageId: selectedPlan.id,
          monthsCount: monthsCount,
          autoRenew: false
        })
        console.log(`[PAY-DEBUG] subscribeWithPayment API call SUCCESS`)
        succeeded = true

        setShowPaymentMethodPopup(false)
        
        // Navigate to checkout page with payment info
        const params = new URLSearchParams({
          paymentId: result.payment.id,
          subscriptionId: result.subscription.id.toString(),
          amount: result.payment.amount.toString(),
          method: 'sepay_qr',
          type: 'subscription'
        })
        
        router.push(`/checkout/subscription?${params.toString()}`)
      }
    } catch (error: any) {
      console.error('[PAY-DEBUG] Payment error:', error)
      toast({
        title: t('pricingModal.errorTitle'),
        description: error.response?.data?.message || t('pricingModal.errorGeneral'),
        variant: 'destructive'
      })
    } finally {
      console.log(`[PAY-DEBUG] FINALLY block — succeeded=${succeeded}`)
      // Only release lock on failure — on success the dialog is closing,
      // so re-enabling the button would allow a second click before the dialog unmounts
      if (!succeeded) {
        isConfirmingRef.current = false
        setIsConfirming(false)
        btn.disabled = false
        btn.textContent = t('pricingModal.confirmBtn')
      }
    }
  }

      // Function để handle scroll khi đóng từ button "Đóng"
  const handleCloseWithScroll = () => {
    const currentCategory = expandedCategory || closingCategory
    if (currentCategory) {
      // Trigger animation đóng ngay lập tức
      setIsClosing(true)
      setClosingCategory(currentCategory)
      
      // Đóng sau khi animation hoàn thành
      setTimeout(() => {
        setExpandedCategory(null)
        setTimeout(() => {
          setIsClosing(false)
          setClosingCategory(null)
        }, 500)
      }, 1000)
    }
  }

  const handleToggleExpanded = (categoryName: string) => {
    if (expandedCategory === categoryName) {
      // Trigger animation đóng ngay lập tức
      setIsClosing(true)
      setClosingCategory(categoryName)
      
      setTimeout(() => {
        setExpandedCategory(null)
        setTimeout(() => {
          setIsClosing(false)
          setClosingCategory(null)
        }, 500)
      }, 1000)
    } else {
      // Nếu đã có category mở khác, đóng trước rồi mở cái mới
      if (expandedCategory && expandedCategory !== categoryName) {
        setIsClosing(true)
        setClosingCategory(expandedCategory)
        
        setTimeout(() => {
          setExpandedCategory(categoryName)
          setIsClosing(false)
          setClosingCategory(null)
          setIsTransitioning(false)
          
          // Scroll sau khi animation hoàn thành
          setTimeout(() => {
            if (expandedSectionRef.current) {
              const sectionRect = expandedSectionRef.current.getBoundingClientRect()
              const targetScrollTop = window.scrollY + sectionRect.bottom - window.innerHeight + 24
              const startScrollTop = window.scrollY
              const distance = targetScrollTop - startScrollTop
              const duration = 1000
              const startTime = performance.now()
              
              const animateScroll = (currentTime: number) => {
                const elapsed = currentTime - startTime
                const progress = Math.min(elapsed / duration, 1)
                const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2
                window.scrollTo(0, startScrollTop + distance * easeProgress)
                
                if (progress < 1) {
                  requestAnimationFrame(animateScroll)
                }
              }
              requestAnimationFrame(animateScroll)
            }
          }, 200)
        }, 500)
      } else {
        // Mở category mới khi chưa có gì mở
        setExpandedCategory(categoryName)
        setIsClosing(false)
        setClosingCategory(null)
        setIsTransitioning(false)
        
        setTimeout(() => {
          if (expandedSectionRef.current) {
            const sectionRect = expandedSectionRef.current.getBoundingClientRect()
            const targetScrollTop = window.scrollY + sectionRect.bottom - window.innerHeight + 24
            const startScrollTop = window.scrollY
            const distance = targetScrollTop - startScrollTop
            const duration = 1000
            const startTime = performance.now()
            
            const animateScroll = (currentTime: number) => {
              const elapsed = currentTime - startTime
              const progress = Math.min(elapsed / duration, 1)
              const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2
              window.scrollTo(0, startScrollTop + distance * easeProgress)
              
              if (progress < 1) {
                requestAnimationFrame(animateScroll)
              }
            }
            requestAnimationFrame(animateScroll)
          }
        }, 200)
      }
    }
  }

  return (
    <section id="pricing" className="py-8 lg:py-16 bg-card/30 w-full overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-balance text-foreground">
            {t('homepage.pricing.subtitle')}
          </h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-3xl mx-auto leading-relaxed">
            {t('homepage.pricing.description')}
          </p>
        </div>

        {/* Main pricing cards */}
        {isLoadingPackages ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : (
        <div ref={mainCardsRef} className="w-full px-2 sm:px-0">
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6 lg:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 w-full lg:max-w-7xl lg:mx-auto">
          {pricingCategories.map((category: PricingCategory, index: number) => {
            const IconComponent = category.icon
            return (
              <Card
                key={index}
                className={`relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${
                  expandedCategory === category.name
                    ? "border-primary border-3 shadow-lg bg-gradient-to-b from-background to-card"
                    : "hover:border-primary/50"
                } h-auto`}
                onClick={() => handleToggleExpanded(category.name)}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-3 p-3 bg-primary/10 rounded-2xl w-fit">
                    <IconComponent className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-foreground break-words">{t(`homepage.pricing.plans.${category.name}`)}</CardTitle>
                  <CardDescription className="text-sm sm:text-base mt-2 break-words">{t(category.description)}</CardDescription>
                </CardHeader>

                <CardFooter className="pt-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full text-primary hover:text-primary/80 transition-all duration-200 hover:bg-primary/5 py-3"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleExpanded(category.name)
                    }}
                  >
                    {expandedCategory === category.name ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        {t('homepage.pricing.buttons.packages')}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        {t('homepage.pricing.buttons.viewDetails')}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}

          {/* Custom Plan */}
          <Card className="relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 h-auto">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-3 p-3 bg-primary/10 rounded-2xl w-fit">
                <customPlan.icon className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-foreground break-words">{t(`homepage.pricing.plans.${customPlan.name}`)}</CardTitle>
              <CardDescription className="text-sm sm:text-base mt-2 break-words">{t(customPlan.description)}</CardDescription>
            </CardHeader>

            <CardFooter className="pt-4">
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full py-3"
                onClick={() => setShowCustomForm(true)}
              >
                {t('homepage.pricing.buttons.contactConsult')}
              </Button>
            </CardFooter>
          </Card>
          </div>
        </div>
        )}

        {/* Expanded Plans Section */}
        <div 
          ref={expandedSectionRef}
          className={`mt-12 transition-all duration-700 ease-in-out ${
          expandedCategory 
            ? 'opacity-100 translate-y-0 max-h-[2000px]' 
            : 'opacity-0 translate-y-4 max-h-0 overflow-hidden'
        }`}>
          {/* Loading transition indicator */}
          {isTransitioning && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          {(expandedCategory || isClosing) && !isTransitioning && (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <div ref={expandedHeaderRef} className={`flex items-center justify-between mb-6 transition-all duration-400 ${
                isClosing 
                  ? 'animate-out fade-out-0 slide-out-to-top-2 duration-400'
                  : 'animate-in fade-in-0 slide-in-from-top-2 duration-300'
              }`}>
                <div className={`flex items-center space-x-3 transition-all duration-400 ${
                  isClosing 
                    ? 'animate-out fade-out-0 slide-out-to-left-2 duration-400'
                    : 'animate-in fade-in-0 slide-in-from-left-2 duration-300'
                }`}>
                  {/* Icon mini i với tooltip */}
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <span
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary mr-2 cursor-pointer"
                      style={{ fontSize: 12 }}
                    >
                      <Info className="w-3 h-3" />
                    </span>
                    {showTooltip && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '110%',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: '#fff',
                          color: '#222',
                          border: '1px solid #eee',
                          borderRadius: 6,
                          padding: '8px 12px',
                          fontSize: 13,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          zIndex: 10,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t('homepage.pricing.tooltips.exchangeRate')}<br />{t('homepage.pricing.tooltips.todayRate')} <b>{getExchangeRate().toLocaleString()}</b>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {t(`homepage.pricing.plans.${expandedCategory || closingCategory}`)}
                  </Badge>
                  <span className={`text-muted-foreground transition-all duration-400 ${
                    isClosing 
                      ? 'animate-out fade-out-0 slide-out-to-right-2 duration-400 delay-100'
                      : 'animate-in fade-in-0 slide-in-from-right-2 duration-300 delay-100'
                  }`}>
                    {t('homepage.pricing.sections.selectSuitable')}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseWithScroll}
                  className={`hover:bg-destructive/10 hover:text-destructive transition-colors duration-200 ${
                    isClosing 
                      ? 'animate-out fade-out-0 scale-out-95 duration-400 delay-200'
                      : 'animate-in fade-in-0 scale-in-95 duration-300 delay-200'
                  }`}
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('homepage.pricing.buttons.close')}
                </Button>
              </div>
              
              <div className="relative">
                <button
                  className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-card border rounded-full p-2 shadow hover:bg-primary/10"
                  onClick={() => {
                    if (carouselRef.current) {
                      carouselRef.current.scrollBy({ left: -carouselRef.current.offsetWidth, behavior: 'smooth' })
                    }
                  }}
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div
                  ref={carouselRef}
                  className="flex overflow-x-auto gap-2 sm:gap-3 md:gap-4 pb-2 pt-2 px-4 sm:px-8 hide-scrollbar justify-start"
                  style={{ scrollSnapType: 'x mandatory', scrollPaddingLeft: '2rem', scrollPaddingRight: '2rem' }}
                >
                  {pricingCategories
                    .find(cat => cat.name === (expandedCategory || closingCategory))
                    ?.plans.map((plan, planIndex) => (
                      <Card
                        key={plan.id}
                        className={`min-w-[160px] sm:min-w-[200px] md:min-w-[220px] max-w-[160px] sm:max-w-[200px] md:max-w-[220px] flex-shrink-0 scroll-snap-align-start transition-all duration-500 hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 mt-2 ${
                          isClosing 
                            ? 'animate-out fade-out-0 slide-out-to-bottom-4 duration-700'
                            : 'animate-in fade-in-0 slide-in-from-bottom-4 duration-700'
                        }`}
                        style={{
                          animationDelay: isClosing
                            ? `${planIndex * 80}ms`
                            : `${planIndex * 100}ms`,
                          animationFillMode: 'both'
                        }}
                      >
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              #{plan.subPlanNumber}
                            </Badge>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {/* Hiển thị giá VND, debug giá gốc và tỉ giá */}
                              {formatPrice(plan.priceVnd)}
                            </div>
                            <div className="text-xs text-muted-foreground">₫/{plan.period}</div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-2">
                          {(expandedPlanIds.has(plan.id) ? plan.features : plan.features.slice(0, 4)).map((feature, idx) => (
                            <div key={idx} className="flex items-start space-x-2">
                              <Check className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                              <span className="text-xs text-foreground leading-relaxed">{feature}</span>
                            </div>
                          ))}
                          {plan.features.length > 4 && (
                            <button
                              className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
                              onClick={(e) => togglePlanFeatures(plan.id, e)}
                            >
                              {expandedPlanIds.has(plan.id) ? (
                                <><ChevronUp className="h-3 w-3" />{t('homepage.pricing.sections.showLess')}</>
                              ) : (
                                <><ChevronDown className="h-3 w-3" />+{plan.features.length - 4} {t('homepage.pricing.sections.moreFeatures')}</>
                              )}
                            </button>
                          )}
                        </CardContent>
                        
                        <CardFooter className="pt-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-xs hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
                            onClick={() => handleSelectPlan(plan, expandedCategory || closingCategory || '')}
                          >
                            {t('homepage.pricing.buttons.selectPlan')}
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  }
                </div>
                <button
                  className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-card border rounded-full p-2 shadow hover:bg-primary/10"
                  onClick={() => {
                    if (carouselRef.current) {
                      carouselRef.current.scrollBy({ left: carouselRef.current.offsetWidth, behavior: 'smooth' })
                    }
                  }}
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center space-y-4">
          <p className="text-muted-foreground">{t('homepage.pricing.additionalInfo.support247')}</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <span>✓ {t('homepage.pricing.additionalInfo.noSetupFee')}</span>
            <span>✓ {t('homepage.pricing.additionalInfo.cancelAnytime')}</span>
            <span>✓ {t('homepage.pricing.additionalInfo.flexiblePayment')}</span>
            <span>✓ {t('homepage.pricing.additionalInfo.freeConsult')}</span>
          </div>
          <div className="pt-4">
            <span className="inline-block px-4 py-2 rounded-lg bg-primary/10 text-primary font-semibold text-lg tracking-wide">
              {t('homepage.pricing.additionalInfo.hotlineSupport')} <a href="tel:0707806860" className="underline hover:text-primary/80">0707 806 860</a>
            </span>
          </div>
        </div>
      </div>

      {/* Custom Registration Form Popup */}
      <CustomRegistrationForm 
        open={showCustomForm} 
        onOpenChange={setShowCustomForm} 
      />

      {/* Payment Method Selection Popup */}
      <Dialog open={showPaymentMethodPopup} onOpenChange={setShowPaymentMethodPopup}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              {t('pricingModal.title')}
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              {t('pricingModal.subtitle', { planName: selectedPlan?.name })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 gap-4 my-6">
            {/* Phương thức 1: Trừ tiền tài khoản */}
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedPaymentMethod === 'account_balance' 
                  ? 'border-[#E60000] border-2 bg-red-50 dark:bg-red-950/30' 
                  : 'border-border hover:border-muted-foreground/50'
              }`}
              onClick={() => setSelectedPaymentMethod('account_balance')}
            >
              <CardHeader className="text-center pb-4">
                <div className={`mx-auto mb-3 p-3 rounded-2xl w-fit ${
                  selectedPaymentMethod === 'account_balance' 
                    ? 'bg-[#E60000] text-white' 
                    : 'bg-muted text-foreground/60'
                }`}>
                  <Wallet className="h-8 w-8" />
                </div>
                <CardTitle className="text-lg">{t('pricingModal.accountBalance')}</CardTitle>
                <CardDescription className="text-sm">
                  {t('pricingModal.accountBalanceDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      {t('pricingModal.monthsLabel')}
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      value={monthsCount}
                      onChange={(e) => setMonthsCount(parseInt(e.target.value) || 1)}
                      className="text-center font-semibold"
                      disabled={selectedPaymentMethod !== 'account_balance'}
                    />
                  </div>

                  {selectedPlan && (
                    <div className="text-center">
                      <div className="text-sm text-foreground/70">{t('pricingModal.totalDeduction')}</div>
                      <div className="text-lg font-bold text-[#E60000]">
                        {formatPrice(selectedPlan.priceVnd * monthsCount)} VND
                      </div>
                      <div className="text-xs text-foreground/60">
                        {t('pricingModal.perMonthCalc', { price: formatPrice(selectedPlan.priceVnd), months: monthsCount })}
                      </div>
                    </div>
                  )}

                  <div className="text-center">
                  <div className="text-sm text-foreground/70">{t('pricingModal.currentBalance')}</div>
                  <div className="text-lg font-bold text-[#E60000]">{formatPrice(userBalance)} đ</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 mb-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push('/add-funds')
                    }}
                  >
                    {t('pricingModal.addFundsBtn')}
                  </Button>
                  <div className="text-sm text-foreground/70 mt-2">
                    ✓ {t('pricingModal.instantPayment')}<br/>
                    ✓ {t('pricingModal.noFees')}
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>

            {/* Phương thức 2: Thanh toán trực tiếp */}
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedPaymentMethod === 'direct_payment' 
                  ? 'border-[#E60000] border-2 bg-red-50 dark:bg-red-950/30' 
                  : 'border-border hover:border-muted-foreground/50'
              }`}
              onClick={() => setSelectedPaymentMethod('direct_payment')}
            >
              <CardHeader className="text-center pb-4">
                <div className={`mx-auto mb-3 p-3 rounded-2xl w-fit ${
                  selectedPaymentMethod === 'direct_payment' 
                    ? 'bg-[#E60000] text-white' 
                    : 'bg-muted text-foreground/60'
                }`}>
                  <CreditCard className="h-8 w-8" />
                </div>
                <CardTitle className="text-lg">{t('pricingModal.directPayment')}</CardTitle>
                <CardDescription className="text-sm">
                  {t('pricingModal.directPaymentDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      {t('pricingModal.monthsLabel')}
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      value={monthsCount}
                      onChange={(e) => setMonthsCount(parseInt(e.target.value) || 1)}
                      className="text-center font-semibold"
                      disabled={selectedPaymentMethod !== 'direct_payment'}
                    />
                  </div>
                  {selectedPaymentMethod === 'direct_payment' && selectedPlan && (
                    <div className="text-center">
                      <div className="text-sm text-foreground/70">{t('pricingModal.totalPayment')}</div>
                      <div className="text-lg font-bold text-[#E60000]">
                        {formatPrice(selectedPlan.priceVnd * monthsCount)} VND
                      </div>
                      <div className="text-xs text-foreground/60">
                        {t('pricingModal.perMonthCalc', { price: formatPrice(selectedPlan.priceVnd), months: monthsCount })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Terms agreement checkbox */}
          <div className="flex items-start gap-2 my-4 p-3 bg-muted/50 rounded-lg border border-border">
            <input
              id="terms-checkbox"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-[#E60000] shrink-0"
            />
            <label htmlFor="terms-checkbox" className="text-sm text-foreground cursor-pointer leading-relaxed select-none">
              {t('pricingModal.termsPrefix')}{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#E60000] font-medium underline underline-offset-2 hover:text-red-700"
                onClick={(e) => e.stopPropagation()}
              >
                {t('pricingModal.termsLink')}
              </a>{' '}
              {t('pricingModal.termsSuffix')}
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowPaymentMethodPopup(false)}
            >
              {t('pricingModal.closeBtn')}
            </Button>
            <Button 
              className="bg-[#E60000] hover:bg-red-700"
              onClick={handleConfirmPaymentMethod}
              disabled={!selectedPaymentMethod || !agreedToTerms || isConfirming}
            >
              {isConfirming ? t('pricingModal.processing') : t('pricingModal.confirmBtn')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

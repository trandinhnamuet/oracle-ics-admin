'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, Shield, Zap, Globe, BarChart3, Cpu, HardDrive, Network, Lock, CloudCog } from "lucide-react"
import { useTranslation } from "react-i18next"

const getServices = (t: any) => [
  {
    icon: Database,
    key: 'database',
    title: t('homepage.services.serviceList.database.title'),
    description: t('homepage.services.serviceList.database.description'),
    features: t('homepage.services.serviceList.database.features', { returnObjects: true }),
  },
  {
    icon: Cpu,
    key: 'compute',
    title: t('homepage.services.serviceList.compute.title'),
    description: t('homepage.services.serviceList.compute.description'),
    features: t('homepage.services.serviceList.compute.features', { returnObjects: true }),
  },
  {
    icon: HardDrive,
    key: 'storage',
    title: t('homepage.services.serviceList.storage.title'),
    description: t('homepage.services.serviceList.storage.description'),
    features: t('homepage.services.serviceList.storage.features', { returnObjects: true }),
  },
  {
    icon: Network,
    key: 'networking',
    title: t('homepage.services.serviceList.networking.title'),
    description: t('homepage.services.serviceList.networking.description'),
    features: t('homepage.services.serviceList.networking.features', { returnObjects: true }),
  },
  {
    icon: Shield,
    key: 'security',
    title: t('homepage.services.serviceList.security.title'),
    description: t('homepage.services.serviceList.security.description'),
    features: t('homepage.services.serviceList.security.features', { returnObjects: true }),
  },
  {
    icon: BarChart3,
    key: 'analytics',
    title: t('homepage.services.serviceList.analytics.title'),
    description: t('homepage.services.serviceList.analytics.description'),
    features: t('homepage.services.serviceList.analytics.features', { returnObjects: true }),
  },
]

export function ServicesSection() {
  const { t } = useTranslation()
  const services = getServices(t)

  return (
    <section id="services" className="py-10 lg:py-16">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-balance text-foreground">
            {t('homepage.services.subtitle')}
          </h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-3xl mx-auto leading-relaxed">
            {t('homepage.services.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon
            return (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 bg-gradient-to-br from-card to-background"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors text-foreground">
                        {service.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-base leading-relaxed text-muted-foreground">
                    {service.description}
                  </CardDescription>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{t('homepage.services.keyFeatures')}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {service.features.map((feature: string, featureIndex: number) => (
                        <div key={featureIndex} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Additional Benefits */}
        <div className="mt-16 grid md:grid-cols-4 gap-6">
          <div className="text-center p-6 rounded-xl bg-card border border-border">
            <div className="bg-primary/10 p-3 rounded-xl w-fit mx-auto mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2 text-foreground">{t('homepage.services.benefits.fastDeploy.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('homepage.services.benefits.fastDeploy.description')}</p>
          </div>
          <div className="text-center p-6 rounded-xl bg-card border border-border">
            <div className="bg-primary/10 p-3 rounded-xl w-fit mx-auto mb-4">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2 text-foreground">{t('homepage.services.benefits.globalCoverage.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('homepage.services.benefits.globalCoverage.description')}</p>
          </div>
          <div className="text-center p-6 rounded-xl bg-card border border-border">
            <div className="bg-primary/10 p-3 rounded-xl w-fit mx-auto mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2 text-foreground">{t('homepage.services.benefits.enterpriseSecurity.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('homepage.services.benefits.enterpriseSecurity.description')}</p>
          </div>
          <div className="text-center p-6 rounded-xl bg-card border border-border">
            <div className="bg-primary/10 p-3 rounded-xl w-fit mx-auto mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2 text-foreground">{t('homepage.services.benefits.costOptimization.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('homepage.services.benefits.costOptimization.description')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

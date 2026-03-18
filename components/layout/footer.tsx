'use client'

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Cloud, Mail, Phone, MapPin, Facebook, Linkedin, Youtube } from "lucide-react"
import { useTranslation } from "react-i18next"

export function Footer() {
  const { t } = useTranslation()

//
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="bg-primary p-2 rounded-lg">
                <Cloud className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{t('footer.companyName')}</h3>
                <p className="text-sm opacity-80">{t('footer.officialPartner')}</p>
              </div>
            </div>
            <p className="text-sm opacity-80 leading-relaxed">
              {t('footer.companyDescription')}
            </p>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/ICS.OracleCloud/" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="bg-white hover:bg-primary border border-primary">
                  <Facebook className="h-4 w-4 text-[#1877F3]" />
                </Button>
              </a>
              <Button variant="ghost" size="sm" className="bg-white hover:bg-primary">
                <Linkedin className="h-4 w-4 text-[#0A66C2]" />
              </Button>
              <a href="https://www.youtube.com/channel/UCpOn4kxyTtzmUldsDZoxLHg" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="bg-white hover:bg-primary border border-primary">
                  <Youtube className="h-4 w-4 text-[#FF0000]" />
                </Button>
              </a>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold">{t('footer.services')}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-primary transition-colors">
                  {t('footer.serviceList.database')}
                </a>
              </li>
              <li>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-primary transition-colors">
                  {t('footer.serviceList.compute')}
                </a>
              </li>
              <li>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-primary transition-colors">
                  {t('footer.serviceList.storage')}
                </a>
              </li>
              <li>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-primary transition-colors">
                  {t('footer.serviceList.networking')}
                </a>
              </li>
              <li>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-primary transition-colors">
                  {t('footer.serviceList.security')}
                </a>
              </li>
              <li>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-primary transition-colors">
                  {t('footer.serviceList.analytics')}
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold">{t('footer.support')}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-primary transition-colors">
                  {t('footer.supportList.docs')}
                </a>
              </li>
              <li>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-primary transition-colors">
                  {t('footer.supportList.videos')}
                </a>
              </li>
              <li>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-primary transition-colors">
                  {t('footer.supportList.forum')}
                </a>
              </li>
              <li>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-primary transition-colors">
                  {t('footer.supportList.ticket')}
                </a>
              </li>
              <li>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-primary transition-colors">
                  {t('footer.supportList.training')}
                </a>
              </li>
              <li>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-primary transition-colors">
                  {t('footer.supportList.api')}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold">{t('footer.contact')}</h4>
            <div className="space-y-4 text-sm">
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 mt-1 opacity-80" />
                <div>
                  <p className="opacity-80 font-semibold">{t('footer.companyFull')}</p>
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 mt-1 opacity-80" />
                    <p className="opacity-80">{t('footer.office')}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 opacity-80" />
                <p className="opacity-80">{t('footer.phone')} &nbsp; - &nbsp; {t('footer.hotline')}</p>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 opacity-80" />
                <p className="opacity-80">{t('footer.email')} &nbsp; - &nbsp; {t('footer.website')}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="font-medium">{t('footer.newsletter')}</h5>
              <div className="flex space-x-2">
                <Input
                  placeholder={t('footer.newsletterPlaceholder')}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                />
                <Button className="bg-primary hover:bg-primary/80 text-white" size="sm">
                  {t('footer.newsletterButton')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex flex-wrap gap-6 text-sm opacity-80">
            <a href="#" className="hover:opacity-100 hover:text-primary transition-colors">
              {t('footer.privacy')}
            </a>
            <a href="#" className="hover:opacity-100 hover:text-primary transition-colors">
              {t('footer.terms')}
            </a>
            <a href="#" className="hover:opacity-100 hover:text-primary transition-colors">
              {t('footer.sla')}
            </a>
            <a href="#" className="hover:opacity-100 hover:text-primary transition-colors">
              {t('footer.sitemap')}
            </a>
          </div>
          <p className="text-sm opacity-80">{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  )
}

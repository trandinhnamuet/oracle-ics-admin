'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/hooks/use-toast'
import {
  AdminTermsSection,
  createTermsSection,
  deleteTermsSection,
  getAdminTermsSections,
  TermsArticle,
  updateTermsSection,
} from '@/api/terms.api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

type EditableArticle = {
  number: string
  headingVi: string
  headingEn: string
  paragraphsViText: string
  paragraphsEnText: string
}

type SectionDraft = {
  id: number
  titleVi: string
  titleEn: string
  orderIndex: number
  isActive: boolean
  articles: EditableArticle[]
}

const emptyArticle = (): EditableArticle => ({
  number: '',
  headingVi: '',
  headingEn: '',
  paragraphsViText: '',
  paragraphsEnText: '',
})

const toParagraphText = (paragraphs: string[] | undefined): string =>
  (paragraphs || []).join('\n')

const toParagraphArray = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

function toDraft(section: AdminTermsSection): SectionDraft {
  const maxLen = Math.max(section.articlesVi?.length || 0, section.articlesEn?.length || 0)
  const articles: EditableArticle[] = []

  for (let i = 0; i < maxLen; i += 1) {
    const vi = section.articlesVi?.[i]
    const en = section.articlesEn?.[i]
    articles.push({
      number: vi?.number || en?.number || String(i + 1),
      headingVi: vi?.heading || '',
      headingEn: en?.heading || '',
      paragraphsViText: toParagraphText(vi?.paragraphs),
      paragraphsEnText: toParagraphText(en?.paragraphs),
    })
  }

  return {
    id: section.id,
    titleVi: section.titleVi,
    titleEn: section.titleEn,
    orderIndex: section.orderIndex,
    isActive: section.isActive,
    articles,
  }
}

function toPayload(draft: SectionDraft): {
  titleVi: string
  titleEn: string
  orderIndex: number
  isActive: boolean
  articlesVi: TermsArticle[]
  articlesEn: TermsArticle[]
} {
  const articlesVi = draft.articles.map((article, idx) => ({
    number: article.number.trim() || String(idx + 1),
    heading: article.headingVi.trim(),
    paragraphs: toParagraphArray(article.paragraphsViText),
  }))

  const articlesEn = draft.articles.map((article, idx) => ({
    number: article.number.trim() || String(idx + 1),
    heading: article.headingEn.trim(),
    paragraphs: toParagraphArray(article.paragraphsEnText),
  }))

  return {
    titleVi: draft.titleVi.trim(),
    titleEn: draft.titleEn.trim(),
    orderIndex: Number(draft.orderIndex),
    isActive: draft.isActive,
    articlesVi,
    articlesEn,
  }
}

function hasInvalidDraft(draft: SectionDraft): string | null {
  if (!draft.titleVi.trim()) return 'admin.terms.toast.titleViRequired'
  if (!draft.titleEn.trim()) return 'admin.terms.toast.titleEnRequired'
  if (draft.articles.length === 0) return 'admin.terms.toast.articleRequired'

  for (const article of draft.articles) {
    if (!article.headingVi.trim()) return 'admin.terms.toast.headingViRequired'
    if (!article.headingEn.trim()) return 'admin.terms.toast.headingEnRequired'
  }

  return null
}

export default function AdminTermsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [deleting, setDeleting] = useState<Record<number, boolean>>({})

  const [sections, setSections] = useState<AdminTermsSection[]>([])
  const [drafts, setDrafts] = useState<Record<number, SectionDraft>>({})

  const [newDraft, setNewDraft] = useState<SectionDraft>({
    id: 0,
    titleVi: '',
    titleEn: '',
    orderIndex: 0,
    isActive: true,
    articles: [emptyArticle()],
  })
  const [creating, setCreating] = useState(false)

  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id),
    [sections],
  )

  const loadSections = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await getAdminTermsSections()
      setSections(data)

      const nextDrafts: Record<number, SectionDraft> = {}
      data.forEach((section) => {
        nextDrafts[section.id] = toDraft(section)
      })
      setDrafts(nextDrafts)

      setNewDraft((prev) => ({ ...prev, orderIndex: data.length }))
    } catch (error: any) {
      toast({
        title: t('admin.terms.toast.error'),
        description: error?.message || t('admin.terms.toast.loadError'),
        variant: 'destructive',
      })
    } finally {
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }

  useEffect(() => {
    loadSections()
  }, [])

  const updateDraft = <K extends keyof SectionDraft>(id: number, key: K, value: SectionDraft[K]) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [key]: value,
      },
    }))
  }

  const updateArticle = (
    id: number,
    articleIndex: number,
    key: keyof EditableArticle,
    value: string,
  ) => {
    const draft = drafts[id]
    if (!draft) return

    const articles = [...draft.articles]
    articles[articleIndex] = { ...articles[articleIndex], [key]: value }
    updateDraft(id, 'articles', articles)
  }

  const addArticle = (id: number) => {
    const draft = drafts[id]
    if (!draft) return
    updateDraft(id, 'articles', [...draft.articles, emptyArticle()])
  }

  const copySectionViToEn = (id: number) => {
    const draft = drafts[id]
    if (!draft) return

    updateDraft(id, 'titleEn', draft.titleVi)
    updateDraft(
      id,
      'articles',
      draft.articles.map((article) => ({
        ...article,
        headingEn: article.headingVi,
        paragraphsEnText: article.paragraphsViText,
      })),
    )
  }

  const removeArticle = (id: number, index: number) => {
    const draft = drafts[id]
    if (!draft) return
    const next = draft.articles.filter((_, i) => i !== index)
    updateDraft(id, 'articles', next.length ? next : [emptyArticle()])
  }

  const handleSave = async (id: number) => {
    const draft = drafts[id]
    if (!draft) return

    const invalidKey = hasInvalidDraft(draft)
    if (invalidKey) {
      toast({
        title: t('admin.terms.toast.error'),
        description: t(invalidKey),
        variant: 'destructive',
      })
      return
    }

    setSaving((prev) => ({ ...prev, [id]: true }))
    try {
      const updated = await updateTermsSection(id, toPayload(draft))
      setSections((prev) => prev.map((item) => (item.id === id ? updated : item)))
      setDrafts((prev) => ({ ...prev, [id]: toDraft(updated) }))
      toast({ title: t('admin.terms.toast.saved') })
    } catch (error: any) {
      toast({
        title: t('admin.terms.toast.error'),
        description: error?.message || t('admin.terms.toast.saveError'),
        variant: 'destructive',
      })
    } finally {
      setSaving((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('admin.terms.confirmDelete'))) return

    setDeleting((prev) => ({ ...prev, [id]: true }))
    try {
      await deleteTermsSection(id)
      setSections((prev) => prev.filter((item) => item.id !== id))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      toast({ title: t('admin.terms.toast.deleted') })
    } catch (error: any) {
      toast({
        title: t('admin.terms.toast.error'),
        description: error?.message || t('admin.terms.toast.deleteError'),
        variant: 'destructive',
      })
    } finally {
      setDeleting((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleCreate = async () => {
    const invalidKey = hasInvalidDraft(newDraft)
    if (invalidKey) {
      toast({
        title: t('admin.terms.toast.error'),
        description: t(invalidKey),
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    try {
      await createTermsSection(toPayload(newDraft))
      setNewDraft({
        id: 0,
        titleVi: '',
        titleEn: '',
        orderIndex: sortedSections.length,
        isActive: true,
        articles: [emptyArticle()],
      })
      await loadSections(true)
      toast({ title: t('admin.terms.toast.created') })
    } catch (error: any) {
      toast({
        title: t('admin.terms.toast.error'),
        description: error?.message || t('admin.terms.toast.createError'),
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const renderArticleEditor = (
    sectionId: number,
    articles: EditableArticle[],
    onChange: (index: number, key: keyof EditableArticle, value: string) => void,
    onAdd: () => void,
    onRemove: (index: number) => void,
    onCopyToEnglish: (index: number) => void,
  ) => (
    <div className="space-y-4">
      {articles.map((article, index) => (
        <Card key={`${sectionId}-article-${index}`} className="border-dashed">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{t('admin.terms.articleLabel', { index: index + 1 })}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onCopyToEnglish(index)}>
                  {t('admin.terms.copyViToEn')}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onRemove(index)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('admin.terms.removeArticle')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>{t('admin.terms.fields.articleNumber')}</Label>
                <Input
                  value={article.number}
                  onChange={(e) => onChange(index, 'number', e.target.value)}
                  placeholder={String(index + 1)}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('admin.terms.fields.headingVi')}</Label>
                <Input
                  value={article.headingVi}
                  onChange={(e) => onChange(index, 'headingVi', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('admin.terms.fields.headingEn')}</Label>
                <Input
                  value={article.headingEn}
                  onChange={(e) => onChange(index, 'headingEn', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('admin.terms.fields.paragraphsVi')}</Label>
                <Textarea
                  rows={6}
                  value={article.paragraphsViText}
                  onChange={(e) => onChange(index, 'paragraphsViText', e.target.value)}
                  placeholder={t('admin.terms.paragraphHint')}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('admin.terms.fields.paragraphsEn')}</Label>
                <Textarea
                  rows={6}
                  value={article.paragraphsEnText}
                  onChange={(e) => onChange(index, 'paragraphsEnText', e.target.value)}
                  placeholder={t('admin.terms.paragraphHint')}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        {t('admin.terms.addArticle')}
      </Button>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.terms.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.terms.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={() => loadSections(true)} disabled={refreshing || loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${(refreshing || loading) ? 'animate-spin' : ''}`} />
          {t('admin.terms.refresh')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.terms.createTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('admin.terms.fields.sectionTitleVi')}</Label>
              <Input
                value={newDraft.titleVi}
                onChange={(e) => setNewDraft((prev) => ({ ...prev, titleVi: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('admin.terms.fields.sectionTitleEn')}</Label>
              <Input
                value={newDraft.titleEn}
                onChange={(e) => setNewDraft((prev) => ({ ...prev, titleEn: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('admin.terms.fields.orderIndex')}</Label>
              <Input
                type="number"
                value={newDraft.orderIndex}
                onChange={(e) => setNewDraft((prev) => ({ ...prev, orderIndex: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="flex items-end gap-3 pb-2">
              <Switch
                checked={newDraft.isActive}
                onCheckedChange={(checked) => setNewDraft((prev) => ({ ...prev, isActive: checked }))}
              />
              <span className="text-sm">{t('admin.terms.fields.active')}</span>
            </div>
          </div>

          {renderArticleEditor(
            -1,
            newDraft.articles,
            (index, key, value) => {
              setNewDraft((prev) => {
                const nextArticles = [...prev.articles]
                nextArticles[index] = { ...nextArticles[index], [key]: value }
                return { ...prev, articles: nextArticles }
              })
            },
            () => setNewDraft((prev) => ({ ...prev, articles: [...prev.articles, emptyArticle()] })),
            (index) => setNewDraft((prev) => {
              const next = prev.articles.filter((_, i) => i !== index)
              return { ...prev, articles: next.length ? next : [emptyArticle()] }
            }),
            (index) => setNewDraft((prev) => {
              const next = [...prev.articles]
              next[index] = {
                ...next[index],
                headingEn: next[index].headingVi,
                paragraphsEnText: next[index].paragraphsViText,
              }
              return { ...prev, articles: next }
            }),
          )}

          <Button
            variant="outline"
            onClick={() =>
              setNewDraft((prev) => ({
                ...prev,
                titleEn: prev.titleVi,
                articles: prev.articles.map((article) => ({
                  ...article,
                  headingEn: article.headingVi,
                  paragraphsEnText: article.paragraphsViText,
                })),
              }))
            }
          >
            {t('admin.terms.copySectionViToEn')}
          </Button>

          <Button onClick={handleCreate} disabled={creating}>
            <Plus className="h-4 w-4 mr-2" />
            {creating ? t('admin.terms.creating') : t('admin.terms.create')}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('admin.terms.loading')}
          </CardContent>
        </Card>
      ) : (
        sortedSections.map((section) => {
          const draft = drafts[section.id]
          if (!draft) return null

          return (
            <Card key={section.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t('admin.terms.sectionLabel', { id: section.id })}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => copySectionViToEn(section.id)}>
                    {t('admin.terms.copySectionViToEn')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(section.id)}
                    disabled={!!deleting[section.id]}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('admin.terms.delete')}
                  </Button>
                  <Button size="sm" onClick={() => handleSave(section.id)} disabled={!!saving[section.id]}>
                    <Save className="h-4 w-4 mr-2" />
                    {t('admin.terms.save')}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t('admin.terms.fields.sectionTitleVi')}</Label>
                    <Input
                      value={draft.titleVi}
                      onChange={(e) => updateDraft(section.id, 'titleVi', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('admin.terms.fields.sectionTitleEn')}</Label>
                    <Input
                      value={draft.titleEn}
                      onChange={(e) => updateDraft(section.id, 'titleEn', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t('admin.terms.fields.orderIndex')}</Label>
                    <Input
                      type="number"
                      value={draft.orderIndex}
                      onChange={(e) => updateDraft(section.id, 'orderIndex', Number(e.target.value || 0))}
                    />
                  </div>
                  <div className="flex items-end gap-3 pb-2">
                    <Switch
                      checked={draft.isActive}
                      onCheckedChange={(checked) => updateDraft(section.id, 'isActive', checked)}
                    />
                    <span className="text-sm">{t('admin.terms.fields.active')}</span>
                  </div>
                </div>

                {renderArticleEditor(
                  section.id,
                  draft.articles,
                  (index, key, value) => updateArticle(section.id, index, key, value),
                  () => addArticle(section.id),
                  (index) => removeArticle(section.id, index),
                  (index) => {
                    const article = draft.articles[index]
                    updateArticle(section.id, index, 'headingEn', article.headingVi)
                    updateArticle(section.id, index, 'paragraphsEnText', article.paragraphsViText)
                  },
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}

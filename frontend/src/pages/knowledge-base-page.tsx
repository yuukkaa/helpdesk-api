import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Edit, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiError } from '@/lib/api'
import type { Article, Category, Paginated } from '@/lib/types'
import { useCurrentUser } from '@/lib/user-context'

export function KbPage() {
  const { isStaff } = useCurrentUser()
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Форма создания/редактирования статьи
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState<string>('none')
  const [isPublished, setIsPublished] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const loadArticles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (categoryFilter !== 'all') params.set('category_id', categoryFilter)
      params.set('per_page', '50')

      const res = await api<Paginated<Article>>(`/knowledge-base-articles?${params.toString()}`)
      setArticles(res.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка загрузки статей базы знаний')
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter])

  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  useEffect(() => {
    api<{ data: Category[] }>('/categories')
      .then((res) => setCategories(res.data))
      .catch(() => {})
  }, [])

  function openCreateDialog() {
    setEditingArticle(null)
    setTitle('')
    setContent('')
    setCategoryId(categories[0] ? String(categories[0].id) : 'none')
    setIsPublished(true)
    setFieldErrors({})
    setDialogOpen(true)
  }

  function openEditDialog(article: Article) {
    setEditingArticle(article)
    setTitle(article.title)
    setContent(article.content)
    const catId = article.category?.id ?? article.category_id
    setCategoryId(catId ? String(catId) : 'none')
    setIsPublished(article.is_published ?? true)
    setFieldErrors({})
    setDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    // Предварительная проверка на клиенте
    const clientErrors: Record<string, string[]> = {}
    if (!title.trim()) clientErrors.title = ['Введите заголовок статьи.']
    if (!content.trim()) clientErrors.content = ['Введите текст статьи.']

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      return
    }

    setSubmitting(true)
    setFieldErrors({})

    const payload = {
      title: title.trim(),
      content: content.trim(),
      category_id: categoryId !== 'none' ? Number(categoryId) : null,
      is_published: isPublished,
    }

    try {
      if (editingArticle) {
        await api(`/knowledge-base-articles/${editingArticle.id}`, {
          method: 'PUT',
          body: payload,
        })
        toast.success('Статья обновлена')
      } else {
        await api('/knowledge-base-articles', {
          method: 'POST',
          body: payload,
        })
        toast.success('Статья создана')
      }
      setDialogOpen(false)
      loadArticles()
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.errors) {
        setFieldErrors(err.errors)
      }
      toast.error(err instanceof Error ? err.message : 'Ошибка сохранения статьи')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(article: Article) {
    if (!confirm(`Удалить статью «${article.title}»?`)) return
    try {
      await api(`/knowledge-base-articles/${article.id}`, { method: 'DELETE' })
      toast.success('Статья удалена')
      loadArticles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка удаления статьи')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">База знаний</h1>
          <p className="text-sm text-muted-foreground">
            Справочные материалы и ответы на частые вопросы пользователей
          </p>
        </div>

        {isStaff && (
          <Button onClick={openCreateDialog}>
            <Plus className="size-4" />
            Новая статья
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-60">
          <Input
            type="search"
            placeholder="Поиск по заголовку и содержанию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search className="size-4" />
          </div>
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Все категории" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка статей...</p>
      ) : articles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <Card key={article.id} className="transition-colors hover:border-primary/50">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <BookOpen className="size-4 shrink-0 text-primary" />
                    <span>{article.title}</span>
                  </CardTitle>

                  {isStaff && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(article)}
                        title="Редактировать"
                      >
                        <Edit className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(article)}
                        title="Удалить"
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {article.category && (
                    <Badge variant="outline" className="text-xs">
                      {article.category.name}
                    </Badge>
                  )}
                  {isStaff && !article.is_published && (
                    <Badge variant="secondary" className="text-xs">
                      Черновик
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {article.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">Статей не найдено</div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? `Редактировать статью #${editingArticle.id}` : 'Новая статья базы знаний'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="kb-title">Заголовок *</Label>
              <Input
                id="kb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-invalid={Boolean(fieldErrors.title)}
              />
              {fieldErrors.title && (
                <p className="text-xs text-destructive">{fieldErrors.title.join(' ')}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Категория</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Без категории" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без категории</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.category_id && (
                  <p className="text-xs text-destructive">{fieldErrors.category_id.join(' ')}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Статус публикации</Label>
                <Select
                  value={isPublished ? 'published' : 'draft'}
                  onValueChange={(v) => setIsPublished(v === 'published')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Опубликована</SelectItem>
                    <SelectItem value="draft">Черновик (виден сотрудникам)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kb-content">Содержание *</Label>
              <Textarea
                id="kb-content"
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                aria-invalid={Boolean(fieldErrors.content)}
              />
              {fieldErrors.content && (
                <p className="text-xs text-destructive">{fieldErrors.content.join(' ')}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { KbPage as KnowledgeBasePage }
export default KbPage

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { BookOpen, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ApiError, api, errorText } from '@/lib/api'
import { formatDate } from '@/lib/labels'
import type { Article, Category, Paginated } from '@/lib/types'
import { useCurrentUser } from '@/lib/user-context'

export function KbPage() {
  const { isStaff } = useCurrentUser()
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [page, setPage] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Диалог создания/редактирования статьи
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [formCategoryId, setFormCategoryId] = useState<string>('')
  const [isPublished, setIsPublished] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [serverMessage, setServerMessage] = useState<string | null>(null)

  useEffect(() => {
    api<{ data: Category[] } | Category[]>('/categories')
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || []
        setCategories(list)
      })
      .catch(() => {})
  }, [])

  const loadArticles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<Paginated<Article> | { data: Article[] }>('/knowledge-base-articles', {
        query: {
          page,
          per_page: 6,
          search: search || undefined,
          category_id: categoryId === 'all' ? undefined : Number(categoryId),
        },
      })
      const list = Array.isArray(res) ? res : res.data || []
      setArticles(list)
      if ('meta' in res && res.meta) {
        setCurrentPage(res.meta.current_page)
        setLastPage(res.meta.last_page)
        setTotal(res.meta.total)
      } else {
        setCurrentPage(1)
        setLastPage(1)
        setTotal(list.length)
      }
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setLoading(false)
    }
  }, [page, search, categoryId])

  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  const openCreate = () => {
    setEditingArticle(null)
    setTitle('')
    setContent('')
    setFormCategoryId(categories[0] ? String(categories[0].id) : '')
    setIsPublished(true)
    setFieldErrors({})
    setServerMessage(null)
    setDialogOpen(true)
  }

  const openEdit = (article: Article) => {
    setEditingArticle(article)
    setTitle(article.title)
    setContent(article.content)
    setFormCategoryId(article.category?.id ? String(article.category.id) : '')
    setIsPublished(article.is_published)
    setFieldErrors({})
    setServerMessage(null)
    setDialogOpen(true)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setServerMessage(null)

    const clientErrs: Record<string, string[]> = {}
    if (!title.trim()) clientErrs.title = ['Укажите заголовок статьи.']
    if (!content.trim()) clientErrs.content = ['Введите содержание статьи.']

    if (Object.keys(clientErrs).length > 0) {
      setFieldErrors(clientErrs)
      toast.error('Заполните обязательные поля статьи')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        category_id: formCategoryId ? Number(formCategoryId) : null,
        is_published: isPublished,
      }

      if (editingArticle) {
        await api(`/knowledge-base-articles/${editingArticle.id}`, {
          method: 'PUT',
          body: payload,
        })
        toast.success('Статья базы знаний обновлена')
      } else {
        await api('/knowledge-base-articles', {
          method: 'POST',
          body: payload,
        })
        toast.success('Статья базы знаний создана')
      }

      setDialogOpen(false)
      await loadArticles()
    } catch (err) {
      if (err instanceof ApiError) {
        setServerMessage(err.message)
        if (err.errors) setFieldErrors(err.errors)
      }
      toast.error(errorText(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (article: Article) => {
    if (!window.confirm(`Удалить статью «${article.title}»?`)) return
    try {
      await api(`/knowledge-base-articles/${article.id}`, { method: 'DELETE' })
      toast.success('Статья удалена')
      await loadArticles()
    } catch (err) {
      toast.error(errorText(err))
    }
  }

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">База знаний</h1>
          <p className="text-sm text-muted-foreground">
            Справочные инструкции и ответы на частые вопросы пользователей
          </p>
        </div>
        {isStaff && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Новая статья
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={onSearchSubmit} className="flex gap-2">
          <Input
            type="search"
            placeholder="Поиск по заголовку и тексту..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-72"
          />
          <Button type="submit" variant="secondary" size="icon" aria-label="Найти">
            <Search className="size-4" />
          </Button>
        </form>

        <Select
          value={categoryId}
          onValueChange={(val) => {
            setCategoryId(val)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Все категории" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search !== '' || categoryId !== 'all') && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput('')
              setSearch('')
              setCategoryId('all')
              setPage(1)
            }}
          >
            <RotateCcw className="size-3.5" />
            Сбросить
          </Button>
        )}
      </div>

      {articles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <Card key={article.id} className="flex flex-col justify-between transition-colors hover:border-primary/50">
              <div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <BookOpen className="size-4 shrink-0 text-primary" />
                      <span>{article.title}</span>
                    </CardTitle>
                    {isStaff && (
                      <Badge variant={article.is_published ? 'secondary' : 'outline'}>
                        {article.is_published ? 'Опубликована' : 'Черновик'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                    {article.category?.name && (
                      <Badge variant="outline" className="text-[11px]">
                        {article.category.name}
                      </Badge>
                    )}
                    {article.author?.name && <span>Автор: {article.author.name}</span>}
                    {article.created_at && <span>• {formatDate(article.created_at)}</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {article.content}
                  </p>
                </CardContent>
              </div>

              {isStaff && (
                <div className="flex items-center justify-end gap-2 border-t px-6 py-3">
                  <Button variant="outline" size="sm" onClick={() => openEdit(article)}>
                    <Pencil className="size-3.5" />
                    Изменить
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(article)}>
                    <Trash2 className="size-3.5" />
                    Удалить
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          {loading ? 'Загрузка статей...' : 'Статей не найдено'}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Страница {currentPage} из {lastPage}, всего статей: {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= lastPage}
              onClick={() => setPage(currentPage + 1)}
            >
              Вперёд
            </Button>
          </div>
        </div>
      )}

      {/* Диалог создания и редактирования статьи БЗ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? 'Редактирование статьи' : 'Новая статья базы знаний'}
            </DialogTitle>
            <DialogDescription>
              Опубликованные статьи доступны клиентам и используются ИИ при генерации ответов.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} noValidate className="space-y-4 py-2">
            {serverMessage && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {serverMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="kb-title">Заголовок статьи *</Label>
              <Input
                id="kb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Как настроить двухфакторную аутентификацию"
              />
              {fieldErrors.title?.[0] && (
                <p className="text-xs text-destructive">{fieldErrors.title[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Категория</Label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.category_id?.[0] && (
                <p className="text-xs text-destructive">{fieldErrors.category_id[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kb-content">Содержание *</Label>
              <Textarea
                id="kb-content"
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Пошаговая инструкция..."
              />
              {fieldErrors.content?.[0] && (
                <p className="text-xs text-destructive">{fieldErrors.content[0]}</p>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="size-4 rounded border-gray-300"
              />
              Опубликовать статью (доступна клиентам)
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
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

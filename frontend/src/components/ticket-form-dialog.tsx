import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { ImageIcon, Loader2, Paperclip, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import type { Category, Tag, Ticket } from '@/lib/types'
import { useCurrentUser } from '@/lib/user-context'

interface TicketFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
  onSaved?: (ticket: Ticket) => void
  /** Если передан ticket — форма работает в режиме редактирования (PUT /api/tickets/:id) */
  ticket?: Ticket | null
}

interface AiSuggestResponse {
  category_id?: number
  priority?: string
  reason?: string
}

export function TicketFormDialog({
  open,
  onOpenChange,
  onCreated,
  onSaved,
  ticket = null,
}: TicketFormDialogProps) {
  const { isStaff } = useCurrentUser()
  const isEdit = Boolean(ticket)

  const [categories, setCategories] = useState<Category[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [priority, setPriority] = useState<string>('medium')
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<{ name: string; url: string | null; size: number }[]>([])

  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [skipClientValidation, setSkipClientValidation] = useState(false)
  const [serverMessage, setServerMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  // Загружаем справочник категорий и меток из API при открытии модального окна
  useEffect(() => {
    if (!open) return

    setServerMessage(null)
    setFieldErrors({})

    api<{ data: Category[] } | Category[]>('/categories')
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || []
        setCategories(list)
        if (!ticket && list.length > 0 && !categoryId) {
          setCategoryId(String(list[0].id))
        }
      })
      .catch(() => {})

    if (isStaff) {
      api<{ data: Tag[] } | Tag[]>('/tags')
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.data || []
          setAvailableTags(list)
        })
        .catch(() => {})
    }
  }, [open, isStaff, ticket])

  // Инициализация полей при открытии создания или редактирования
  useEffect(() => {
    if (!open) return
    if (ticket) {
      setSubject(ticket.subject ?? '')
      setDescription(ticket.description ?? '')
      setCategoryId(
        ticket.category?.id
          ? String(ticket.category.id)
          : ticket.category_id
            ? String(ticket.category_id)
            : ''
      )
      setPriority(ticket.priority ?? 'medium')
      setSelectedTagIds(ticket.tags?.map((t) => t.id) ?? [])
      setFiles([])
      setPreviews([])
    } else {
      setSubject('')
      setDescription('')
      setPriority('medium')
      setSelectedTagIds([])
      setFiles([])
      setPreviews([])
    }
  }, [open, ticket])

  // Генерация превью для загружаемых изображений
  useEffect(() => {
    const nextPreviews = files.map((file) => ({
      name: file.name,
      size: file.size,
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }))
    setPreviews(nextPreviews)

    return () => {
      nextPreviews.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url)
      })
    }
  }, [files])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length > 0) {
      setFiles((prev) => [...prev, ...selected].slice(0, 5))
      setFieldErrors((prev) => {
        const copy = { ...prev }
        delete copy.attachments
        return copy
      })
    }
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index))
  }

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handleAiSuggest = async () => {
    if (!subject.trim() || !description.trim()) {
      setFieldErrors({
        ...(!subject.trim() ? { subject: ['Введите тему обращения для ИИ-классификации.'] } : {}),
        ...(!description.trim()
          ? { description: ['Введите описание проблемы для ИИ-классификации.'] }
          : {}),
      })
      toast.error('Сначала введите тему и описание обращения')
      return
    }

    setAiLoading(true)
    try {
      const res = await api<AiSuggestResponse>('/ai/suggest-ticket', {
        method: 'POST',
        body: {
          subject,
          description,
        },
      })

      if (res.category_id) {
        setCategoryId(String(res.category_id))
      }
      if (res.priority) {
        setPriority(res.priority)
      }
      if (res.reason) {
        toast.info(res.reason)
      } else {
        toast.success('Категория и приоритет определены с помощью ИИ')
      }
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setAiLoading(false)
    }
  }

  /** Предварительная проверка обязательных полей на клиенте (п. 3 задания) */
  const validateClient = (): boolean => {
    if (skipClientValidation) return true

    const errors: Record<string, string[]> = {}
    if (!subject.trim()) {
      errors.subject = ['Поле «Тема» обязательно для заполнения (проверка на клиенте).']
    } else if (subject.trim().length > 255) {
      errors.subject = ['Тема не должна превышать 255 символов.']
    }

    if (!description.trim()) {
      errors.description = ['Поле «Описание» обязательно для заполнения (проверка на клиенте).']
    }

    if (!categoryId) {
      errors.category_id = ['Выберите категорию из выпадающего списка.']
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast.error('Пожалуйста, заполните обязательные поля формы')
      return false
    }
    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerMessage(null)
    setFieldErrors({})

    if (!validateClient()) {
      return
    }

    setLoading(true)
    try {
      if (isEdit && ticket) {
        const res = await api<{ data: Ticket } | Ticket>(`/tickets/${ticket.id}`, {
          method: 'PUT',
          body: {
            subject: subject.trim(),
            description: description.trim(),
            category_id: categoryId ? Number(categoryId) : undefined,
            priority,
            ...(isStaff ? { tags: selectedTagIds } : {}),
          },
        })
        const updated = 'data' in res ? res.data : res
        toast.success('Заявка успешно обновлена')
        onOpenChange(false)
        onSaved?.(updated)
        onCreated?.()
      } else {
        // Создание заявки через FormData (без заголовка Content-Type: application/json) для поддержки загрузки файлов
        const formData = new FormData()
        formData.append('subject', subject.trim())
        formData.append('description', description.trim())
        if (categoryId) {
          formData.append('category_id', categoryId)
        }
        if (priority) {
          formData.append('priority', priority)
        }
        selectedTagIds.forEach((tagId) => {
          formData.append('tags[]', String(tagId))
        })
        files.forEach((file) => {
          formData.append('attachments[]', file)
        })

        const res = await api<{ data: Ticket } | Ticket>('/tickets', {
          method: 'POST',
          body: formData,
        })
        const created = 'data' in res ? res.data : res
        toast.success('Заявка успешно создана')
        onOpenChange(false)
        onSaved?.(created)
        onCreated?.()
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setServerMessage(`${err.message} (HTTP ${err.status})`)
        if (err.errors) {
          setFieldErrors(err.errors)
        }
      } else {
        setServerMessage(errorText(err))
      }
      toast.error(errorText(err))
    } finally {
      setLoading(false)
    }
  }

  // Собираем ошибки по вложениям (attachments или attachments.0, attachments.1...)
  const attachmentErrors = Object.entries(fieldErrors)
    .filter(([key]) => key === 'attachments' || key.startsWith('attachments.'))
    .flatMap(([, msgs]) => msgs)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Редактирование заявки #${ticket?.id}` : 'Новая заявка в техподдержку'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Измените тему, описание, категорию, приоритет или метки обращения.'
              : 'Опишите проблему, выберите категорию из справочника API и при необходимости прикрепите скриншот или файл.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 py-2">
          {serverMessage && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {serverMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ticket-subject">
              Тема обращения <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value)
                if (fieldErrors.subject) {
                  setFieldErrors((prev) => ({ ...prev, subject: [] }))
                }
              }}
              placeholder="Кратко опишите проблему (например: Не работает вход в кабинет)"
              aria-invalid={Boolean(fieldErrors.subject?.[0])}
            />
            {fieldErrors.subject?.[0] && (
              <p className="text-xs font-medium text-destructive">{fieldErrors.subject[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ticket-description">
              Подробное описание <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="ticket-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (fieldErrors.description) {
                  setFieldErrors((prev) => ({ ...prev, description: [] }))
                }
              }}
              placeholder="Укажите шаги воспроизведения, текст ошибки и ожидания..."
              rows={4}
              aria-invalid={Boolean(fieldErrors.description?.[0])}
            />
            {fieldErrors.description?.[0] && (
              <p className="text-xs font-medium text-destructive">{fieldErrors.description[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                Категория (из API) <span className="text-destructive">*</span>
              </Label>
              <Select
                value={categoryId}
                onValueChange={(val) => {
                  setCategoryId(val)
                  if (fieldErrors.category_id) {
                    setFieldErrors((prev) => ({ ...prev, category_id: [] }))
                  }
                }}
              >
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
                <p className="text-xs font-medium text-destructive">{fieldErrors.category_id[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Приоритет</Label>
              <Select
                value={priority}
                onValueChange={(val) => {
                  setPriority(val)
                  if (fieldErrors.priority) {
                    setFieldErrors((prev) => ({ ...prev, priority: [] }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                  <SelectItem value="urgent">Срочный</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.priority?.[0] && (
                <p className="text-xs font-medium text-destructive">{fieldErrors.priority[0]}</p>
              )}
            </div>
          </div>

          {isStaff && availableTags.length > 0 && (
            <div className="space-y-1.5">
              <Label>Метки (теги)</Label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {availableTags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id)
                  return (
                    <Badge
                      key={tag.id}
                      variant={active ? 'default' : 'outline'}
                      className="cursor-pointer select-none"
                      onClick={() => toggleTag(tag.id)}
                    >
                      #{tag.name}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {!isEdit && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="ticket-files" className="flex items-center gap-1.5 text-sm">
                  <Paperclip className="size-4 text-muted-foreground" />
                  Вложения и скриншоты (FormData)
                </Label>
                <span className="text-xs text-muted-foreground">JPG, PNG, PDF, TXT, LOG (до 10 МБ)</span>
              </div>

              <Input
                id="ticket-files"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf,.txt,.log,image/png,image/jpeg"
                onChange={handleFileChange}
                className="cursor-pointer text-xs"
              />

              {previews.length > 0 && (
                <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                  {previews.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-center gap-2 rounded border bg-background p-2 text-xs"
                    >
                      {item.url ? (
                        <img
                          src={item.url}
                          alt={item.name}
                          className="size-10 rounded object-cover border"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded bg-muted">
                          <ImageIcon className="size-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="text-muted-foreground">{(item.size / 1024).toFixed(1)} КБ</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => removeFile(index)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {attachmentErrors.length > 0 && (
                <p className="text-xs font-medium text-destructive">{attachmentErrors[0]}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {!isEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleAiSuggest}
                disabled={aiLoading}
              >
                {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Определить категорию с ИИ
              </Button>
            )}

            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={skipClientValidation}
                onChange={(e) => setSkipClientValidation(e.target.checked)}
                className="size-3.5 rounded border-gray-300"
              />
              Отправить без клиентской проверки (тест 422 API)
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? 'Сохранение...'
                : isEdit
                  ? 'Сохранить изменения'
                  : 'Создать заявку'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default TicketFormDialog

import { useEffect, useState } from 'react'
import { Loader2, Paperclip, Sparkles, X } from 'lucide-react'
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
import { toast } from 'sonner'
import type { Category, Ticket } from '@/lib/types'

interface TicketFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
  /** Если передана заявка — форма работает в режиме редактирования (PUT /api/tickets/{id}) */
  ticketToEdit?: Ticket | null
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
  ticketToEdit = null,
}: TicketFormDialogProps) {
  const isEditMode = Boolean(ticketToEdit)

  const [categories, setCategories] = useState<Category[]>([])
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [priority, setPriority] = useState<string>('medium')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setFieldErrors({})
      setGeneralError(null)

      if (ticketToEdit) {
        setSubject(ticketToEdit.subject)
        setDescription(ticketToEdit.description)
        setCategoryId(String(ticketToEdit.category?.id ?? ticketToEdit.category_id ?? ''))
        setPriority(ticketToEdit.priority)
        setFiles([])
      } else {
        setSubject('')
        setDescription('')
        setPriority('medium')
        setFiles([])
      }

      api<{ data: Category[] } | Category[]>('/categories')
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.data || []
          setCategories(list)
          if (!ticketToEdit && list.length > 0 && !categoryId) {
            setCategoryId(String(list[0].id))
          }
        })
        .catch(() => {})
    }
  }, [open, ticketToEdit])

  const handleAiSuggest = async () => {
    if (!subject.trim() || !description.trim()) {
      setFieldErrors({
        ...(!subject.trim() ? { subject: ['Введите тему обращения для классификации ИИ.'] } : {}),
        ...(!description.trim() ? { description: ['Введите описание проблемы для классификации ИИ.'] } : {}),
      })
      toast.error('Сначала введите тему и описание обращения')
      return
    }

    setAiLoading(true)
    setFieldErrors({})
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
        toast.success('Категория и приоритет определены')
      }
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setAiLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selected = Array.from(e.target.files).slice(0, 5)
    setFiles(selected)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setGeneralError(null)

    // 1. Предварительная проверка обязательных полей на клиенте (п. 3 задания)
    const clientErrors: Record<string, string[]> = {}
    if (!subject.trim()) {
      clientErrors.subject = ['Укажите тему обращения.']
    } else if (subject.trim().length > 255) {
      clientErrors.subject = ['Тема не должна быть длиннее 255 символов.']
    }
    if (!description.trim()) {
      clientErrors.description = ['Опишите проблему.']
    }
    const selectedCat = categoryId ? Number(categoryId) : categories[0]?.id
    if (!selectedCat) {
      clientErrors.category_id = ['Выберите категорию обращения.']
    }

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      toast.error('Заполните обязательные поля формы')
      return
    }

    setLoading(true)
    try {
      if (isEditMode && ticketToEdit) {
        await api(`/tickets/${ticketToEdit.id}`, {
          method: 'PUT',
          body: {
            category_id: selectedCat,
            subject: subject.trim(),
            description: description.trim(),
            priority,
          },
        })
        toast.success('Заявка успешно обновлена')
      } else if (files.length > 0) {
        // Отправка через FormData без заголовка Content-Type: application/json (п. 6 задания)
        const formData = new FormData()
        formData.append('category_id', String(selectedCat))
        formData.append('subject', subject.trim())
        formData.append('description', description.trim())
        formData.append('priority', priority)
        files.forEach((file) => {
          formData.append('attachments[]', file)
        })

        await api('/tickets', {
          method: 'POST',
          body: formData,
        })
        toast.success('Заявка с вложениями успешно создана')
      } else {
        await api('/tickets', {
          method: 'POST',
          body: {
            category_id: selectedCat,
            subject: subject.trim(),
            description: description.trim(),
            priority,
          },
        })
        toast.success('Заявка успешно создана')
      }

      onOpenChange(false)
      setSubject('')
      setDescription('')
      setFiles([])
      onCreated?.()
    } catch (err) {
      if (err instanceof ApiError) {
        setGeneralError(err.message)
        if (err.errors) {
          setFieldErrors(err.errors)
        }
      } else {
        setGeneralError(errorText(err))
      }
      toast.error(errorText(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? `Редактирование заявки #${ticketToEdit?.id}` : 'Новая заявка'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Измените тему, описание, категорию или приоритет обращения.'
              : 'Опишите проблему. Категорию и приоритет можно выбрать вручную или определить с помощью ИИ.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 py-2">
          {generalError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {generalError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="subject">Тема обращения *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Кратко опишите проблему"
            />
            {fieldErrors.subject?.[0] && (
              <p className="text-xs text-destructive">{fieldErrors.subject[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Описание проблемы *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробное описание проблемы..."
              rows={4}
            />
            {fieldErrors.description?.[0] && (
              <p className="text-xs text-destructive">{fieldErrors.description[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Категория *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
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
              <Label>Приоритет</Label>
              <Select value={priority} onValueChange={setPriority}>
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
                <p className="text-xs text-destructive">{fieldErrors.priority[0]}</p>
              )}
            </div>
          </div>

          {!isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="ticket-attachments" className="flex items-center gap-1.5">
                <Paperclip className="size-3.5" />
                Вложения (скриншоты JPG/PNG, PDF, TXT — до 5 файлов)
              </Label>
              <Input
                id="ticket-attachments"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf,.txt,.log,image/*"
                onChange={handleFileChange}
              />
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {files.map((f, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs"
                    >
                      {f.name} ({Math.round(f.size / 1024)} КБ)
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {(fieldErrors.attachments?.[0] || fieldErrors['attachments.0']?.[0]) && (
                <p className="text-xs text-destructive">
                  {fieldErrors.attachments?.[0] || fieldErrors['attachments.0']?.[0]}
                </p>
              )}
            </div>
          )}

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleAiSuggest}
              disabled={aiLoading}
            >
              {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Определить категорию и приоритет с помощью ИИ
            </Button>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isEditMode
                  ? 'Сохранение...'
                  : 'Создание...'
                : isEditMode
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

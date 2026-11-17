import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { TicketFormDialog } from '@/components/ticket-form-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ApiError, api, errorText, getAttachmentUrl } from '@/lib/api'
import { formatDate, priorityLabels, priorityVariant, statusLabels, transitions } from '@/lib/labels'
import type { AiDraft, Attachment, Tag, Ticket, TicketStatus, User } from '@/lib/types'
import { useCurrentUser } from '@/lib/user-context'

const lifecycleSteps: TicketStatus[] = [
  'new',
  'in_progress',
  'waiting_for_client',
  'resolved',
  'closed',
]

function AttachmentsBlock({ attachments }: { attachments?: Attachment[] }) {
  if (!attachments || attachments.length === 0) return null

  return (
    <div className="space-y-2 pt-2">
      <p className="text-xs font-medium text-muted-foreground">
        Прикреплённые файлы ({attachments.length}):
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {attachments.map((att) => {
          const url = getAttachmentUrl(att)
          const isImage = att.mime_type?.startsWith('image/')
          return (
            <div
              key={att.id}
              className="overflow-hidden rounded-lg border bg-background p-2.5 text-xs shadow-xs"
            >
              {isImage ? (
                <div className="space-y-2">
                  <a href={url} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={url}
                      alt={att.original_name}
                      className="max-h-48 w-full rounded border object-contain bg-muted/30"
                    />
                  </a>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{att.original_name}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Открыть <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{att.original_name}</p>
                      <p className="text-muted-foreground">{(att.size / 1024).toFixed(1)} КБ</p>
                    </div>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-primary hover:underline"
                  >
                    Скачать <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TicketPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { current, isStaff, isAdmin } = useCurrentUser()
  const [staff, setStaff] = useState<User[]>([])

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  // Переписка и загрузка файлов в сообщении (FormData)
  const [messageBody, setMessageBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [messageFiles, setMessageFiles] = useState<File[]>([])
  const [submittingMessage, setSubmittingMessage] = useState(false)
  const [messageErrors, setMessageErrors] = useState<Record<string, string[]>>({})

  // Панель управления ключевым сценарием
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [customStatus, setCustomStatus] = useState<TicketStatus>('resolved')
  const [updating, setUpdating] = useState(false)
  const [aiDraftLoading, setAiDraftLoading] = useState(false)

  // Блок вывода сообщений при нарушении бизнес-правил (409) или отказе в доступе (403)
  const [businessAlert, setBusinessAlert] = useState<{
    status: number
    message: string
  } | null>(null)

  const fetchTicket = async () => {
    try {
      const res = await api<{ data: Ticket } | Ticket>(`/tickets/${id}`)
      const item: Ticket = 'data' in res ? res.data : res
      setTicket(item)
      if (item.assignee) {
        setAssigneeId(String(item.assignee.id))
      } else {
        setAssigneeId('')
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setBusinessAlert({ status: err.status, message: err.message })
      }
      toast.error(errorText(err))
    } finally {
      setLoading(false)
    }
  }

  const run = async (fn: () => Promise<unknown>, successText?: string) => {
    setUpdating(true)
    setBusinessAlert(null)
    try {
      await fn()
      if (successText) toast.success(successText)
      await fetchTicket()
    } catch (err) {
      if (err instanceof ApiError) {
        setBusinessAlert({ status: err.status, message: err.message })
      }
      toast.error(errorText(err))
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    fetchTicket()
  }, [id])

  useEffect(() => {
    if (isStaff) {
      api<{ data: Tag[] } | Tag[]>('/tags')
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.data || []
          setAllTags(list)
        })
        .catch(() => {})
    }
  }, [isStaff])

  useEffect(() => {
    if (isAdmin) {
      api<{ data: User[] }>('/users', { query: { per_page: 100 } })
        .then((response) => setStaff(response.data))
        .catch(() => setStaff([]))
    }
  }, [isAdmin])

  const handleMessageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length > 0) {
      setMessageFiles((prev) => [...prev, ...selected].slice(0, 5))
    }
    e.target.value = ''
  }

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault()
    if (!ticket) return

    setMessageErrors({})
    setBusinessAlert(null)

    if (!messageBody.trim()) {
      setMessageErrors({ body: ['Введите текст сообщения (предварительная проверка на клиенте).'] })
      toast.error('Введите текст сообщения')
      return
    }

    setSubmittingMessage(true)
    try {
      // Если есть прикреплённые файлы, отправляем через FormData (без заголовка Content-Type: application/json)
      if (messageFiles.length > 0) {
        const formData = new FormData()
        formData.append('body', messageBody)
        formData.append('is_internal', isStaff && isInternal ? '1' : '0')
        messageFiles.forEach((f) => formData.append('attachments[]', f))

        await api(`/tickets/${ticket.id}/messages`, {
          method: 'POST',
          body: formData,
        })
      } else {
        await api(`/tickets/${ticket.id}/messages`, {
          method: 'POST',
          body: {
            body: messageBody,
            is_internal: isStaff && isInternal,
          },
        })
      }

      setMessageBody('')
      setIsInternal(false)
      setMessageFiles([])
      toast.success('Сообщение отправлено')
      await fetchTicket()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.errors) {
          setMessageErrors(err.errors)
        } else {
          setBusinessAlert({ status: err.status, message: err.message })
        }
      }
      toast.error(errorText(err))
    } finally {
      setSubmittingMessage(false)
    }
  }

  const handleAiDraft = async () => {
    if (!ticket) return
    setAiDraftLoading(true)
    try {
      const res = await api<AiDraft | { draft: string }>(`/tickets/${ticket.id}/ai-draft`, {
        method: 'POST',
      })
      const draft = 'draft' in res ? res.draft : (res as { body?: string })?.body
      if (draft) {
        setMessageBody(draft)
        toast.success('Черновик ответа сформирован ИИ на основе Базы знаний')
      }
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setAiDraftLoading(false)
    }
  }

  const handleChangeStatus = async (newStatus: TicketStatus) => {
    if (!ticket) return
    await run(
      () =>
        api(`/tickets/${ticket.id}/status`, {
          method: 'PATCH',
          body: { status: newStatus },
        }),
      `Статус заявки изменён на «${statusLabels[newStatus]}»`
    )
  }

  const handleAddTag = async () => {
    if (!ticket || !selectedTag) return
    await run(async () => {
      await api(`/tickets/${ticket.id}/tags`, {
        method: 'POST',
        body: { tag_id: Number(selectedTag) },
      })
      setSelectedTag('')
    }, 'Метка прикреплена к заявке')
  }

  const handleRemoveTag = async (tagId: number) => {
    if (!ticket) return
    await run(
      () =>
        api(`/tickets/${ticket.id}/tags/${tagId}`, {
          method: 'DELETE',
        }),
      'Метка удалена'
    )
  }

  const handleDeleteTicket = async () => {
    if (!ticket) return
    if (!window.confirm(`Вы уверены, что хотите безвозвратно удалить заявку #${ticket.id}?`)) return

    setBusinessAlert(null)
    try {
      await api(`/tickets/${ticket.id}`, { method: 'DELETE' })
      toast.success('Заявка успешно удалена')
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) {
        setBusinessAlert({ status: err.status, message: err.message })
      }
      toast.error(errorText(err))
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" /> К списку заявок
        </Link>
        {businessAlert ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <strong>HTTP {businessAlert.status}:</strong> {businessAlert.message}
          </div>
        ) : (
          <p className="text-muted-foreground">Заявка не найдена.</p>
        )}
      </div>
    )
  }

  const badgeVariant = priorityVariant[ticket.priority] ?? 'secondary'
  const authorName = ticket.author?.name || '—'
  const nextStatuses = transitions[ticket.status] || []
  const canChangeStatus = isAdmin || ticket.assignee?.id === current?.id

  return (
    <div className="space-y-6">
      {/* Шапка карточки с действиями по роли */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
            <ArrowLeft className="size-4" /> К списку заявок
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">
              #{ticket.id} {ticket.subject}
            </h1>
            <Badge variant="outline">{statusLabels[ticket.status] || ticket.status}</Badge>
            <Badge variant={badgeVariant}>
              {priorityLabels[ticket.priority] || ticket.priority}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Редактирование доступно сотрудникам поддержки и администратору */}
          {isStaff && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Редактировать
            </Button>
          )}
          {/* Удаление с подтверждением доступно только администратору */}
          {isAdmin && (
            <Button variant="destructive" size="sm" onClick={handleDeleteTicket}>
              <Trash2 className="size-4" />
              Удалить заявку
            </Button>
          )}
        </div>
      </div>

      {/* Индикатор жизненного цикла заявки (ключевой сценарий) */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Этапы жизненного цикла заявки:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {lifecycleSteps.map((step, index) => {
                const isCurrent = ticket.status === step
                return (
                  <div key={step} className="flex items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isCurrent && <CheckCircle2 className="size-3.5" />}
                      {statusLabels[step]}
                    </span>
                    {index < lifecycleSteps.length - 1 && (
                      <span className="text-muted-foreground">→</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Блок отображения ответа 409 Conflict (нарушение бизнес-правил) или 403 Forbidden */}
      {businessAlert && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-200"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">
                {businessAlert.status === 409
                  ? 'Нарушение бизнес-правила (HTTP 409 Conflict)'
                  : businessAlert.status === 403
                    ? 'Отказ в доступе на сервере (HTTP 403 Forbidden)'
                    : `Ошибка выполнения операции (HTTP ${businessAlert.status})`}
              </p>
              <p className="mt-0.5">{businessAlert.message}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            onClick={() => setBusinessAlert(null)}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Карточка описания и вложений заявки */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Описание обращения и вложения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
              <AttachmentsBlock attachments={ticket.attachments} />
            </CardContent>
          </Card>

          {/* Переписка со связанными сообщениями и вложениями */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Переписка по заявке ({ticket.messages?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.messages && ticket.messages.length > 0 ? (
                <div className="space-y-3">
                  {ticket.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-lg border p-4 text-sm ${
                        msg.is_internal ? 'border-dashed border-amber-300 bg-amber-50/50' : 'bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {msg.author?.name || 'Пользователь'}
                          {msg.is_internal && (
                            <Badge variant="outline" className="ml-2 border-amber-400 text-amber-700">
                              Служебная заметка
                            </Badge>
                          )}
                        </span>
                        <span>{msg.created_at ? formatDate(msg.created_at) : '—'}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                      <AttachmentsBlock attachments={msg.attachments} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Сообщений в этой заявке пока нет</p>
              )}

              <form onSubmit={handleSendMessage} noValidate className="space-y-3 border-t pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="message-body">Новое сообщение</Label>
                  <Textarea
                    id="message-body"
                    value={messageBody}
                    onChange={(e) => {
                      setMessageBody(e.target.value)
                      if (messageErrors.body) {
                        setMessageErrors((prev) => ({ ...prev, body: [] }))
                      }
                    }}
                    placeholder={
                      ticket.status === 'closed'
                        ? 'Заявка закрыта (попытка отправки вернёт бизнес-ошибку 409 Conflict)...'
                        : 'Введите ответ или уточнение по заявке...'
                    }
                    rows={3}
                  />
                  {messageErrors.body?.[0] && (
                    <p className="text-xs font-medium text-destructive">{messageErrors.body[0]}</p>
                  )}
                  {messageErrors.is_internal?.[0] && (
                    <p className="text-xs font-medium text-destructive">{messageErrors.is_internal[0]}</p>
                  )}
                </div>

                {/* Загрузка файлов/изображений к сообщению через FormData */}
                <div className="flex flex-wrap items-center gap-3">
                  <Label
                    htmlFor="message-files"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    <Paperclip className="size-3.5" />
                    Прикрепить файл / скриншот
                  </Label>
                  <Input
                    id="message-files"
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.txt,.log,image/png,image/jpeg"
                    onChange={handleMessageFileChange}
                    className="hidden"
                  />
                  {messageFiles.map((file, idx) => (
                    <Badge key={`${file.name}-${idx}`} variant="secondary" className="gap-1">
                      {file.name}
                      <X
                        className="size-3 cursor-pointer"
                        onClick={() => setMessageFiles((prev) => prev.filter((_, i) => i !== idx))}
                      />
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="submit" disabled={submittingMessage}>
                      {submittingMessage ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Отправка...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 size-4" />
                          Отправить сообщение
                        </>
                      )}
                    </Button>

                    {isStaff && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAiDraft}
                        disabled={aiDraftLoading}
                      >
                        {aiDraftLoading ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 size-4" />
                        )}
                        Черновик ответа (ИИ)
                      </Button>
                    )}
                  </div>

                  {isStaff && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="size-4 rounded border-gray-300 accent-primary"
                      />
                      Служебная заметка (скрыта от клиента)
                    </label>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Карточка связанных данных */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Связанные данные</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Автор заявки</span>
                <span className="font-medium text-right">
                  {authorName}
                  {ticket.author?.email && (
                    <span className="block text-xs text-muted-foreground">{ticket.author.email}</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Категория</span>
                <span className="font-medium">{ticket.category?.name || '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Ответственный</span>
                <span className="font-medium">{ticket.assignee?.name || 'не назначен'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Создана</span>
                <span>{ticket.created_at ? formatDate(ticket.created_at) : '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Обновлена</span>
                <span>{ticket.updated_at ? formatDate(ticket.updated_at) : '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Решена</span>
                <span>{ticket.resolved_at ? formatDate(ticket.resolved_at) : '—'}</span>
              </div>

              <div className="border-t pt-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-muted-foreground">Метки:</span>
                  {ticket.tags && ticket.tags.length > 0 ? (
                    ticket.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="gap-1 pr-1.5">
                        #{tag.name}
                        {isStaff && (
                          <X
                            className="size-3 cursor-pointer hover:text-destructive"
                            onClick={() => handleRemoveTag(tag.id)}
                          />
                        )}
                      </Badge>
                    ))
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ключевой сценарий обработки заявки (для support и admin) */}
          {isStaff && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Обработка заявки (Ключевой сценарий)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {/* 1. Назначение исполнителя */}
                <div className="space-y-2">
                  <Label>1. Назначение исполнителя</Label>
                  {isAdmin ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <Select value={assigneeId} onValueChange={setAssigneeId}>
                        <SelectTrigger className="min-w-0 flex-1">
                          <SelectValue placeholder="Выберите пользователя" />
                        </SelectTrigger>
                        <SelectContent>
                          {staff.map((user) => (
                            <SelectItem key={user.id} value={String(user.id)}>
                              {user.name} ({user.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="secondary"
                        className="shrink-0"
                        disabled={!assigneeId || updating}
                        onClick={() =>
                          run(
                            () =>
                              api(`/tickets/${id}/assign`, {
                                method: 'POST',
                                body: { assignee_id: Number(assigneeId) },
                              }),
                            'Исполнитель успешно назначен'
                          )
                        }
                      >
                        Назначить
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="default"
                      className="w-full gap-2"
                      disabled={updating}
                      onClick={() =>
                        run(
                          () => api(`/tickets/${id}/assign`, { method: 'POST' }),
                          'Заявка взята в работу (статус: В работе)'
                        )
                      }
                    >
                      <UserCheck className="size-4" />
                      Взять заявку в работу на себя
                    </Button>
                  )}
                </div>

                {/* 2. Допустимые переходы статуса */}
                <div className="space-y-2 border-t pt-3">
                  <Label>2. Допустимые переходы по графу статусов</Label>
                  <div className="flex flex-wrap gap-2">
                    {(!canChangeStatus || nextStatuses.length === 0) && (
                      <span className="text-xs text-muted-foreground">
                        {!canChangeStatus
                          ? 'Для смены статуса сначала возьмите заявку в работу'
                          : 'Заявка закрыта (конечный статус)'}
                      </span>
                    )}
                    {canChangeStatus &&
                      nextStatuses.map((next: TicketStatus) => (
                        <Button
                          key={next}
                          variant="outline"
                          size="sm"
                          onClick={() => handleChangeStatus(next)}
                          disabled={updating}
                        >
                          → {statusLabels[next]}
                        </Button>
                      ))}
                  </div>
                </div>

                {/* 3. Произвольная смена статуса (для демонстрации бизнес-правил 409) */}
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-xs text-muted-foreground">
                    Проверка бизнес-правил перехода статуса (409 Conflict)
                  </Label>
                  <div className="flex min-w-0 items-center gap-2">
                    <Select
                      value={customStatus}
                      onValueChange={(v) => setCustomStatus(v as TicketStatus)}
                    >
                      <SelectTrigger className="min-w-0 flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label} ({value})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={updating}
                      onClick={() => handleChangeStatus(customStatus)}
                    >
                      Применить
                    </Button>
                  </div>
                </div>

                {/* 4. Управление метками */}
                <div className="space-y-2 border-t pt-3">
                  <Label>3. Добавить метку (тег)</Label>
                  <div className="flex min-w-0 items-center gap-2">
                    <Select value={selectedTag} onValueChange={setSelectedTag}>
                      <SelectTrigger className="min-w-0 flex-1">
                        <SelectValue placeholder="Выберите метку" />
                      </SelectTrigger>
                      <SelectContent>
                        {allTags.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            #{t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={handleAddTag}
                      disabled={updating}
                    >
                      Добавить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Модальное окно редактирования заявки */}
      <TicketFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        ticket={ticket}
        onSaved={(updated) => {
          setTicket((prev) => (prev ? { ...prev, ...updated } : updated))
          fetchTicket()
        }}
      />
    </div>
  )
}

export default TicketPage

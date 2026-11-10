import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Edit,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { TicketFormDialog } from '@/components/ticket-form-dialog'
import { formatDate, priorityLabels, priorityVariant, statusLabels, transitions } from '@/lib/labels'
import { ApiError, api, errorText } from '@/lib/api'
import { useCurrentUser } from '@/lib/user-context'
import { toast } from 'sonner'
import type { AiDraft, Attachment, Tag, Ticket, TicketStatus, User } from '@/lib/types'

function AttachmentList({ attachments }: { attachments?: Attachment[] }) {
  if (!attachments || attachments.length === 0) return null

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Paperclip className="size-3.5" />
        Вложения ({attachments.length}):
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {attachments.map((att) => {
          const isImage = att.mime_type?.startsWith('image/')
          return (
            <div key={att.id} className="overflow-hidden rounded-lg border bg-muted/30 p-2 text-xs">
              {isImage && att.url ? (
                <a href={att.url} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={att.url}
                    alt={att.original_name}
                    className="mb-2 max-h-48 w-full rounded object-cover border bg-background"
                  />
                </a>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 truncate font-medium">
                  {isImage ? (
                    <ImageIcon className="size-3.5 shrink-0 text-primary" />
                  ) : (
                    <FileText className="size-3.5 shrink-0 text-primary" />
                  )}
                  <span className="truncate">{att.original_name}</span>
                </span>
                {att.url && (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-primary hover:underline"
                  >
                    Открыть ({Math.max(1, Math.round((att.size || 0) / 1024))} КБ)
                  </a>
                )}
              </div>
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

  // Переписка и файлы сообщения
  const [messageBody, setMessageBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [messageFiles, setMessageFiles] = useState<File[]>([])
  const [messageErrors, setMessageErrors] = useState<Record<string, string[]>>({})
  const [submittingMessage, setSubmittingMessage] = useState(false)

  // Управление заявкой и вывод ошибок бизнес-правил (409)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [updating, setUpdating] = useState(false)
  const [aiDraftLoading, setAiDraftLoading] = useState(false)
  const [businessError, setBusinessError] = useState<string | null>(null)

  const fetchTicket = async () => {
    try {
      const res = await api<{ data: Ticket } | Ticket>(`/tickets/${id}`)
      const item: Ticket = 'data' in res ? res.data : res
      setTicket(item)
      if (item.assignee) {
        setAssigneeId(String(item.assignee.id))
      }
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setLoading(false)
    }
  }

  const run = async (fn: () => Promise<unknown>, successText?: string) => {
    setUpdating(true)
    setBusinessError(null)
    try {
      await fn()
      if (successText) toast.success(successText)
      await fetchTicket()
    } catch (err) {
      const msg = errorText(err)
      setBusinessError(msg)
      toast.error(msg)
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket) return

    setMessageErrors({})
    setBusinessError(null)

    // Предварительная проверка на клиенте
    if (!messageBody.trim()) {
      setMessageErrors({ body: ['Введите текст сообщения.'] })
      toast.error('Введите текст сообщения')
      return
    }

    setSubmittingMessage(true)
    try {
      if (messageFiles.length > 0) {
        // Отправка сообщения с вложениями через FormData (без Content-Type: application/json)
        const formData = new FormData()
        formData.append('body', messageBody.trim())
        if (isStaff && isInternal) {
          formData.append('is_internal', '1')
        }
        messageFiles.forEach((f) => formData.append('attachments[]', f))

        await api(`/tickets/${ticket.id}/messages`, {
          method: 'POST',
          body: formData,
        })
      } else {
        await api(`/tickets/${ticket.id}/messages`, {
          method: 'POST',
          body: {
            body: messageBody.trim(),
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
      if (err instanceof ApiError && err.status === 422 && err.errors) {
        setMessageErrors(err.errors)
      } else {
        setBusinessError(errorText(err))
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
      const draft = 'draft' in res ? res.draft : undefined
      if (draft) {
        setMessageBody(draft)
        toast.success('Черновик успешно сформирован на основе Базы знаний')
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
      `Статус изменён на «${statusLabels[newStatus] || newStatus}»`
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
    }, 'Тег прикреплён к заявке')
  }

  const handleRemoveTag = async (tagId: number) => {
    if (!ticket) return
    await run(
      () =>
        api(`/tickets/${ticket.id}/tags/${tagId}`, {
          method: 'DELETE',
        }),
      'Тег снят с заявки'
    )
  }

  const handleDeleteTicket = async () => {
    if (!ticket) return
    if (!window.confirm(`Вы действительно хотите удалить заявку #${ticket.id} «${ticket.subject}»?`)) {
      return
    }

    try {
      await api(`/tickets/${ticket.id}`, { method: 'DELETE' })
      toast.success('Заявка успешно удалена')
      navigate('/')
    } catch (err) {
      const msg = errorText(err)
      setBusinessError(msg)
      toast.error(msg)
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
        <p className="text-muted-foreground">Заявка не найдена или у вас нет прав для её просмотра.</p>
      </div>
    )
  }

  const badgeVariant = (priorityVariant as Record<string, 'default' | 'secondary' | 'outline' | 'destructive'>)?.[ticket.priority] || 'secondary'
  const authorName = ticket.author?.name || '—'
  const nextStatuses = transitions[ticket.status] || []
  const canChangeStatus = isAdmin || ticket.assignee?.id === current?.id

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
            <ArrowLeft className="size-4" /> К списку заявок
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              #{ticket.id} {ticket.subject}
            </h1>
            <Badge variant="outline">{statusLabels[ticket.status] || ticket.status}</Badge>
            <Badge variant={badgeVariant}>
              {priorityLabels[ticket.priority] || ticket.priority}
            </Badge>
          </div>
        </div>

        {isStaff && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="size-4 mr-1.5" />
            Редактировать заявку
          </Button>
        )}
      </div>

      {/* Отображение ошибки бизнес-правила (409 Conflict) или отказа в доступе (403) */}
      {businessError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-5 shrink-0" />
            <div>
              <p className="font-semibold">Ограничение бизнес-правила / прав доступа:</p>
              <p>{businessError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBusinessError(null)}
            className="text-destructive/70 hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Описание обращения</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
              <AttachmentList attachments={ticket.attachments} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Переписка по заявке</CardTitle>
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
                      <AttachmentList attachments={msg.attachments} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Сообщений пока нет</p>
              )}

              <form onSubmit={handleSendMessage} noValidate className="space-y-3 pt-4 border-t">
                <div className="space-y-1.5">
                  <Textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder={
                      ticket.status === 'closed'
                        ? 'Заявка закрыта (при попытке отправки сервер вернёт 409 Conflict)'
                        : 'Введите сообщение...'
                    }
                    rows={4}
                  />
                  {messageErrors.body?.[0] && (
                    <p className="text-xs text-destructive">{messageErrors.body[0]}</p>
                  )}
                  {messageErrors.is_internal?.[0] && (
                    <p className="text-xs text-destructive">{messageErrors.is_internal[0]}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="msg-files" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Paperclip className="size-3.5" />
                    Прикрепить файлы или изображения к сообщению
                  </Label>
                  <Input
                    id="msg-files"
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.txt,.log,image/*"
                    onChange={(e) =>
                      setMessageFiles(e.target.files ? Array.from(e.target.files).slice(0, 5) : [])
                    }
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={submittingMessage}>
                      {submittingMessage ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Отправка...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 size-4" />
                          Отправить
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
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="size-4 rounded border-gray-300 accent-primary"
                      />
                      Служебная заметка
                    </label>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Связанные данные заявки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Автор</span>
                <span className="font-medium">{authorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email автора</span>
                <span className="text-xs text-muted-foreground">{ticket.author?.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Категория</span>
                <span className="font-medium">{ticket.category?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ответственный</span>
                <span className="font-medium">{ticket.assignee?.name || 'не назначен'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Создана</span>
                <span>{ticket.created_at ? formatDate(ticket.created_at) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Решена</span>
                <span>{ticket.resolved_at ? formatDate(ticket.resolved_at) : '—'}</span>
              </div>

              <div className="pt-2 border-t">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground mr-1">Теги:</span>
                  {ticket.tags && ticket.tags.length > 0 ? (
                    ticket.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="gap-1 pr-1.5">
                        {tag.name}
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

          {/* Панель управления заявкой — скрыта для роли client (п. 7 задания) */}
          {isStaff && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Управление (Ключевой сценарий)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <Label>Ответственный исполнитель</Label>
                  {isAdmin ? (
                    <div className="flex gap-2">
                      <Select value={assigneeId} onValueChange={setAssigneeId}>
                        <SelectTrigger className="flex-1">
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
                        disabled={!assigneeId || updating}
                        onClick={() =>
                          run(
                            () =>
                              api(`/tickets/${id}/assign`, {
                                method: 'POST',
                                body: { assignee_id: Number(assigneeId) },
                              }),
                            'Ответственный специалист назначен'
                          )
                        }
                      >
                        Назначить
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled={updating}
                      onClick={() =>
                        run(
                          () => api(`/tickets/${id}/assign`, { method: 'POST' }),
                          'Заявка взята в работу'
                        )
                      }
                    >
                      Взять в работу на себя
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <span className="font-medium">Допустимые переходы статуса</span>
                  <div className="flex flex-wrap gap-2">
                    {(!canChangeStatus || nextStatuses.length === 0) && (
                      <span className="text-xs text-muted-foreground">
                        {!canChangeStatus
                          ? 'Сменить статус может только ответственный специалист или администратор'
                          : 'Для закрытой заявки переходы запрещены'}
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
                          → {statusLabels[next] || next}
                        </Button>
                      ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-medium">Добавить тег</span>
                  <div className="flex gap-2">
                    <Select value={selectedTag} onValueChange={setSelectedTag}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Выберите тег" />
                      </SelectTrigger>
                      <SelectContent>
                        {allTags.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleAddTag} disabled={updating}>
                      Добавить
                    </Button>
                  </div>
                </div>

                {/* Удаление заявки доступно только роли admin (п. 4 и п. 7) */}
                {isAdmin && (
                  <div className="pt-3 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full gap-2"
                      onClick={handleDeleteTicket}
                    >
                      <Trash2 className="size-4" />
                      Удалить заявку
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <TicketFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        ticketToEdit={ticket}
        onCreated={fetchTicket}
      />
    </div>
  )
}

export default TicketPage

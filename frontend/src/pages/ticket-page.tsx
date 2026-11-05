import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, Send, Sparkles, Trash2, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, priorityLabels, priorityVariant, statusLabels } from '@/lib/labels'
import { api, errorText } from '@/lib/api'
import { useCurrentUser } from '@/lib/user-context'
import { toast } from 'sonner'
import type { AiDraft, Tag, Ticket, TicketStatus, User } from '@/lib/types'

const transitions: Record<TicketStatus, TicketStatus[]> = {
  new: ['in_progress', 'closed'],
  in_progress: ['waiting_for_client', 'resolved', 'closed'],
  waiting_for_client: ['in_progress', 'resolved', 'closed'],
  resolved: ['in_progress', 'closed'],
  closed: ['in_progress'],
}
export function TicketPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { current, isStaff, isAdmin } = useCurrentUser()
  const [staff, setStaff] = useState<User[]>([])

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [messageBody, setMessageBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [submittingMessage, setSubmittingMessage] = useState(false)

  const [allTags, setAllTags] = useState<Tag[]>([])
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [updating, setUpdating] = useState(false)
  const [aiDraftLoading, setAiDraftLoading] = useState(false)

  const fetchTicket = async () => {
    try {
      const res = await api<any>(`/tickets/${id}`)
      const item: Ticket = res?.data ?? res
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

  const run = async (fn: () => Promise<any>, successText?: string) => {
    setUpdating(true)
    try {
      await fn()
      if (successText) toast.success(successText)
      await fetchTicket()
    } catch (err) {
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
        .then((response) => setStaff(response.data.filter((user) => user.role !== 'client')))
        .catch(() => setStaff([]))
    }
  }, [isAdmin])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageBody.trim() || !ticket) return

    setSubmittingMessage(true)
    try {
      await api(`/tickets/${ticket.id}/messages`, {
        method: 'POST',
        body: {
          body: messageBody,
          is_internal: isStaff && isInternal,
        },
      })
      setMessageBody('')
      setIsInternal(false)
      toast.success('Сообщение отправлено')
      await fetchTicket()
    } catch (err) {
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
      const draft = 'draft' in res ? res.draft : (res as any)?.body
      if (draft) {
        setMessageBody(draft)
        toast.success('Черновик успешно сформирован')
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
      'Статус обновлен'
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
    }, 'Тег добавлен')
  }

  const handleRemoveTag = async (tagId: number) => {
    if (!ticket) return
    try {
      await api(`/tickets/${ticket.id}/tags/${tagId}`, {
        method: 'DELETE',
      })
      toast.success('Тег удален')
      await fetchTicket()
    } catch (err) {
      toast.error(errorText(err))
    }
  }

  const handleDeleteTicket = async () => {
    if (!ticket) return
    if (!window.confirm(`Вы уверены, что хотите удалить заявку #${ticket.id}?`)) return

    try {
      await api(`/tickets/${ticket.id}`, { method: 'DELETE' })
      toast.success('Заявка успешно удалена')
      navigate('/')
    } catch (err) {
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
        <p className="text-muted-foreground">Заявка не найдена.</p>
      </div>
    )
  }

  const badgeVariant = (priorityVariant as Record<string, any>)?.[ticket.priority] || 'secondary'
  const authorName = ticket.author?.name || (ticket as any).client?.name || '—'
  const nextStatuses = transitions[ticket.status] || []
  const canChangeStatus = isAdmin || ticket.assignee?.id === current?.id

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Описание</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Переписка</CardTitle>
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
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Сообщений пока нет</p>
              )}

              <form onSubmit={handleSendMessage} className="space-y-3 pt-4 border-t">
                <Textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Введите сообщение"
                  rows={4}
                  required
                />

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
              <CardTitle className="text-base font-semibold">Детали</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Автор</span>
                <span className="font-medium">{authorName}</span>
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

          {isStaff && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Управление</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <Label>Ответственный</Label>
                  {isAdmin ? (
                    <div className="flex gap-2">
                      <Select value={assigneeId} onValueChange={setAssigneeId}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Выберите" />
                        </SelectTrigger>
                        <SelectContent>
                          {staff.map((user) => (
                            <SelectItem key={user.id} value={String(user.id)}>
                              {user.name}
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
                            'Ответственный назначен'
                          )
                        }
                      >
                        Назначить
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled={updating}
                      onClick={() =>
                        run(
                          () => api(`/tickets/${id}/assign`, { method: 'POST' }),
                          'Заявка взята в работу'
                        )
                      }
                    >
                      Взять в работу
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <span className="font-medium">Сменить статус</span>
                  <div className="flex flex-wrap gap-2">
                    {(!canChangeStatus || nextStatuses.length === 0) && (
                      <span className="text-muted-foreground">Нет доступных переходов</span>
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
                          {statusLabels[next] || next}
                        </Button>
                      ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-medium">Добавить тег</span>
                  <div className="flex gap-2">
                    <Select value={selectedTag} onValueChange={setSelectedTag}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Выберите" />
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
    </div>
  )
}

export default TicketPage
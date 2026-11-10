import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Play,
  Plus,
  ShieldAlert,
  UserCheck,
  Workflow,
} from 'lucide-react'
import { toast } from 'sonner'
import { TicketFormDialog } from '@/components/ticket-form-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api, ApiError } from '@/lib/api'
import { priorityLabels, priorityVariant, statusLabels, statusVariant } from '@/lib/labels'
import type { Paginated, Ticket, TicketStatus } from '@/lib/types'
import { useCurrentUser } from '@/lib/user-context'

const PIPELINE_STATUSES: TicketStatus[] = [
  'new',
  'in_progress',
  'waiting_for_client',
  'resolved',
  'closed',
]

const NEXT_STEP_LABEL: Record<TicketStatus, { next?: TicketStatus; label?: string }> = {
  new: { next: 'in_progress', label: 'Взять в работу' },
  in_progress: { next: 'resolved', label: 'Отметить решённой' },
  waiting_for_client: { next: 'in_progress', label: 'Вернуть в работу' },
  resolved: { next: 'closed', label: 'Закрыть заявку' },
  closed: {},
}

export function WorkflowPage() {
  const { current, isStaff } = useCurrentUser()
  const isClient = current?.role === 'client'
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [conflictAlert, setConflictAlert] = useState<{
    status: number
    title: string
    message: string
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<Paginated<Ticket>>('/tickets?per_page=50&sort=updated_at&order=desc')
      setTickets(res.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка загрузки заявок')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const myActiveCount = tickets.filter(
    (t) =>
      t.assignee?.id === current?.id &&
      (t.status === 'new' || t.status === 'in_progress' || t.status === 'waiting_for_client'),
  ).length

  async function assignToMe(ticket: Ticket) {
    if (!current) return
    setConflictAlert(null)
    try {
      await api(`/tickets/${ticket.id}/assign`, {
        method: 'POST',
        body: { assigned_to: current.id },
      })
      toast.success(`Заявка #${ticket.id} назначена на вас`)
      load()
    } catch (err) {
      if (err instanceof ApiError) {
        setConflictAlert({
          status: err.status,
          title:
            err.status === 409
              ? 'Нарушение бизнес-правила (409 Conflict)'
              : `Ошибка выполнения запроса (${err.status})`,
          message: err.message,
        })
      }
      toast.error(err instanceof Error ? err.message : 'Ошибка назначения')
    }
  }

  async function transitionStatus(ticket: Ticket, targetStatus: TicketStatus) {
    setConflictAlert(null)
    try {
      await api(`/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        body: { status: targetStatus },
      })
      toast.success(`Заявка #${ticket.id}: статус изменён на «${statusLabels[targetStatus]}»`)
      load()
    } catch (err) {
      if (err instanceof ApiError) {
        setConflictAlert({
          status: err.status,
          title:
            err.status === 409
              ? 'Нарушение бизнес-правила (409 Conflict)'
              : err.status === 403
                ? 'Доступ запрещён сервером (403 Forbidden)'
                : `Ошибка (${err.status})`,
          message: err.message,
        })
      }
      toast.error(err instanceof Error ? err.message : 'Ошибка смены статуса')
    }
  }

  async function simulateInvalidTransition() {
    const candidate =
      tickets.find((t) => t.status === 'new') ??
      tickets.find((t) => t.status === 'closed') ??
      tickets[0]

    if (!candidate) {
      toast.error('Сначала создайте хотя бы одну заявку')
      return
    }

    const invalidTarget: TicketStatus = candidate.status === 'new' ? 'closed' : 'new'
    await transitionStatus(candidate, invalidTarget)
  }

  async function simulateForbiddenAction() {
    const candidate = tickets[0]
    if (!candidate || !current) {
      toast.error('Нет доступных заявок для проверки')
      return
    }
    setConflictAlert(null)
    try {
      await api(`/tickets/${candidate.id}/assign`, {
        method: 'POST',
        body: { assigned_to: current.id },
      })
      toast.success('Запрос выполнен успешно (вы сотрудник поддержки/администратор)')
      load()
    } catch (err) {
      if (err instanceof ApiError) {
        setConflictAlert({
          status: err.status,
          title:
            err.status === 403
              ? 'Запрос отклонён сервером (403 Forbidden)'
              : `Ответ сервера (${err.status})`,
          message: err.message,
        })
      }
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Workflow className="size-6 text-primary" />
            Ключевой сценарий: обработка заявок Help Desk
          </h1>
          <p className="text-sm text-muted-foreground">
            Полный жизненный цикл обращения: регистрация → назначение исполнителя → работа → решение → закрытие
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={simulateInvalidTransition}>
            <AlertTriangle className="size-4 text-amber-500" />
            Проверить бизнес-правило (409 Conflict)
          </Button>
          {isClient && (
            <Button variant="outline" size="sm" onClick={simulateForbiddenAction}>
              <ShieldAlert className="size-4 text-destructive" />
              Проверить защиту роли (403 Forbidden)
            </Button>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Новая заявка
          </Button>
        </div>
      </div>

      {/* Индикатор бизнес-правил и ролевой модели */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Play className="size-4 text-primary" />
              1. Матрица переходов статусов
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>
              <strong>Новая</strong> → В работе (нельзя закрыть без решения)
            </p>
            <p>
              <strong>В работе</strong> → Ждёт клиента / Решена / Закрыта
            </p>
            <p>
              <strong>Решена</strong> → В работе (переоткрытие) / Закрыта
            </p>
            <p>
              Нарушение порядка возвращает <code>409 Conflict</code>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <UserCheck className="size-4 text-primary" />
              2. Лимит нагрузки специалиста
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>
              Максимум <strong>5 активных заявок</strong> на одного сотрудника поддержки.
            </p>
            {isStaff ? (
              <p className="font-medium text-foreground">
                Ваша текущая нагрузка: {myActiveCount} / 5 активных заявок
              </p>
            ) : (
              <p>
                При превышении лимита сервер возвращает <code>409 Conflict</code>.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="size-4 text-primary" />
              3. Права по ролям
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>
              <strong>Клиент:</strong> создаёт заявки, ведёт переписку, закрывает или переоткрывает решённую заявку.
            </p>
            <p>
              <strong>Поддержка / Админ:</strong> назначает исполнителей, меняет статусы, пишет внутренние заметки.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Баннер ошибки 409 Conflict / 403 Forbidden */}
      {conflictAlert && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/60 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{conflictAlert.title}</p>
            <p className="mt-0.5">{conflictAlert.message}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setConflictAlert(null)}>
            Закрыть
          </Button>
        </div>
      )}

      {/* Доска этапов жизненного цикла заявки */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка заявок...</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {PIPELINE_STATUSES.map((status) => {
            const columnTickets = tickets.filter((t) => t.status === status)
            const step = NEXT_STEP_LABEL[status]

            return (
              <div key={status} className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <Badge variant={statusVariant[status]}>{statusLabels[status]}</Badge>
                  <Badge variant="secondary">{columnTickets.length}</Badge>
                </div>

                <div className="space-y-3">
                  {columnTickets.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Нет заявок</p>
                  ) : (
                    columnTickets.map((ticket) => (
                      <Card key={ticket.id} className="shadow-xs">
                        <CardHeader className="p-3 pb-2">
                          <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
                            <span className="font-mono">#{ticket.id}</span>
                            <Badge variant={priorityVariant[ticket.priority]}>
                              {priorityLabels[ticket.priority]}
                            </Badge>
                          </div>
                          <CardTitle className="text-sm leading-snug">
                            <Link to={`/tickets/${ticket.id}`} className="hover:underline">
                              {ticket.subject}
                            </Link>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {ticket.category?.name ?? 'Без категории'}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-2 p-3 pt-0 text-xs">
                          <div className="text-muted-foreground">
                            <div>Автор: {ticket.author?.name ?? '—'}</div>
                            <div>
                              Исполнитель:{' '}
                              <span className="font-medium text-foreground">
                                {ticket.assignee?.name ?? 'Не назначен'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 pt-1">
                            {isStaff && !ticket.assignee && ticket.status !== 'closed' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="w-full justify-center"
                                onClick={() => assignToMe(ticket)}
                              >
                                <UserCheck className="size-3.5" />
                                Назначить на меня
                              </Button>
                            )}

                            {/* Быстрый переход по сценарию для поддержки */}
                            {isStaff && step.next && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full justify-center"
                                onClick={() => transitionStatus(ticket, step.next!)}
                              >
                                {step.label}
                                <ArrowRight className="size-3.5" />
                              </Button>
                            )}

                            {/* Действия клиента для решённой заявки */}
                            {isClient && ticket.status === 'resolved' && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="flex-1"
                                  onClick={() => transitionStatus(ticket, 'closed')}
                                >
                                  <CheckCircle2 className="size-3" />
                                  Подтвердить
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => transitionStatus(ticket, 'in_progress')}
                                >
                                  Переоткрыть
                                </Button>
                              </div>
                            )}

                            {isClient && ticket.status === 'new' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => transitionStatus(ticket, 'closed')}
                              >
                                Проверить 409 (закрыть новую)
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <TicketFormDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => load()} />
    </div>
  )
}

export default WorkflowPage

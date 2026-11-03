import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TicketFormDialog } from '@/components/ticket-form-dialog'
import { api, errorText } from '@/lib/api'
import { formatDate, priorityLabels, priorityVariant, statusLabels, statusVariant } from '@/lib/labels'
import type { Paginated, Ticket } from '@/lib/types'
import { useCurrentUser } from '@/lib/user-context'

export default function TicketsPage() {
  const { current, isStaff } = useCurrentUser()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    if (!current) return
    setLoading(true)
    try {
      const response = await api<Paginated<Ticket>>('/tickets', {
        query: {
          page,
          per_page: 10,
          status: status === 'all' ? undefined : status,
          priority: priority === 'all' ? undefined : priority,
          search,
          // клиент видит только свои заявки
          user_id: isStaff ? undefined : current.id,
        },
      })
      setTickets(response.data)
      setLastPage(response.meta.last_page)
      setTotal(response.meta.total)
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setLoading(false)
    }
  }, [current, isStaff, page, status, priority, search])

  useEffect(() => {
    load()
  }, [load])

  function onSearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Заявки</h1>
          <p className="text-sm text-muted-foreground">
            {isStaff ? 'Все обращения в службу поддержки' : 'Ваши обращения в службу поддержки'}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Новая заявка
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={onSearch} className="flex gap-2">
              <Input
                className="w-64"
                placeholder="Поиск по теме и описанию"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Button type="submit" variant="secondary" size="icon" aria-label="Найти">
                <Search className="size-4" />
              </Button>
            </form>

            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={priority}
              onValueChange={(value) => {
                setPriority(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все приоритеты</SelectItem>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">№</TableHead>
                <TableHead>Тема</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Приоритет</TableHead>
                <TableHead>Автор</TableHead>
                <TableHead>Ответственный</TableHead>
                <TableHead>Создана</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="text-muted-foreground">{ticket.id}</TableCell>
                  <TableCell className="max-w-xs font-medium">
                    <Link to={`/tickets/${ticket.id}`} className="hover:underline">
                      {ticket.subject}
                    </Link>
                  </TableCell>
                  <TableCell>{ticket.category?.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[ticket.status]}>{statusLabels[ticket.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[ticket.priority]}>
                      {priorityLabels[ticket.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell>{ticket.author?.name}</TableCell>
                  <TableCell>{ticket.assignee?.name ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(ticket.created_at)}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && tickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Заявок не найдено
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Страница {page} из {lastPage}, всего заявок: {total}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= lastPage}
                onClick={() => setPage(page + 1)}
              >
                Вперёд
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <TicketFormDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </div>
  )
}
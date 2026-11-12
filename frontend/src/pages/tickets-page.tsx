import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Plus, RotateCcw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TicketFormDialog } from '@/components/ticket-form-dialog'
import { api, downloadTicketsCsv, errorText } from '@/lib/api'
import { formatDate, priorityLabels, priorityVariant, statusLabels, statusVariant } from '@/lib/labels'
import type { Category, Paginated, Ticket } from '@/lib/types'
import { useCurrentUser } from '@/lib/user-context'

const sortFieldLabels: Record<string, string> = {
  id: 'По номеру (ID)',
  created_at: 'По дате создания',
  updated_at: 'По дате обновления',
  priority: 'По приоритету',
  status: 'По статусу',
}

export default function TicketsPage() {
  const { current, isStaff } = useCurrentUser()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Пагинация из блока meta ответа Laravel
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(5)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Фильтры и поиск
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  // Сортировка
  const [sort, setSort] = useState<'id' | 'created_at' | 'updated_at' | 'priority' | 'status'>('id')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    api<{ data: Category[] } | Category[]>('/categories')
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || []
        setCategories(list)
      })
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    if (!current) return
    setLoading(true)
    try {
      const response = await api<Paginated<Ticket>>('/tickets', {
        query: {
          page,
          per_page: perPage,
          status: status === 'all' ? undefined : status,
          priority: priority === 'all' ? undefined : priority,
          category_id: categoryId === 'all' ? undefined : Number(categoryId),
          search: search || undefined,
          sort,
          order,
        },
      })
      setTickets(response.data)
      setCurrentPage(response.meta.current_page)
      setLastPage(response.meta.last_page)
      setTotal(response.meta.total)
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setLoading(false)
    }
  }, [current, page, perPage, status, priority, categoryId, search, sort, order])

  useEffect(() => {
    load()
  }, [load])

  function onSearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  function resetFilters() {
    setSearchInput('')
    setSearch('')
    setStatus('all')
    setPriority('all')
    setCategoryId('all')
    setSort('id')
    setOrder('desc')
    setPage(1)
  }

  function toggleColumnSort(field: 'id' | 'created_at' | 'updated_at' | 'priority' | 'status') {
    if (sort === field) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(field)
      setOrder('desc')
    }
    setPage(1)
  }

  async function handleExportCsv() {
    try {
      await downloadTicketsCsv({
        status: status === 'all' ? undefined : status,
        priority: priority === 'all' ? undefined : priority,
        category_id: categoryId === 'all' ? undefined : Number(categoryId),
      })
      toast.success('CSV-отчёт успешно выгружен')
    } catch (err) {
      toast.error(errorText(err))
    }
  }

  const hasActiveFilters =
    status !== 'all' ||
    priority !== 'all' ||
    categoryId !== 'all' ||
    search !== '' ||
    sort !== 'id' ||
    order !== 'desc'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Заявки</h1>
          <p className="text-sm text-muted-foreground">
            {isStaff
              ? 'Все обращения пользователей с фильтрацией, сортировкой и пагинацией'
              : 'Ваши обращения в службу технической поддержки'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStaff && (
            <Button variant="outline" onClick={handleExportCsv}>
              <Download className="size-4" />
              Выгрузить CSV
            </Button>
          )}
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Новая заявка
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Панель фильтрации, поиска и сортировки */}
          <div className="flex flex-wrap items-center gap-2.5">
            <form onSubmit={onSearch} className="flex gap-1.5">
              <Input
                className="w-60"
                placeholder="Поиск по теме и описанию..."
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
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Статус" />
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
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Приоритет" />
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

            <Select
              value={categoryId}
              onValueChange={(value) => {
                setCategoryId(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Категория" />
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

            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value as typeof sort)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sortFieldLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                setPage(1)
              }}
              title="Направление сортировки"
            >
              {order === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
              {order === 'asc' ? 'По возр. (ASC)' : 'По убыв. (DESC)'}
            </Button>

            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
                <RotateCcw className="size-3.5" />
                Сбросить
              </Button>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">
                  <button
                    type="button"
                    onClick={() => toggleColumnSort('id')}
                    className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                  >
                    №
                    <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
                <TableHead>Тема</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleColumnSort('status')}
                    className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                  >
                    Статус
                    <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleColumnSort('priority')}
                    className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                  >
                    Приоритет
                    <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
                <TableHead>Автор</TableHead>
                <TableHead>Ответственный</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleColumnSort('created_at')}
                    className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                  >
                    Создана
                    <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="text-muted-foreground">#{ticket.id}</TableCell>
                  <TableCell className="max-w-xs font-medium">
                    <Link to={`/tickets/${ticket.id}`} className="hover:underline">
                      {ticket.subject}
                    </Link>
                    {ticket.tags && ticket.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ticket.tags.map((t) => (
                          <span
                            key={t.id}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            #{t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{ticket.category?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[ticket.status]}>{statusLabels[ticket.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[ticket.priority]}>
                      {priorityLabels[ticket.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell>{ticket.author?.name ?? '—'}</TableCell>
                  <TableCell>{ticket.assignee?.name ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(ticket.created_at)}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && tickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Заявок по заданным параметрам не найдено
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Пагинация на основе блока meta (current_page, last_page, total) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Страница <strong className="text-foreground">{currentPage}</strong> из{' '}
                <strong className="text-foreground">{lastPage}</strong> (всего записей:{' '}
                <strong className="text-foreground">{total}</strong>)
              </span>
              <Select
                value={String(perPage)}
                onValueChange={(val) => {
                  setPerPage(Number(val))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">По 5 на странице</SelectItem>
                  <SelectItem value="10">По 10 на странице</SelectItem>
                  <SelectItem value="20">По 20 на странице</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => setPage(currentPage - 1)}
              >
                Назад
              </Button>
              {Array.from({ length: lastPage }, (_, idx) => idx + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? 'default' : 'outline'}
                  size="sm"
                  className="w-8 px-0"
                  disabled={loading}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= lastPage || loading}
                onClick={() => setPage(currentPage + 1)}
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

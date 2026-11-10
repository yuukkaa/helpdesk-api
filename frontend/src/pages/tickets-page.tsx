import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpDown, Download, Plus, RotateCcw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TicketFormDialog } from '@/components/ticket-form-dialog'
import { API_BASE_URL, api, errorText, getToken } from '@/lib/api'
import { formatDate, priorityLabels, priorityVariant, statusLabels, statusVariant } from '@/lib/labels'
import type { Category, Paginated, Ticket } from '@/lib/types'
import { useCurrentUser } from '@/lib/user-context'

export default function TicketsPage() {
  const { current, isStaff } = useCurrentUser()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Пагинация из блока meta ответа Laravel
  const [page, setPage] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Фильтры, поиск и сортировка
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'id' | 'created_at' | 'priority' | 'status'>('id')
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')

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
          per_page: 10,
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
  }, [current, page, status, priority, categoryId, search, sort, order])

  useEffect(() => {
    load()
  }, [load])

  function onSearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  function resetFilters() {
    setStatus('all')
    setPriority('all')
    setCategoryId('all')
    setSearchInput('')
    setSearch('')
    setSort('id')
    setOrder('desc')
    setPage(1)
  }

  async function handleExportCsv() {
    try {
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
      const token = getToken()
      const res = await fetch(`${baseUrl}/tickets/export/csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Не удалось скачать CSV')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'tickets_export.csv'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Файл tickets_export.csv скачан')
    } catch {
      toast.error('Ошибка при экспорте CSV')
    }
  }

  const pageNumbers = Array.from({ length: lastPage }, (_, i) => i + 1)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Заявки</h1>
          <p className="text-sm text-muted-foreground">
            {isStaff ? 'Все обращения в службу поддержки' : 'Ваши обращения в службу поддержки'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStaff && (
            <Button variant="outline" onClick={handleExportCsv}>
              <Download className="size-4" />
              Экспорт CSV
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
          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={onSearch} className="flex gap-2">
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

            {/* Фильтр по категории */}
            <Select
              value={categoryId}
              onValueChange={(value) => {
                setCategoryId(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-48">
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

            {/* Фильтр по статусу */}
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-40">
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

            {/* Фильтр по приоритету */}
            <Select
              value={priority}
              onValueChange={(value) => {
                setPriority(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-40">
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

            {/* Сортировка */}
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value as 'id' | 'created_at' | 'priority' | 'status')
                setPage(1)
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id">Сортировка: по №</SelectItem>
                <SelectItem value="created_at">По дате создания</SelectItem>
                <SelectItem value="priority">По приоритету</SelectItem>
                <SelectItem value="status">По статусу</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOrder(order === 'desc' ? 'asc' : 'desc')
                setPage(1)
              }}
              title="Направление сортировки"
            >
              <ArrowUpDown className="size-4 mr-1" />
              {order === 'desc' ? 'По убыванию' : 'По возрастанию'}
            </Button>

            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="size-4 mr-1" />
              Сбросить
            </Button>
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
                    {ticket.created_at ? formatDate(ticket.created_at) : '—'}
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

          {/* Пагинация на основе блока meta (current_page, last_page, total) */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              Страница {currentPage} из {lastPage} (всего записей: {total})
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Назад
              </Button>
              {pageNumbers.map((num) => (
                <Button
                  key={num}
                  variant={num === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(num)}
                >
                  {num}
                </Button>
              ))}
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
        </CardContent>
      </Card>

      <TicketFormDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </div>
  )
}

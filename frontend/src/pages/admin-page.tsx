import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Download,
  FolderKanban,
  Pencil,
  Plus,
  ShieldAlert,
  Tag as TagIcon,
  Trash2,
  Users,
  X,
} from 'lucide-react'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, api, downloadTicketsCsv, errorText } from '@/lib/api'
import { priorityLabels, roleLabels, statusLabels } from '@/lib/labels'
import type { Category, Paginated, Role, Tag, TicketPriority, TicketStatistics, TicketStatus, User } from '@/lib/types'
import { useCurrentUser } from '@/lib/user-context'

type TabKey = 'stats' | 'categories' | 'users' | 'tags'

export default function AdminPage() {
  const { isAdmin, isStaff } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<TabKey>(isAdmin ? 'categories' : 'stats')

  // Глобальное уведомление о бизнес-правиле (409) или отказе доступа (403)
  const [alertBox, setAlertBox] = useState<{ status: number; message: string } | null>(null)

  // 1. Статистика
  const [stats, setStats] = useState<TicketStatistics | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  // 2. Категории (только admin для изменения)
  const [categories, setCategories] = useState<Category[]>([])
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')
  const [catErrors, setCatErrors] = useState<Record<string, string[]>>({})
  const [catSaving, setCatSaving] = useState(false)

  // 3. Пользователи (только admin)
  const [users, setUsers] = useState<User[]>([])
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [userLastPage, setUserLastPage] = useState(1)
  const [userTotal, setUserTotal] = useState(0)
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [uName, setUName] = useState('')
  const [uEmail, setUEmail] = useState('')
  const [uRole, setURole] = useState<Role>('client')
  const [uPassword, setUPassword] = useState('')
  const [uPasswordConfirm, setUPasswordConfirm] = useState('')
  const [userErrors, setUserErrors] = useState<Record<string, string[]>>({})
  const [userSaving, setUserSaving] = useState(false)

  // 4. Метки (support, admin)
  const [tags, setTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [tagErrors, setTagErrors] = useState<Record<string, string[]>>({})

  const loadStats = useCallback(async () => {
    if (!isStaff) return
    setLoadingStats(true)
    try {
      const res = await api<{ data: TicketStatistics }>('/statistics/tickets')
      setStats(res.data)
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setLoadingStats(false)
    }
  }, [isStaff])

  const loadCategories = useCallback(async () => {
    try {
      const res = await api<{ data: Category[] } | Category[]>('/categories')
      setCategories(Array.isArray(res) ? res : res.data || [])
    } catch (err) {
      toast.error(errorText(err))
    }
  }, [])

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return
    try {
      const res = await api<Paginated<User>>('/users', {
        query: {
          page: userPage,
          per_page: 10,
          role: userRoleFilter === 'all' ? undefined : userRoleFilter,
          search: userSearch || undefined,
        },
      })
      setUsers(res.data)
      setUserLastPage(res.meta.last_page)
      setUserTotal(res.meta.total)
    } catch (err) {
      toast.error(errorText(err))
    }
  }, [isAdmin, userPage, userRoleFilter, userSearch])

  const loadTags = useCallback(async () => {
    if (!isStaff) return
    try {
      const res = await api<{ data: Tag[] } | Tag[]>('/tags')
      setTags(Array.isArray(res) ? res : res.data || [])
    } catch (err) {
      toast.error(errorText(err))
    }
  }, [isStaff])

  useEffect(() => {
    loadStats()
    loadCategories()
    loadTags()
  }, [loadStats, loadCategories, loadTags])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Обработчики категорий
  const openCreateCategory = () => {
    setEditingCat(null)
    setCatName('')
    setCatDesc('')
    setCatErrors({})
    setCatDialogOpen(true)
  }

  const openEditCategory = (cat: Category) => {
    setEditingCat(cat)
    setCatName(cat.name)
    setCatDesc(cat.description ?? '')
    setCatErrors({})
    setCatDialogOpen(true)
  }

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault()
    setCatErrors({})
    setAlertBox(null)

    if (!catName.trim()) {
      setCatErrors({ name: ['Укажите название категории (проверка на клиенте).'] })
      return
    }

    setCatSaving(true)
    try {
      if (editingCat) {
        await api(`/categories/${editingCat.id}`, {
          method: 'PUT',
          body: { name: catName.trim(), description: catDesc.trim() || null },
        })
        toast.success('Категория обновлена')
      } else {
        await api('/categories', {
          method: 'POST',
          body: { name: catName.trim(), description: catDesc.trim() || null },
        })
        toast.success('Категория создана')
      }
      setCatDialogOpen(false)
      await loadCategories()
      await loadStats()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.errors) {
          setCatErrors(err.errors)
        } else {
          setAlertBox({ status: err.status, message: err.message })
        }
      }
      toast.error(errorText(err))
    } finally {
      setCatSaving(false)
    }
  }

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`Удалить категорию «${cat.name}»?`)) return
    setAlertBox(null)
    try {
      await api(`/categories/${cat.id}`, { method: 'DELETE' })
      toast.success('Категория успешно удалена')
      await loadCategories()
      await loadStats()
    } catch (err) {
      if (err instanceof ApiError) {
        setAlertBox({ status: err.status, message: err.message })
      }
      toast.error(errorText(err))
    }
  }

  // Обработчики пользователей
  const openCreateUser = () => {
    setEditingUser(null)
    setUName('')
    setUEmail('')
    setURole('client')
    setUPassword('')
    setUPasswordConfirm('')
    setUserErrors({})
    setUserDialogOpen(true)
  }

  const openEditUser = (u: User) => {
    setEditingUser(u)
    setUName(u.name)
    setUEmail(u.email)
    setURole(u.role)
    setUPassword('')
    setUPasswordConfirm('')
    setUserErrors({})
    setUserDialogOpen(true)
  }

  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault()
    setUserErrors({})
    setAlertBox(null)

    const errs: Record<string, string[]> = {}
    if (!uName.trim()) errs.name = ['Укажите имя пользователя.']
    if (!uEmail.trim()) errs.email = ['Укажите email пользователя.']
    if (!editingUser && !uPassword) errs.password = ['Укажите пароль (не менее 8 символов).']
    if (Object.keys(errs).length > 0) {
      setUserErrors(errs)
      return
    }

    setUserSaving(true)
    try {
      if (editingUser) {
        await api(`/users/${editingUser.id}`, {
          method: 'PUT',
          body: {
            name: uName.trim(),
            email: uEmail.trim(),
            role: uRole,
            ...(uPassword
              ? { password: uPassword, password_confirmation: uPasswordConfirm }
              : {}),
          },
        })
        toast.success('Данные пользователя обновлены')
      } else {
        await api('/users', {
          method: 'POST',
          body: {
            name: uName.trim(),
            email: uEmail.trim(),
            role: uRole,
            password: uPassword,
            password_confirmation: uPasswordConfirm,
          },
        })
        toast.success('Пользователь успешно создан')
      }
      setUserDialogOpen(false)
      await loadUsers()
      await loadStats()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.errors) {
          setUserErrors(err.errors)
        } else {
          setAlertBox({ status: err.status, message: err.message })
        }
      }
      toast.error(errorText(err))
    } finally {
      setUserSaving(false)
    }
  }

  const handleDeleteUser = async (u: User) => {
    if (!window.confirm(`Удалить пользователя «${u.name}» (${u.email})?`)) return
    setAlertBox(null)
    try {
      await api(`/users/${u.id}`, { method: 'DELETE' })
      toast.success('Пользователь удалён')
      await loadUsers()
    } catch (err) {
      if (err instanceof ApiError) {
        setAlertBox({ status: err.status, message: err.message })
      }
      toast.error(errorText(err))
    }
  }

  // Обработчики меток
  const handleCreateTag = async (e: FormEvent) => {
    e.preventDefault()
    setTagErrors({})
    setAlertBox(null)
    if (!newTagName.trim()) {
      setTagErrors({ name: ['Введите название метки.'] })
      return
    }
    try {
      await api('/tags', { method: 'POST', body: { name: newTagName.trim() } })
      setNewTagName('')
      toast.success('Метка создана')
      await loadTags()
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.errors) {
        setTagErrors(err.errors)
      }
      toast.error(errorText(err))
    }
  }

  const handleDeleteTag = async (tag: Tag) => {
    if (!window.confirm(`Удалить метку «#${tag.name}»?`)) return
    try {
      await api(`/tags/${tag.id}`, { method: 'DELETE' })
      toast.success('Метка удалена')
      await loadTags()
    } catch (err) {
      toast.error(errorText(err))
    }
  }

  // Ручная отправка запроса к маршруту администратора для проверки серверной защиты (403)
  const testManualAdminRequest = async () => {
    setAlertBox(null)
    try {
      await api('/categories', {
        method: 'POST',
        body: { name: 'Попытка без прав администратора' },
      })
      toast.success('Запрос выполнен')
    } catch (err) {
      if (err instanceof ApiError) {
        setAlertBox({ status: err.status, message: err.message })
      }
      toast.error(errorText(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAdmin ? 'Панель администратора и аналитика' : 'Аналитика и справочники поддержки'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? 'Управление категориями, пользователями, метками и сводной статистикой Help Desk'
              : 'Сводная статистика по обращениям, нагрузка специалистов и управление метками'}
          </p>
        </div>

        {isStaff && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await downloadTicketsCsv()
                toast.success('CSV-отчёт успешно скачан')
              } catch (err) {
                toast.error(errorText(err))
              }
            }}
          >
            <Download className="size-4" />
            Экспорт всех заявок в CSV
          </Button>
        )}
      </div>

      {/* Уведомление об ответе 409 Conflict или 403 Forbidden */}
      {alertBox && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-950"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">
                {alertBox.status === 409
                  ? 'Нарушение бизнес-правила (HTTP 409 Conflict)'
                  : alertBox.status === 403
                    ? 'Доступ отклонён сервером (HTTP 403 Forbidden)'
                    : `Ошибка (HTTP ${alertBox.status})`}
              </p>
              <p className="mt-0.5">{alertBox.message}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="size-6" onClick={() => setAlertBox(null)}>
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* Переключатель разделов с учётом роли */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {isAdmin && (
          <Button
            variant={activeTab === 'categories' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('categories')}
          >
            <FolderKanban className="size-4" />
            Категории ({categories.length})
          </Button>
        )}
        {isAdmin && (
          <Button
            variant={activeTab === 'users' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('users')}
          >
            <Users className="size-4" />
            Пользователи ({userTotal})
          </Button>
        )}
        <Button
          variant={activeTab === 'stats' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('stats')}
        >
          <BarChart3 className="size-4" />
          Статистика и нагрузка
        </Button>
        <Button
          variant={activeTab === 'tags' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('tags')}
        >
          <TagIcon className="size-4" />
          Метки ({tags.length})
        </Button>

        {!isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5 border-amber-400 text-amber-800 hover:bg-amber-50"
            onClick={testManualAdminRequest}
          >
            <ShieldAlert className="size-4" />
            Проверить защиту сервера (POST /api/categories → 403)
          </Button>
        )}
      </div>

      {/* ВКЛАДКА 1: КАТЕГОРИИ (только для admin) */}
      {activeTab === 'categories' && isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">
              Справочник категорий обращений
            </CardTitle>
            <Button size="sm" onClick={openCreateCategory}>
              <Plus className="size-4" />
              Добавить категорию
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Заявок</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="text-muted-foreground">#{cat.id}</TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cat.description || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{cat.tickets_count ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditCategory(cat)}>
                          <Pencil className="size-3.5" />
                          Изменить
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCategory(cat)}
                        >
                          <Trash2 className="size-3.5" />
                          Удалить
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ВКЛАДКА 2: ПОЛЬЗОВАТЕЛИ (только для admin) */}
      {activeTab === 'users' && isAdmin && (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3 pb-3">
            <CardTitle className="text-base font-semibold">Управление пользователями</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Поиск по имени или email..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value)
                  setUserPage(1)
                }}
                className="w-56"
              />
              <Select
                value={userRoleFilter}
                onValueChange={(v) => {
                  setUserRoleFilter(v)
                  setUserPage(1)
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все роли</SelectItem>
                  <SelectItem value="client">Клиент</SelectItem>
                  <SelectItem value="support">Специалист</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={openCreateUser}>
                <Plus className="size-4" />
                Новый пользователь
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Имя</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-muted-foreground">#{u.id}</TableCell>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : u.role === 'support' ? 'secondary' : 'outline'}>
                        {roleLabels[u.role]} ({u.role})
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditUser(u)}>
                          <Pencil className="size-3.5" />
                          Изменить
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(u)}>
                          <Trash2 className="size-3.5" />
                          Удалить
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Страница {userPage} из {userLastPage}, всего пользователей: {userTotal}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={userPage <= 1}
                  onClick={() => setUserPage(userPage - 1)}
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={userPage >= userLastPage}
                  onClick={() => setUserPage(userPage + 1)}
                >
                  Вперёд
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ВКЛАДКА 3: СТАТИСТИКА И НАГРУЗКА (support, admin) */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {loadingStats || !stats ? (
            <p className="text-sm text-muted-foreground">Загрузка статистики...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Всего заявок в системе
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.total_tickets}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      В работе / Ожидают ответа
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {(stats.by_status?.in_progress ?? 0) +
                        (stats.by_status?.waiting_for_client ?? 0)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Среднее время решения
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {stats.avg_resolution_minutes !== null
                        ? `${Math.round(stats.avg_resolution_minutes)} мин.`
                        : '—'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">По статусам и приоритетам</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="space-y-2">
                      <p className="font-medium text-muted-foreground">Статусы:</p>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span>{label}</span>
                          <Badge variant="outline">{stats.by_status?.[key as TicketStatus] ?? 0}</Badge>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 border-t pt-3">
                      <p className="font-medium text-muted-foreground">Приоритеты:</p>
                      {Object.entries(priorityLabels).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span>{label}</span>
                          <Badge variant="secondary">
                            {stats.by_priority?.[key as TicketPriority] ?? 0}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">
                      Нагрузка специалистов (лимит: 5 активных)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Сотрудник</TableHead>
                          <TableHead>Активных</TableHead>
                          <TableHead>Решено</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.workload.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell className="font-medium">
                              {w.name}
                              <span className="block text-xs text-muted-foreground">{w.email}</span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={w.active_tickets >= 5 ? 'destructive' : 'secondary'}
                              >
                                {w.active_tickets} / 5
                              </Badge>
                            </TableCell>
                            <TableCell>{w.resolved_tickets}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ВКЛАДКА 4: МЕТКИ (support, admin) */}
      {activeTab === 'tags' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Справочник меток (тегов)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateTag} className="flex max-w-md items-start gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Название новой метки (например: интеграция)"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
                {tagErrors.name?.[0] && (
                  <p className="text-xs text-destructive">{tagErrors.name[0]}</p>
                )}
              </div>
              <Button type="submit">
                <Plus className="size-4" />
                Добавить
              </Button>
            </form>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="gap-2 px-3 py-1 text-sm">
                  #{tag.name}
                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Удалить метку"
                  >
                    <X className="size-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Диалог создания / редактирования категории */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              {editingCat ? `Редактирование категории #${editingCat.id}` : 'Новая категория'}
            </DialogTitle>
            <DialogDescription>
              Укажите уникальное название и краткое описание категории обращений.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} noValidate className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Название категории *</Label>
              <Input
                id="cat-name"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Например: Корпоративный VPN"
              />
              {catErrors.name?.[0] && (
                <p className="text-xs text-destructive">{catErrors.name[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Описание</Label>
              <Textarea
                id="cat-desc"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Описание тематики обращений..."
                rows={3}
              />
              {catErrors.description?.[0] && (
                <p className="text-xs text-destructive">{catErrors.description[0]}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCatDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={catSaving}>
                {catSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Диалог создания / редактирования пользователя */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? `Редактирование пользователя #${editingUser.id}` : 'Новый пользователь'}
            </DialogTitle>
            <DialogDescription>
              Администратор может назначать роли client, support и admin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveUser} noValidate className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Имя *</Label>
              <Input id="u-name" value={uName} onChange={(e) => setUName(e.target.value)} />
              {userErrors.name?.[0] && (
                <p className="text-xs text-destructive">{userErrors.name[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email *</Label>
              <Input
                id="u-email"
                type="email"
                value={uEmail}
                onChange={(e) => setUEmail(e.target.value)}
              />
              {userErrors.email?.[0] && (
                <p className="text-xs text-destructive">{userErrors.email[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Роль в системе *</Label>
              <Select value={uRole} onValueChange={(v) => setURole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Клиент (client)</SelectItem>
                  <SelectItem value="support">Специалист поддержки (support)</SelectItem>
                  <SelectItem value="admin">Администратор (admin)</SelectItem>
                </SelectContent>
              </Select>
              {userErrors.role?.[0] && (
                <p className="text-xs text-destructive">{userErrors.role[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-pass">
                  {editingUser ? 'Новый пароль (необяз.)' : 'Пароль *'}
                </Label>
                <Input
                  id="u-pass"
                  type="password"
                  value={uPassword}
                  onChange={(e) => setUPassword(e.target.value)}
                />
                {userErrors.password?.[0] && (
                  <p className="text-xs text-destructive">{userErrors.password[0]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-pass-confirm">Подтверждение</Label>
                <Input
                  id="u-pass-confirm"
                  type="password"
                  value={uPasswordConfirm}
                  onChange={(e) => setUPasswordConfirm(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={userSaving}>
                {userSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

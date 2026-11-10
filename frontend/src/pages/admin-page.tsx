import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Edit,
  FolderKanban,
  Plus,
  ShieldAlert,
  Tags,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiError } from '@/lib/api'
import { priorityLabels, roleLabels, statusLabels } from '@/lib/labels'
import type {
  Category,
  Paginated,
  Role,
  Tag,
  TicketPriority,
  TicketStatistics,
  TicketStatus,
  User,
} from '@/lib/types'
import { useCurrentUser } from '@/lib/user-context'

type AdminTab = 'stats' | 'categories' | 'tags' | 'users'

export function AdminPage() {
  const { current, isAdmin } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<AdminTab>('stats')

  const [stats, setStats] = useState<TicketStatistics | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [businessError, setBusinessError] = useState<string | null>(null)

  // Диалог категории
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')
  const [catErrors, setCatErrors] = useState<Record<string, string[]>>({})
  const [catSaving, setCatSaving] = useState(false)

  // Создание тега
  const [newTagName, setNewTagName] = useState('')
  const [tagErrors, setTagErrors] = useState<Record<string, string[]>>({})
  const [tagSaving, setTagSaving] = useState(false)

  // Диалог создания пользователя
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userPasswordConfirm, setUserPasswordConfirm] = useState('')
  const [userRole, setUserRole] = useState<Role>('support')
  const [userErrors, setUserErrors] = useState<Record<string, string[]>>({})
  const [userSaving, setUserSaving] = useState(false)

  const loadAll = useCallback(async () => {
    try {
      const [statsRes, catRes, tagRes] = await Promise.all([
        api<{ data: TicketStatistics }>('/statistics/tickets'),
        api<{ data: Category[] }>('/categories'),
        api<{ data: Tag[] }>('/tags'),
      ])
      setStats(statsRes.data)
      setCategories(catRes.data)
      setTags(tagRes.data)
    } catch {
      // Ошибки отдельных секций обрабатываются локально
    }
  }, [])

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return
    try {
      const params = new URLSearchParams({ per_page: '50' })
      if (roleFilter !== 'all') params.set('role', roleFilter)
      const res = await api<Paginated<User>>(`/users?${params.toString()}`)
      setUsers(res.data)
    } catch {
      // ignore if not admin
    }
  }, [isAdmin, roleFilter])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  if (!isAdmin) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" />
            Доступ ограничен (403 Forbidden)
          </CardTitle>
          <CardDescription>
            Раздел администрирования доступен только пользователям с ролью «Администратор».
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // --- Категории ---
  function openCreateCategory() {
    setEditingCategory(null)
    setCatName('')
    setCatDesc('')
    setCatErrors({})
    setCatDialogOpen(true)
  }

  function openEditCategory(cat: Category) {
    setEditingCategory(cat)
    setCatName(cat.name)
    setCatDesc(cat.description ?? '')
    setCatErrors({})
    setCatDialogOpen(true)
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!catName.trim()) {
      setCatErrors({ name: ['Укажите название категории.'] })
      return
    }
    setCatSaving(true)
    setCatErrors({})
    setBusinessError(null)
    try {
      if (editingCategory) {
        await api(`/categories/${editingCategory.id}`, {
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
      loadAll()
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.errors) {
        setCatErrors(err.errors)
      }
      toast.error(err instanceof Error ? err.message : 'Ошибка сохранения категории')
    } finally {
      setCatSaving(false)
    }
  }

  async function deleteCategory(cat: Category) {
    if (!confirm(`Удалить категорию «${cat.name}»?`)) return
    setBusinessError(null)
    try {
      await api(`/categories/${cat.id}`, { method: 'DELETE' })
      toast.success('Категория удалена')
      loadAll()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setBusinessError(err.message)
      }
      toast.error(err instanceof Error ? err.message : 'Ошибка удаления категории')
    }
  }

  // --- Метки (теги) ---
  async function createTag(e: React.FormEvent) {
    e.preventDefault()
    if (!newTagName.trim()) {
      setTagErrors({ name: ['Введите название метки.'] })
      return
    }
    setTagSaving(true)
    setTagErrors({})
    try {
      await api('/tags', { method: 'POST', body: { name: newTagName.trim() } })
      setNewTagName('')
      toast.success('Метка добавлена')
      loadAll()
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.errors) {
        setTagErrors(err.errors)
      }
      toast.error(err instanceof Error ? err.message : 'Ошибка создания метки')
    } finally {
      setTagSaving(false)
    }
  }

  async function deleteTag(tag: Tag) {
    if (!confirm(`Удалить метку «#${tag.name}»?`)) return
    try {
      await api(`/tags/${tag.id}`, { method: 'DELETE' })
      toast.success('Метка удалена')
      loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка удаления метки')
    }
  }

  // --- Пользователи ---
  function openCreateUser() {
    setUserName('')
    setUserEmail('')
    setUserPassword('')
    setUserPasswordConfirm('')
    setUserRole('support')
    setUserErrors({})
    setUserDialogOpen(true)
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault()
    const clientErrs: Record<string, string[]> = {}
    if (!userName.trim()) clientErrs.name = ['Укажите имя пользователя.']
    if (!userEmail.trim()) clientErrs.email = ['Укажите email.']
    if (userPassword.length < 8) clientErrs.password = ['Пароль должен быть не менее 8 символов.']
    if (userPassword !== userPasswordConfirm) {
      clientErrs.password = ['Пароли не совпадают.']
    }
    if (Object.keys(clientErrs).length > 0) {
      setUserErrors(clientErrs)
      return
    }

    setUserSaving(true)
    setUserErrors({})
    try {
      await api('/users', {
        method: 'POST',
        body: {
          name: userName.trim(),
          email: userEmail.trim(),
          password: userPassword,
          password_confirmation: userPasswordConfirm,
          role: userRole,
        },
      })
      toast.success('Пользователь создан')
      setUserDialogOpen(false)
      loadUsers()
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.errors) {
        setUserErrors(err.errors)
      }
      toast.error(err instanceof Error ? err.message : 'Ошибка создания пользователя')
    } finally {
      setUserSaving(false)
    }
  }

  async function changeUserRole(user: User, role: Role) {
    try {
      await api(`/users/${user.id}`, {
        method: 'PUT',
        body: { role },
      })
      toast.success(`Роль пользователя ${user.name} изменена на «${roleLabels[role]}»`)
      loadUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка смены роли')
    }
  }

  async function deleteUser(user: User) {
    if (!confirm(`Удалить пользователя «${user.name}» (${user.email})?`)) return
    setBusinessError(null)
    try {
      await api(`/users/${user.id}`, { method: 'DELETE' })
      toast.success('Пользователь удалён')
      loadUsers()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setBusinessError(err.message)
      }
      toast.error(err instanceof Error ? err.message : 'Ошибка удаления пользователя')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Панель администратора</h1>
        <p className="text-sm text-muted-foreground">
          Управление категориями, метками, пользователями и статистика службы поддержки
        </p>
      </div>

      {businessError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/50 bg-destructive/10 p-3.5 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Ограничение целостности бизнес-логики (409 Conflict)</p>
            <p>{businessError}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setBusinessError(null)}>
            Закрыть
          </Button>
        </div>
      )}

      {/* Переключатель вкладок */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        <Button
          variant={activeTab === 'stats' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('stats')}
          className="gap-1.5"
        >
          <BarChart3 className="size-4" />
          Статистика
        </Button>
        <Button
          variant={activeTab === 'categories' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('categories')}
          className="gap-1.5"
        >
          <FolderKanban className="size-4" />
          Категории ({categories.length})
        </Button>
        <Button
          variant={activeTab === 'tags' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('tags')}
          className="gap-1.5"
        >
          <Tags className="size-4" />
          Метки ({tags.length})
        </Button>
        <Button
          variant={activeTab === 'users' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('users')}
          className="gap-1.5"
        >
          <Users className="size-4" />
          Пользователи ({users.length})
        </Button>
      </div>

      {/* Вкладка 1: Статистика */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {stats ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Всего заявок в системе</CardDescription>
                    <CardTitle className="text-3xl">{stats.total_tickets}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Ожидают назначения исполнителя</CardDescription>
                    <CardTitle className="text-3xl">{stats.unassigned_tickets}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Среднее время решения</CardDescription>
                    <CardTitle className="text-3xl">
                      {stats.avg_resolution_minutes !== null
                        ? `${Math.round(stats.avg_resolution_minutes)} мин.`
                        : '—'}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">По статусам</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {Object.entries(stats.by_status).map(([st, count]) => (
                      <div key={st} className="flex items-center justify-between">
                        <span>{statusLabels[st as TicketStatus] ?? st}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">По приоритетам</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {Object.entries(stats.by_priority).map(([pr, count]) => (
                      <div key={pr} className="flex items-center justify-between">
                        <span>{priorityLabels[pr as TicketPriority] ?? pr}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      Нагрузка специалистов (макс. 5)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {stats.workload.map((sp) => (
                      <div key={sp.id} className="flex items-center justify-between">
                        <span>{sp.name}</span>
                        <Badge variant={sp.active_tickets >= 5 ? 'destructive' : 'secondary'}>
                          {sp.active_tickets} / 5
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Загрузка статистики...</p>
          )}
        </div>
      )}

      {/* Вкладка 2: Категории */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Попытка удалить категорию, в которой есть заявки, вернёт ошибку бизнес-правила{' '}
              <code>409 Conflict</code>.
            </p>
            <Button size="sm" onClick={openCreateCategory}>
              <Plus className="size-4" />
              Добавить категорию
            </Button>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead className="w-28 text-center">Заявок</TableHead>
                  <TableHead className="w-28 text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{cat.id}
                    </TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cat.description || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{cat.tickets_count ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditCategory(cat)}
                          title="Редактировать"
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCategory(cat)}
                          title="Удалить"
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Вкладка 3: Метки */}
      {activeTab === 'tags' && (
        <div className="space-y-4">
          <form onSubmit={createTag} className="flex max-w-md items-start gap-2" noValidate>
            <div className="flex-1 space-y-1">
              <Input
                placeholder="Название новой метки (например: vpn)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                aria-invalid={Boolean(tagErrors.name)}
              />
              {tagErrors.name && (
                <p className="text-xs text-destructive">{tagErrors.name.join(' ')}</p>
              )}
            </div>
            <Button type="submit" disabled={tagSaving}>
              <Plus className="size-4" />
              Добавить
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm"
              >
                <span className="font-medium">#{tag.name}</span>
                {typeof tag.tickets_count === 'number' && (
                  <Badge variant="secondary" className="text-xs">
                    {tag.tickets_count}
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={() => deleteTag(tag)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Удалить метку"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Вкладка 4: Пользователи */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Все роли" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все роли</SelectItem>
                {(Object.keys(roleLabels) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" onClick={openCreateUser}>
              <Plus className="size-4" />
              Создать пользователя
            </Button>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Имя</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-48">Роль</TableHead>
                  <TableHead className="w-24 text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{u.id}
                    </TableCell>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(v) => changeUserRole(u, v as Role)}
                        disabled={u.id === current?.id}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(roleLabels) as Role[]).map((r) => (
                            <SelectItem key={r} value={r}>
                              {roleLabels[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id !== current?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteUser(u)}
                          title="Удалить пользователя"
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Диалог создания / редактирования категории */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? `Редактировать категорию #${editingCategory.id}` : 'Новая категория'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={saveCategory} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Название *</Label>
              <Input
                id="cat-name"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                aria-invalid={Boolean(catErrors.name)}
              />
              {catErrors.name && (
                <p className="text-xs text-destructive">{catErrors.name.join(' ')}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Описание</Label>
              <Textarea
                id="cat-desc"
                rows={3}
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
              />
              {catErrors.description && (
                <p className="text-xs text-destructive">{catErrors.description.join(' ')}</p>
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

      {/* Диалог создания пользователя */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новый пользователь</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveUser} className="space-y-3" noValidate>
            <div className="space-y-1">
              <Label htmlFor="u-name">Имя и фамилия *</Label>
              <Input
                id="u-name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                aria-invalid={Boolean(userErrors.name)}
              />
              {userErrors.name && (
                <p className="text-xs text-destructive">{userErrors.name.join(' ')}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="u-email">Email *</Label>
              <Input
                id="u-email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                aria-invalid={Boolean(userErrors.email)}
              />
              {userErrors.email && (
                <p className="text-xs text-destructive">{userErrors.email.join(' ')}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Роль *</Label>
              <Select value={userRole} onValueChange={(v) => setUserRole(v as Role)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(roleLabels) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="u-pass">Пароль *</Label>
                <Input
                  id="u-pass"
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  aria-invalid={Boolean(userErrors.password)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="u-pass2">Подтверждение *</Label>
                <Input
                  id="u-pass2"
                  type="password"
                  value={userPasswordConfirm}
                  onChange={(e) => setUserPasswordConfirm(e.target.value)}
                />
              </div>
            </div>
            {userErrors.password && (
              <p className="text-xs text-destructive">{userErrors.password.join(' ')}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={userSaving}>
                {userSaving ? 'Создание...' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminPage

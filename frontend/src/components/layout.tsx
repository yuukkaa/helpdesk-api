import { LifeBuoy } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Toaster } from '@/components/ui/sonner'
import { roleLabels } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/lib/user-context'

const links = [
  { to: '/', label: 'Заявки', end: true },
  { to: '/knowledge-base', label: 'База знаний', end: false },
]

export function Layout() {
  const { users, current, setCurrentId } = useCurrentUser()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <div className="flex items-center gap-2 font-semibold">
            <LifeBuoy className="size-5" />
            Help Desk
          </div>

          <nav className="flex gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent',
                    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Вы:</span>
            {current && (
              <Select value={String(current.id)} onValueChange={(value) => setCurrentId(Number(value))}>
                <SelectTrigger className="w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name} ({roleLabels[user.role]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </header>

      {/* key заставляет страницы загрузить данные заново при смене пользователя */}
      <main key={current?.id} className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <Toaster richColors />
    </div>
  )
}
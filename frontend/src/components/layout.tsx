import { LifeBuoy } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { roleLabels } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/lib/user-context'

export function Layout() {
  const { current, isAdmin, logout } = useCurrentUser()

  const links = [
    { to: '/', label: 'Заявки', end: true, visible: true },
    { to: '/workflow', label: 'Ключевой сценарий', end: false, visible: true },
    { to: '/knowledge-base', label: 'База знаний', end: false, visible: true },
    { to: '/admin', label: 'Администрирование', end: false, visible: isAdmin },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <div className="flex items-center gap-2 font-semibold">
            <LifeBuoy className="size-5 text-primary" />
            Help Desk
          </div>

          <nav className="flex flex-wrap gap-1">
            {links
              .filter((l) => l.visible)
              .map((link) => (
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

          <div className="ml-auto flex items-center gap-3">
            {current && (
              <span className="text-sm">
                {current.name}{' '}
                <span className="text-muted-foreground">({roleLabels[current.role]})</span>
              </span>
            )}
            <Button variant="outline" size="sm" onClick={logout}>
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <Toaster richColors />
    </div>
  )
}

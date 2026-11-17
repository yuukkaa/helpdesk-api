import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

const THEME_STORAGE_KEY = 'helpdesk_theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      title={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
      className="gap-1.5"
    >
      {theme === 'light' ? (
        <>
          <Moon className="size-4" />
          <span className="hidden sm:inline">Тёмная</span>
        </>
      ) : (
        <>
          <Sun className="size-4" />
          <span className="hidden sm:inline">Светлая</span>
        </>
      )}
    </Button>
  )
}

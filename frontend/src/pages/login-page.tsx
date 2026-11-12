import { useState, type FormEvent } from 'react'
import { LifeBuoy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/sonner'
import { ApiError, errorText } from '@/lib/api'
import { useCurrentUser } from '@/lib/user-context'

export default function LoginPage() {
  const { login, register } = useCurrentUser()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [serverMessage, setServerMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  function switchMode(nextMode: 'login' | 'register') {
    setMode(nextMode)
    setServerMessage(null)
    setFieldErrors({})
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setServerMessage(null)
    setFieldErrors({})

    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register({ name, email, password, password_confirmation: confirmation })
      }
      if (window.location.pathname === '/login' || window.location.pathname === '/register') {
        window.history.pushState({}, '', '/')
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setServerMessage(error.message)
        if (error.errors) {
          setFieldErrors(error.errors)
        }
      } else {
        setServerMessage(errorText(error))
      }
      toast.error(errorText(error))
    } finally {
      setLoading(false)
    }
  }

  function fillDemoAccount(demoEmail: string) {
    setMode('login')
    setEmail(demoEmail)
    setPassword('password')
    setServerMessage(null)
    setFieldErrors({})
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <LifeBuoy className="size-5" />
            Help Desk
          </div>
          <CardTitle>{mode === 'login' ? 'Вход в систему' : 'Регистрация клиента'}</CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Введите email и пароль учётной записи'
              : 'Создайте новую учётную запись с ролью «клиент»'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} noValidate className="space-y-4">
            {serverMessage && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {serverMessage}
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Имя *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Иван Иванов"
                />
                {fieldErrors.name?.[0] && (
                  <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@helpdesk.local"
              />
              {fieldErrors.email?.[0] && (
                <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Не менее 8 символов"
              />
              {fieldErrors.password?.[0] && (
                <p className="text-xs text-destructive">{fieldErrors.password[0]}</p>
              )}
            </div>

            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmation">Повторите пароль *</Label>
                <Input
                  id="confirmation"
                  type="password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Подождите...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </Button>

            {mode === 'login' && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Быстрый выбор тестовой роли (пароль: password):
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => fillDemoAccount('zhanna@client.local')}
                  >
                    Клиент
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => fillDemoAccount('aigerim@helpdesk.local')}
                  >
                    Специалист
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => fillDemoAccount('admin@helpdesk.local')}
                  >
                    Админ
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
      <Toaster richColors />
    </div>
  )
}

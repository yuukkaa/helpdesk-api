import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, clearToken, getToken, setToken } from './api'
import type { User } from './types'

interface RegisterData {
  name: string
  email: string
  password: string
  password_confirmation: string
}

interface AuthContextValue {
  current: User | null
  loading: boolean
  isStaff: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  current: null,
  loading: true,
  isStaff: false,
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => getToken() !== null)

  // При открытии приложения получаем имя и роль текущего пользователя через /api/user
  useEffect(() => {
    if (!getToken()) return
    api<{ data: User } | User>('/user')
      .then((response) => {
        const user = 'data' in response ? response.data : response
        setCurrent(user)
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  // При ответе 401 api.ts очищает токен и отправляет событие auth:expired
  useEffect(() => {
    const onExpired = () => setCurrent(null)
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

  async function login(email: string, password: string) {
    const response = await api<{ data: User; token: string }>('/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(response.token)
    setCurrent(response.data)
  }

  async function register(data: RegisterData) {
    const response = await api<{ data: User; token: string }>('/register', {
      method: 'POST',
      body: data,
    })
    setToken(response.token)
    setCurrent(response.data)
  }

  async function logout() {
    try {
      await api('/logout', { method: 'POST' })
    } finally {
      clearToken()
      setCurrent(null)
    }
  }

  const isStaff = current?.role === 'support' || current?.role === 'admin'
  const isAdmin = current?.role === 'admin'

  return (
    <AuthContext.Provider value={{ current, loading, isStaff, isAdmin, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useCurrentUser = () => useContext(AuthContext)

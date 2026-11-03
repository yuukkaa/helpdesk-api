import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { Paginated, User } from './types'

interface UserContextValue {
  users: User[]
  current: User | null
  setCurrentId: (id: number) => void
  isStaff: boolean
}

const fallbackUsers: User[] = [
  { id: 1, name: 'Сотрудник поддержки', email: 'support@test.local', role: 'support' },
  { id: 2, name: 'Клиент', email: 'client@test.local', role: 'client' },
]

const UserContext = createContext<UserContextValue>({
  users: fallbackUsers,
  current: fallbackUsers[0],
  setCurrentId: () => {},
  isStaff: true,
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(fallbackUsers)
  const [currentId, setId] = useState<number | null>(() => {
    const saved = localStorage.getItem('helpdesk_user_id')
    return saved ? Number(saved) : 1
  })

  useEffect(() => {
    api<Paginated<User>>('/users', { query: { per_page: 100 } })
      .then((response) => {
        if (response?.data && response.data.length > 0) {
          setUsers(response.data)
        }
      })
      .catch(() => {
        // Оставляем fallback-пользователей, если бэкенд недоступен
      })
  }, [])

  const current = users.find((user) => user.id === currentId) ?? users[0] ?? null

  const setCurrentId = (id: number) => {
    localStorage.setItem('helpdesk_user_id', String(id))
    setId(id)
  }

  const isStaff = current?.role === 'support' || current?.role === 'admin'

  return (
    <UserContext.Provider value={{ users, current, setCurrentId, isStaff }}>
      {children}
    </UserContext.Provider>
  )
}

export const useCurrentUser = () => useContext(UserContext)
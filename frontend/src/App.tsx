import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { UserProvider, useCurrentUser } from '@/lib/user-context'
import KnowledgeBasePage from '@/pages/knowledge-base-page'
import LoginPage from '@/pages/login-page'
import TicketPage from '@/pages/ticket-page'
import TicketsPage from '@/pages/tickets-page'

function AppRoutes() {
  const { current, loading } = useCurrentUser()

  if (loading) return <p className="p-6 text-muted-foreground">Загрузка...</p>
  if (!current) return <LoginPage />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketPage />} />
        <Route path="knowledge-base" element={<KnowledgeBasePage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </UserProvider>
  )
}
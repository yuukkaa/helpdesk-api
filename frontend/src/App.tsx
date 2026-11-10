import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { UserProvider, useCurrentUser } from '@/lib/user-context'
import AdminPage from '@/pages/admin-page'
import KnowledgeBasePage from '@/pages/knowledge-base-page'
import LoginPage from '@/pages/login-page'
import TicketPage from '@/pages/ticket-page'
import TicketsPage from '@/pages/tickets-page'
import WorkflowPage from '@/pages/workflow-page'

function AppRoutes() {
  const { current, loading } = useCurrentUser()

  if (loading) return <p className="p-6 text-muted-foreground">Загрузка...</p>
  if (!current) return <LoginPage />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketPage />} />
        <Route path="workflow" element={<WorkflowPage />} />
        <Route path="knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="admin" element={<AdminPage />} />
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

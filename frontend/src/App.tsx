import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { UserProvider } from '@/lib/user-context'
import KnowledgeBasePage from '@/pages/knowledge-base-page'
import TicketPage from '@/pages/ticket-page'
import TicketsPage from '@/pages/tickets-page'

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<TicketsPage />} />
            <Route path="tickets/:id" element={<TicketPage />} />
            <Route path="knowledge-base" element={<KnowledgeBasePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  )
}
export type Role = 'client' | 'support' | 'admin'
export type TicketStatus = 'new' | 'in_progress' | 'waiting_for_client' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface User {
  id: number
  name: string
  email: string
  role: Role
}

export interface Category {
  id: number
  name: string
  description: string | null
  tickets_count?: number
}

export interface Tag {
  id: number
  name: string
}

export interface Attachment {
  id: number
  original_name: string
  path?: string
  url?: string | null
  mime_type: string
  size: number
}

export interface Message {
  id: number
  ticket_id: number
  body: string
  is_internal: boolean
  created_at: string
  author?: User
  attachments?: Attachment[]
}

export interface Ticket {
  id: number
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category_id?: number
  messages_count?: number
  resolved_at: string | null
  created_at: string
  updated_at: string
  author?: User
  assignee?: User | null
  category?: Category
  messages?: Message[]
  attachments?: Attachment[]
  tags?: Tag[]
}

export interface TicketStatistics {
  total_tickets: number
  by_status: Record<string, number>
  by_priority: Record<string, number>
  avg_resolution_minutes: number | null
  by_category: { id: number; name: string; tickets_count: number }[]
  workload: {
    id: number
    name: string
    email: string
    role: Role
    active_tickets: number
    resolved_tickets: number
  }[]
}

export interface Article {
  id: number
  title: string
  content: string
  is_published: boolean
  created_at: string
  author?: User
  category?: Category | null
}

export interface Paginated<T> {
  data: T[]
  meta: { current_page: number; last_page: number; total: number }
}

export interface AiSuggestion {
  category_id: number | null
  category: string | null
  priority: TicketPriority
  reason: string
}

export interface AiDraft {
  draft: string
  sources: { id: number; title: string }[]
}
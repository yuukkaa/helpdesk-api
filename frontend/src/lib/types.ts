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
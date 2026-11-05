import type { Role, TicketPriority, TicketStatus } from './types'

export const statusLabels: Record<TicketStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  waiting_for_client: 'Ждёт клиента',
  resolved: 'Решена',
  closed: 'Закрыта',
}

export const priorityLabels: Record<TicketPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочный',
}

export const roleLabels: Record<Role, string> = {
  client: 'клиент',
  support: 'специалист',
  admin: 'администратор',
}

type Variant = 'default' | 'secondary' | 'outline' | 'destructive'

export const statusVariant: Record<TicketStatus, Variant> = {
  new: 'default',
  in_progress: 'secondary',
  waiting_for_client: 'outline',
  resolved: 'secondary',
  closed: 'outline',
}

export const priorityVariant: Record<TicketPriority, Variant> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive',
}

/** Допустимые переходы статуса (как в TicketService на сервере). */
export const transitions: Record<TicketStatus, TicketStatus[]> = {
  new: ['in_progress'],
  in_progress: ['waiting_for_client', 'resolved'],
  waiting_for_client: ['in_progress'],
  resolved: ['in_progress', 'closed'],
  closed: [],
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
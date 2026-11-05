<?php

namespace App\Enums;

enum TicketStatus: string
{
    case New = 'new';
    case InProgress = 'in_progress';
    case WaitingForClient = 'waiting_for_client';
    case Resolved = 'resolved';
    case Closed = 'closed';

    /** @return list<self> */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::New => [self::InProgress],
            self::InProgress => [self::WaitingForClient, self::Resolved],
            self::WaitingForClient => [self::InProgress],
            self::Resolved => [self::InProgress, self::Closed],
            self::Closed => [],
        };
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, $this->allowedTransitions(), true);
    }

    public function label(): string
    {
        return match ($this) {
            self::New => 'Новая',
            self::InProgress => 'В работе',
            self::WaitingForClient => 'Ждёт клиента',
            self::Resolved => 'Решена',
            self::Closed => 'Закрыта',
        };
    }
}
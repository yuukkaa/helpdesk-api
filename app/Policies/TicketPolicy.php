<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;

class TicketPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // клиент увидит в списке только свои заявки
    }

    public function view(User $user, Ticket $ticket): bool
    {
        return $user->isStaff() || $ticket->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Ticket $ticket): bool
    {
        return $user->isStaff();
    }

    public function delete(User $user, Ticket $ticket): bool
    {
        return $user->isAdmin();
    }

    /** Администратор назначает любого, специалист только себя («взять в работу»). */
    public function assign(User $user, Ticket $ticket, int $assigneeId): bool
    {
        return $user->isAdmin() || ($user->isStaff() && $assigneeId === $user->id);
    }

    /** Статус меняет администратор или ответственный специалист. */
    public function changeStatus(User $user, Ticket $ticket): bool
    {
        return $user->isAdmin() || ($user->isStaff() && $ticket->assignee_id === $user->id);
    }

    /** Писать в заявку может её автор и специалисты. */
    public function addMessage(User $user, Ticket $ticket): bool
    {
        return $user->isStaff() || $ticket->user_id === $user->id;
    }
}
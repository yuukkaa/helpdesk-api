<?php

namespace App\Services;

use App\Enums\TicketStatus;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Ticket;
use App\Models\User;

class StatisticsService
{
    public function tickets(): array
    {
        $active = [TicketStatus::InProgress->value, TicketStatus::WaitingForClient->value, 'waiting_client'];

        $resolvedTickets = Ticket::query()
            ->whereNotNull('resolved_at')
            ->get(['created_at', 'resolved_at']);

        $avgMinutes = 0;
        if ($resolvedTickets->isNotEmpty()) {
            $totalMinutes = $resolvedTickets->sum(
                fn (Ticket $t) => max(0, $t->created_at?->diffInMinutes($t->resolved_at) ?? 0)
            );
            $avgMinutes = (int) round($totalMinutes / $resolvedTickets->count());
        }

        return [
            'total_tickets' => Ticket::count(),
            'unassigned_tickets' => Ticket::whereNull('assignee_id')->count(),

            'by_status' => Ticket::query()
                ->selectRaw('status, COUNT(*) AS total')
                ->groupBy('status')
                ->pluck('total', 'status'),

            'by_priority' => Ticket::query()
                ->selectRaw('priority, COUNT(*) AS total')
                ->groupBy('priority')
                ->pluck('total', 'priority'),

            'avg_resolution_minutes' => $avgMinutes,

            'by_category' => Category::query()
                ->withCount('tickets')
                ->orderByDesc('tickets_count')
                ->get()
                ->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'tickets' => $c->tickets_count,
                    'tickets_count' => $c->tickets_count,
                ]),

            'workload' => User::query()
                ->whereIn('role', [UserRole::Support->value, UserRole::Admin->value])
                ->withCount(['assignedTickets as active_tickets' => fn ($q) => $q->whereIn('status', $active)])
                ->orderByDesc('active_tickets')
                ->get()
                ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'active_tickets' => $u->active_tickets]),
        ];
    }
}

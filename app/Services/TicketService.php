<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Models\Category;
use App\Models\Message;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class TicketService
{
    public const MAX_ACTIVE_TICKETS_PER_AGENT = 5;

    public function getPaginatedTickets(array $params): LengthAwarePaginator
    {
        $perPage = (int) ($params['per_page'] ?? 10);

        return Ticket::query()
<<<<<<< HEAD
            ->with(self::LIST_RELATIONS)
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['priority'] ?? null, fn ($q, $v) => $q->where('priority', $v))
            ->when($filters['category_id'] ?? null, fn ($q, $v) => $q->where('category_id', $v))
            ->when($filters['assignee_id'] ?? null, fn ($q, $v) => $q->where('assignee_id', $v))
            ->when($filters['user_id'] ?? null, fn ($q, $v) => $q->where('user_id', $v))
            ->when($filters['search'] ?? null, function ($q, $v) {
                $q->where(function ($q) use ($v) {
                    $q->where('subject', 'like', "%{$v}%")
                        ->orWhere('description', 'like', "%{$v}%");
                });
=======
            ->with(['category', 'author', 'assignee', 'tags'])
            ->withCount('messages')
            ->when($params['owner_only_user_id'] ?? null, function ($q, $userId) {
                $columns = Schema::getColumnListing('tickets');
                $col = in_array('user_id', $columns, true) ? 'user_id' : (in_array('author_id', $columns, true) ? 'author_id' : 'client_id');
                $q->where($col, $userId);
>>>>>>> a77fea0 (Бизнес-логика, фильтрация и пагинация (КП9))
            })
            ->filter($params)
            ->search($params['search'] ?? null)
            ->sort($params['sort'] ?? 'id', $params['order'] ?? 'desc')
            ->paginate($perPage)
            ->withQueryString();
    }

    public function createTicket(array $data): Ticket
    {
        return DB::transaction(function () use ($data) {
            $columns = Schema::getColumnListing('tickets');
            $authorId = $data['author_id'] ?? $data['client_id'] ?? $data['user_id'] ?? User::first()?->id ?? 1;

            $payload = [
                'subject' => $data['subject'] ?? $data['title'] ?? 'Обращение',
                'title' => $data['subject'] ?? $data['title'] ?? 'Обращение',
                'description' => $data['description'] ?? '',
                'category_id' => $data['category_id'],
                'priority' => $data['priority'] ?? 'medium',
                'status' => 'new',
                'user_id' => $authorId,
                'author_id' => $authorId,
                'client_id' => $authorId,
            ];

            if (in_array('slug', $columns, true)) {
                $payload['slug'] = 'ticket-' . Str::lower(Str::random(8));
            }

            $filtered = array_intersect_key($payload, array_flip($columns));
            $ticket = Ticket::create($filtered);

            if (!empty($data['tags']) && is_array($data['tags'])) {
                try {
                    $ticket->tags()->sync($data['tags']);
                } catch (\Throwable) {}
            }

            Log::info('Ticket created', [
                'ticket_id' => $ticket->id,
                'subject' => $ticket->subject,
                'priority' => $ticket->priority,
                'author_id' => $authorId,
            ]);

            return $ticket->load(['category', 'author', 'assignee', 'tags']);
        });
    }

    public function assignAgent(int $ticketId, int $agentId): Ticket
    {
        return DB::transaction(function () use ($ticketId, $agentId) {
            $ticket = Ticket::query()->lockForUpdate()->findOrFail($ticketId);
            $agent = User::query()->lockForUpdate()->findOrFail($agentId);

            $currentStatus = is_string($ticket->status) ? $ticket->status : $ticket->status->value;
            if ($currentStatus === 'closed') {
                Log::warning('Attempt to assign agent to closed ticket', ['ticket_id' => $ticketId, 'agent_id' => $agentId]);
                throw new BusinessException('Нельзя назначить исполнителя для уже закрытой заявки.', 409);
            }

            $role = is_string($agent->role) ? $agent->role : ($agent->role->value ?? 'client');
            if (!in_array($role, ['support', 'admin'], true)) {
                Log::warning('Invalid assignee role', ['ticket_id' => $ticketId, 'agent_id' => $agentId, 'role' => $role]);
                throw new BusinessException('Назначить исполнителем можно только сотрудника поддержки (support) или администратора (admin).', 409);
            }

            $activeCount = Ticket::query()
                ->where('assignee_id', $agent->id)
                ->whereIn('status', ['in_progress', 'waiting_client'])
                ->where('id', '!=', $ticket->id)
                ->count();

            if ($activeCount >= self::MAX_ACTIVE_TICKETS_PER_AGENT) {
                Log::warning('Agent workload limit exceeded', ['agent_id' => $agent->id, 'active_count' => $activeCount]);
                throw new BusinessException(
                    "Превышен лимит нагрузки: у специалиста {$agent->name} уже в работе {$activeCount} активных заявок (максимум " . self::MAX_ACTIVE_TICKETS_PER_AGENT . ").",
                    409
                );
            }

            $ticket->assignee_id = $agent->id;
            if ($currentStatus === 'new') {
                $ticket->status = 'in_progress';
            }
            $ticket->save();

            $msgCols = Schema::getColumnListing('messages');
            $msgData = [
                'ticket_id' => $ticket->id,
                'author_id' => $agent->id,
                'user_id' => $agent->id,
                'body' => "Заявка назначена на специалиста: {$agent->name}.",
                'content' => "Заявка назначена на специалиста: {$agent->name}.",
                'is_internal' => true,
            ];
            Message::create(array_intersect_key($msgData, array_flip($msgCols)));

            Log::info('Ticket assigned to agent', [
                'ticket_id' => $ticket->id,
                'agent_id' => $agent->id,
                'agent_name' => $agent->name,
            ]);

            return $ticket->load(['category', 'author', 'assignee', 'tags', 'messages.author']);
        });
    }

    public function changeStatus(int $ticketId, string $newStatusValue): Ticket
    {
        return DB::transaction(function () use ($ticketId, $newStatusValue) {
            $ticket = Ticket::query()->lockForUpdate()->findOrFail($ticketId);

            $currentStatus = is_string($ticket->status) ? $ticket->status : $ticket->status->value;

            if ($currentStatus === 'closed') {
                throw new BusinessException('Недопустимый переход статуса: нельзя перевести закрытую заявку.', 409);
            }

            if ($currentStatus === 'resolved' && $newStatusValue === 'waiting_client') {
                throw new BusinessException('Недопустимый переход статуса: нельзя перевести заявку из статуса «Решена» в «Ждёт клиента».', 409);
            }

            if ($newStatusValue === 'resolved' && empty($ticket->assignee_id)) {
                throw new BusinessException('Нельзя решить заявку без назначенного ответственного специалиста.', 409);
            }

            $ticket->status = $newStatusValue;
            if ($newStatusValue === 'resolved') {
                $ticket->resolved_at = now();
            }
            $ticket->save();

            Log::info('Ticket status changed', [
                'ticket_id' => $ticket->id,
                'old_status' => $currentStatus,
                'new_status' => $newStatusValue,
            ]);

            return $ticket->load(['category', 'author', 'assignee', 'tags', 'messages.author']);
        });
    }

    public function getStatistics(): array
    {
        $byStatus = Ticket::query()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $byPriority = Ticket::query()
            ->selectRaw('priority, COUNT(*) as count')
            ->groupBy('priority')
            ->pluck('count', 'priority');

        $byCategory = Category::query()
            ->withCount('tickets')
            ->orderByDesc('tickets_count')
            ->get(['id', 'name']);

        return [
            'total_tickets' => Ticket::count(),
            'unassigned_tickets' => Ticket::whereNull('assignee_id')->count(),
            'by_status' => $byStatus,
            'by_priority' => $byPriority,
            'by_category' => $byCategory,
        ];
    }

    /**
     * Пункт 5 (дополнительно): Экспорт списка заявок в CSV.
     */
    public function exportToCsv(): string
    {
        $tickets = Ticket::with(['category', 'author', 'assignee'])->latest('id')->get();

        $lines = [];
        $lines[] = implode(';', ['ID', 'Тема', 'Категория', 'Статус', 'Приоритет', 'Автор', 'Ответственный', 'Создана']);

        foreach ($tickets as $t) {
            $lines[] = implode(';', [
                $t->id,
                str_replace(';', ',', (string) $t->subject),
                $t->category?->name ?? '-',
                $t->status,
                $t->priority,
                $t->author?->name ?? '-',
                $t->assignee?->name ?? 'Не назначен',
                $t->created_at?->format('Y-m-d H:i') ?? '-',
            ]);
        }

        Log::info('Tickets exported to CSV', ['count' => $tickets->count()]);

        return "\xEF\xBB\xBF" . implode("\n", $lines);
    }
}
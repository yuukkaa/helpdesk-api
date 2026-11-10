<?php

namespace App\Services;

use App\Enums\TicketStatus;
use App\Enums\UserRole;
use App\Exceptions\BusinessException;
use App\Mail\TicketStatusChangedMail;
use App\Models\Category;
use App\Models\Message;
use App\Models\Tag;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TicketService
{
    public const MAX_ACTIVE_TICKETS_PER_AGENT = 5;

    /**
     * Список заявок с фильтрацией, поиском, сортировкой и пагинацией.
     */
    public function getPaginatedTickets(array $params, ?User $viewer = null): LengthAwarePaginator
    {
        $perPage = min(max((int) ($params['per_page'] ?? 10), 1), 100);

        if ($viewer && $viewer->role === UserRole::Client) {
            $params['user_id'] = $viewer->id;
        }

        return Ticket::query()
            ->with(['category', 'author', 'assignee', 'tags'])
            ->withCount('messages')
            ->filter($params)
            ->search($params['search'] ?? null)
            ->sort($params['sort'] ?? 'id', $params['order'] ?? 'desc')
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * Создание новой заявки.
     */
    public function createTicket(array $data, ?User $author = null): Ticket
    {
        return DB::transaction(function () use ($data, $author) {
            $columns = Schema::getColumnListing('tickets');
            $authorId = $author?->id
                ?? $data['user_id']
                ?? $data['author_id']
                ?? $data['client_id']
                ?? User::first()?->id
                ?? 1;

            $payload = [
                'subject' => $data['subject'] ?? $data['title'] ?? 'Обращение',
                'title' => $data['subject'] ?? $data['title'] ?? 'Обращение',
                'description' => $data['description'] ?? '',
                'category_id' => $data['category_id'],
                'priority' => $data['priority'] ?? 'medium',
                'status' => TicketStatus::New->value,
                'user_id' => $authorId,
                'author_id' => $authorId,
                'client_id' => $authorId,
            ];

            if (in_array('slug', $columns, true)) {
                $payload['slug'] = 'ticket-' . Str::lower(Str::random(8));
            }

            $filtered = array_intersect_key($payload, array_flip($columns));
            $ticket = Ticket::create($filtered);

            if (! empty($data['tags']) && is_array($data['tags'])) {
                $ticket->tags()->sync($data['tags']);
            }

            if (! empty($data['attachments']) && is_array($data['attachments'])) {
                $this->storeAttachments($ticket, $data['attachments']);
            }

            Log::info('Создана новая заявка', [
                'ticket_id' => $ticket->id,
                'subject' => $ticket->subject,
                'priority' => $ticket->priority,
                'category_id' => $ticket->category_id,
                'user_id' => $authorId,
            ]);

            return $ticket->load(['category', 'author', 'assignee', 'tags', 'attachments']);
        });
    }

    /**
     * Обновление полей заявки (тема, описание, категория, приоритет, теги).
     */
    public function updateTicket(Ticket $ticket, array $data): Ticket
    {
        return DB::transaction(function () use ($ticket, $data) {
            $columns = Schema::getColumnListing('tickets');
            $updatable = array_intersect_key(
                array_diff_key($data, array_flip(['tags', 'attachments'])),
                array_flip($columns)
            );

            $ticket->update($updatable);

            if (array_key_exists('tags', $data) && is_array($data['tags'])) {
                $ticket->tags()->sync($data['tags']);
            }

            Log::info('Обновлена заявка', [
                'ticket_id' => $ticket->id,
                'updated_fields' => array_keys($updatable),
            ]);

            return $ticket->load(['category', 'author', 'assignee', 'tags', 'attachments', 'messages.author']);
        });
    }

    /**
     * Назначение ответственного специалиста.
     */
    public function assignAgent(int $ticketId, int $agentId): Ticket
    {
        return DB::transaction(function () use ($ticketId, $agentId) {
            $ticket = Ticket::query()->lockForUpdate()->findOrFail($ticketId);
            $agent = User::query()->lockForUpdate()->findOrFail($agentId);

            $currentStatus = $ticket->statusValue();
            if (in_array($currentStatus, [TicketStatus::Resolved->value, TicketStatus::Closed->value], true)) {
                throw new BusinessException(
                    'Нельзя назначить ответственного для решённой или закрытой заявки.',
                    409
                );
            }

            $role = is_string($agent->role) ? $agent->role : ($agent->role->value ?? 'client');
            if (! in_array($role, ['support', 'admin'], true)) {
                throw new BusinessException(
                    'Назначить исполнителем можно только сотрудника поддержки (support) или администратора (admin).',
                    409
                );
            }

            $activeCount = Ticket::query()
                ->where('assignee_id', $agent->id)
                ->whereIn('status', ['in_progress', 'waiting_for_client', 'waiting_client'])
                ->where('id', '!=', $ticket->id)
                ->count();

            if ($activeCount >= self::MAX_ACTIVE_TICKETS_PER_AGENT) {
                throw new BusinessException(
                    "Превышен лимит нагрузки: у специалиста {$agent->name} уже в работе {$activeCount} активных заявок (максимум " . self::MAX_ACTIVE_TICKETS_PER_AGENT . ").",
                    409
                );
            }

            $ticket->assignee_id = $agent->id;
            if ($currentStatus === TicketStatus::New->value) {
                $ticket->status = TicketStatus::InProgress->value;
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

            Log::info('Назначен ответственный специалист по заявке', [
                'ticket_id' => $ticket->id,
                'assignee_id' => $agent->id,
                'assignee_name' => $agent->name,
                'status' => $ticket->status,
            ]);

            return $ticket->load(['category', 'author', 'assignee', 'tags', 'messages.author', 'attachments']);
        });
    }

    /**
     * Смена статуса заявки с проверкой допустимого перехода.
     */
    public function changeStatus(int $ticketId, string $newStatusValue): Ticket
    {
        return DB::transaction(function () use ($ticketId, $newStatusValue) {
            $ticket = Ticket::query()->lockForUpdate()->findOrFail($ticketId);

            if ($newStatusValue === 'waiting_client') {
                $newStatusValue = TicketStatus::WaitingForClient->value;
            }

            $currentStatusValue = $ticket->statusValue();
            $currentEnum = TicketStatus::tryFrom($currentStatusValue);
            $newEnum = TicketStatus::tryFrom($newStatusValue);

            if (! $newEnum) {
                throw new BusinessException("Недопустимый статус: {$newStatusValue}.", 422);
            }

            if ($currentStatusValue === TicketStatus::Closed->value) {
                throw new BusinessException(
                    'Недопустимый переход статуса: нельзя перевести закрытую заявку.',
                    409
                );
            }

            if ($currentEnum && ! $currentEnum->canTransitionTo($newEnum)) {
                throw new BusinessException(
                    "Переход из статуса «{$currentEnum->value}» в «{$newEnum->value}» недопустим.",
                    409
                );
            }

            if (in_array($newEnum, [TicketStatus::InProgress, TicketStatus::Resolved], true) && empty($ticket->assignee_id)) {
                throw new BusinessException(
                    'Сначала назначьте ответственного специалиста.',
                    409
                );
            }

            $ticket->status = $newEnum->value;
            if ($newEnum === TicketStatus::Resolved) {
                $ticket->resolved_at = now();
            } elseif ($newEnum !== TicketStatus::Closed) {
                $ticket->resolved_at = null;
            }
            $ticket->save();

            Log::info('Изменён статус заявки', [
                'ticket_id' => $ticket->id,
                'old_status' => $currentStatusValue,
                'new_status' => $newEnum->value,
                'assignee_id' => $ticket->assignee_id,
            ]);

            // Отправка уведомления автору заявки по почте (драйвер log)
            $ticket->load(['author']);
            if ($ticket->author?->email) {
                try {
                    Mail::to($ticket->author->email)->send(
                        new TicketStatusChangedMail($ticket, $currentStatusValue, $newEnum->value)
                    );
                } catch (\Throwable $e) {
                    Log::warning('Не удалось отправить email-уведомление о смене статуса', [
                        'ticket_id' => $ticket->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            return $ticket->load(['category', 'author', 'assignee', 'tags', 'messages.author', 'attachments']);
        });
    }

    /**
     * Удаление заявки вместе с файлами вложений.
     */
    public function deleteTicket(Ticket $ticket): void
    {
        $id = $ticket->id;
        $paths = $ticket->attachments()->pluck('path')->all();

        $ticket->delete();

        if (! empty($paths)) {
            Storage::disk('public')->delete($paths);
        }

        Log::info('Заявка удалена', ['ticket_id' => $id]);
    }

    /**
     * Добавление меток к заявке.
     */
    public function attachTags(Ticket $ticket, array $tagIds): Ticket
    {
        $ticket->tags()->syncWithoutDetaching($tagIds);

        Log::info('К заявке прикреплены метки', [
            'ticket_id' => $ticket->id,
            'tag_ids' => $tagIds,
        ]);

        return $ticket->load(['category', 'author', 'assignee', 'tags', 'messages.author', 'attachments']);
    }

    /**
     * Синхронизация всех меток заявки.
     */
    public function syncTags(Ticket $ticket, array $tagIds): Ticket
    {
        $ticket->tags()->sync($tagIds);

        Log::info('Синхронизированы метки заявки', [
            'ticket_id' => $ticket->id,
            'tag_ids' => $tagIds,
        ]);

        return $ticket->load(['category', 'author', 'assignee', 'tags', 'messages.author', 'attachments']);
    }

    /**
     * Снятие метки с заявки.
     */
    public function detachTag(Ticket $ticket, Tag $tag): Ticket
    {
        if (! $ticket->tags()->whereKey($tag->id)->exists()) {
            throw new BusinessException('У заявки нет такой метки.', 409);
        }

        $ticket->tags()->detach($tag->id);

        Log::info('С заявки снята метка', [
            'ticket_id' => $ticket->id,
            'tag_id' => $tag->id,
        ]);

        return $ticket->load(['category', 'author', 'assignee', 'tags', 'messages.author', 'attachments']);
    }

    /**
     * Экспорт заявок в формат CSV (п. 5 задания).
     */
    public function exportToCsv(array $filters = []): string
    {
        $tickets = Ticket::query()
            ->with(['category', 'author', 'assignee'])
            ->filter($filters)
            ->orderByDesc('id')
            ->get();

        $handle = fopen('php://temp', 'r+');
        // UTF-8 BOM для корректного открытия в Excel
        fwrite($handle, "\xEF\xBB\xBF");

        fputcsv($handle, [
            'ID',
            'Тема',
            'Статус',
            'Приоритет',
            'Категория',
            'Автор',
            'Исполнитель',
            'Дата создания',
            'Дата решения',
        ], ';');

        foreach ($tickets as $ticket) {
            fputcsv($handle, [
                $ticket->id,
                $ticket->subject,
                $ticket->statusValue(),
                $ticket->priorityValue(),
                $ticket->category?->name ?? '—',
                $ticket->author?->name ?? '—',
                $ticket->assignee?->name ?? 'Не назначен',
                $ticket->created_at?->format('Y-m-d H:i:s'),
                $ticket->resolved_at?->format('Y-m-d H:i:s') ?? '—',
            ], ';');
        }

        rewind($handle);
        $csv = (string) stream_get_contents($handle);
        fclose($handle);

        Log::info('Выполнен экспорт заявок в CSV', ['count' => $tickets->count()]);

        return $csv;
    }

    /**
     * Сводная статистика (КП9).
     */
    public function getStatistics(): array
    {
        return app(StatisticsService::class)->tickets();
    }

    /**
     * Сохранение файлов вложений через Storage (диск public).
     *
     * @param  list<UploadedFile>  $files
     */
    private function storeAttachments(Ticket $ticket, array $files): void
    {
        foreach ($files as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $ticket->attachments()->create([
                'original_name' => $file->getClientOriginalName(),
                'path' => $file->store('attachments', 'public'),
                'mime_type' => $file->getClientMimeType(),
                'size' => $file->getSize(),
            ]);
        }
    }
}

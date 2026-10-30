<?php

namespace App\Services;

use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Models\Ticket;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use App\Models\Tag;

class TicketService
{
    private const LIST_RELATIONS = ['author', 'assignee', 'category', 'tags'];

    private const FULL_RELATIONS = [
        'author', 'assignee', 'category', 'tags', 'attachments', 'messages.author',
    ];

    /** Допустимые переходы статусов. */
    private const TRANSITIONS = [
        'new' => ['in_progress'],
        'in_progress' => ['waiting_for_client', 'resolved'],
        'waiting_for_client' => ['in_progress'],
        'resolved' => ['in_progress', 'closed'],
        'closed' => [],
    ];

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = min(max((int) ($filters['per_page'] ?? 15), 1), 100);

        return Ticket::query()
            ->with(self::LIST_RELATIONS)
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['priority'] ?? null, fn ($q, $v) => $q->where('priority', $v))
            ->when($filters['category_id'] ?? null, fn ($q, $v) => $q->where('category_id', $v))
            ->when($filters['assignee_id'] ?? null, fn ($q, $v) => $q->where('assignee_id', $v))
            ->when($filters['search'] ?? null, function ($q, $v) {
                $q->where(function ($q) use ($v) {
                    $q->where('subject', 'like', "%{$v}%")
                        ->orWhere('description', 'like', "%{$v}%");
                });
            })
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function loadFull(Ticket $ticket): Ticket
    {
        return $ticket->load(self::FULL_RELATIONS);
    }

    public function create(array $data): Ticket
    {
        return DB::transaction(function () use ($data) {
            $attributes = Arr::except($data, ['tags', 'attachments']) + [
                'status' => TicketStatus::New,
                'priority' => TicketPriority::Medium,
            ];

            $ticket = Ticket::create($attributes);

            if (! empty($data['tags'])) {
                $ticket->tags()->sync($data['tags']);
            }

            $this->storeAttachments($ticket, $data['attachments'] ?? []);

            return $this->loadFull($ticket);
        });
    }

    public function update(Ticket $ticket, array $data): Ticket
    {
        return DB::transaction(function () use ($ticket, $data) {
            $ticket->update(Arr::except($data, ['tags']));

            if (array_key_exists('tags', $data)) {
                $ticket->tags()->sync($data['tags']);
            }

            return $this->loadFull($ticket);
        });
    }

    public function delete(Ticket $ticket): void
    {
        $paths = $ticket->attachments()->pluck('path')->all();

        $ticket->delete();

        Storage::delete($paths);
    }

    public function assign(Ticket $ticket, int $assigneeId): Ticket
    {
        if (in_array($ticket->status, [TicketStatus::Resolved, TicketStatus::Closed], true)) {
            throw new ConflictHttpException(
                'Нельзя назначить ответственного для решённой или закрытой заявки.'
            );
        }

        $ticket->assignee_id = $assigneeId;

        if ($ticket->status === TicketStatus::New) {
            $ticket->status = TicketStatus::InProgress;
        }

        $ticket->save();

        return $this->loadFull($ticket);
    }

    public function changeStatus(Ticket $ticket, TicketStatus $status): Ticket
    {
        $allowed = self::TRANSITIONS[$ticket->status->value];

        if (! in_array($status->value, $allowed, true)) {
            throw new ConflictHttpException(
                "Переход из статуса «{$ticket->status->value}» в «{$status->value}» недопустим."
            );
        }

        if ($status === TicketStatus::InProgress && $ticket->assignee_id === null) {
            throw new ConflictHttpException('Сначала назначьте ответственного специалиста.');
        }

        if ($status === TicketStatus::Resolved) {
            $ticket->resolved_at = now();
        } elseif ($status !== TicketStatus::Closed) {
            $ticket->resolved_at = null;
        }

        $ticket->status = $status;
        $ticket->save();

        return $this->loadFull($ticket);
    }

    /** @param  UploadedFile[]  $files */
    private function storeAttachments(Ticket $ticket, array $files): void
    {
        foreach ($files as $file) {
            $size = $file->getSize();
            $mime = $file->getClientMimeType();

            $ticket->attachments()->create([
                'original_name' => $file->getClientOriginalName(),
                'path' => $file->store('attachments'),
                'mime_type' => $mime,
                'size' => $size,
            ]);
        }
    }

        /** Добавляет метки, не трогая уже назначенные (attach). */
    public function attachTags(Ticket $ticket, array $tagIds): Ticket
    {
        $new = array_diff($tagIds, $ticket->tags()->pluck('tags.id')->all());

        if ($new) {
            $ticket->tags()->attach($new);
        }

        return $this->loadFull($ticket);
    }

    /** Снимает одну метку (detach). */
    public function detachTag(Ticket $ticket, Tag $tag): Ticket
    {
        if (! $ticket->tags()->whereKey($tag->id)->exists()) {
            throw new ConflictHttpException('У заявки нет такой метки.');
        }

        $ticket->tags()->detach($tag->id);

        return $this->loadFull($ticket);
    }

    /** Заменяет весь набор меток (sync). */
    public function syncTags(Ticket $ticket, array $tagIds): Ticket
    {
        $ticket->tags()->sync($tagIds);

        return $this->loadFull($ticket);
    }
}
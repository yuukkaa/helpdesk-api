<?php

namespace App\Services;

use App\Enums\TicketStatus;
use App\Enums\UserRole;
use App\Exceptions\BusinessException;
use App\Models\Message;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MessageService
{
    public function forTicket(Ticket $ticket, ?User $viewer = null): Collection
    {
        return $ticket->messages()
            ->when($viewer && $viewer->role === UserRole::Client, fn ($q) => $q->where('is_internal', false))
            ->with(['author', 'attachments'])
            ->oldest('id')
            ->get();
    }

    public function create(Ticket $ticket, User $author, array $data): Message
    {
        if ($ticket->statusValue() === TicketStatus::Closed->value) {
            throw new BusinessException('В закрытую заявку нельзя добавлять сообщения.', 409);
        }

        if ($author->role === UserRole::Client) {
            $data['is_internal'] = false;
        }

        return DB::transaction(function () use ($ticket, $author, $data) {
            $message = $ticket->messages()->create(
                Arr::except($data, ['attachments']) + ['user_id' => $author->id]
            );

            foreach ($data['attachments'] ?? [] as $file) {
                $size = $file->getSize();
                $mime = $file->getClientMimeType();

                $message->attachments()->create([
                    'ticket_id' => $ticket->id,
                    'original_name' => $file->getClientOriginalName(),
                    'path' => $file->store('attachments', 'public'),
                    'mime_type' => $mime,
                    'size' => $size,
                ]);
            }

            Log::info('Добавлено сообщение в заявку', [
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
                'author_id' => $author->id,
                'is_internal' => (bool) ($data['is_internal'] ?? false),
            ]);

            return $message->load(['author', 'attachments']);
        });
    }
}

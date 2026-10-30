<?php

namespace App\Services;

use App\Enums\TicketStatus;
use App\Models\Message;
use App\Models\Ticket;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class MessageService
{
    public function forTicket(Ticket $ticket): Collection
    {
        return $ticket->messages()->with(['author', 'attachments'])->oldest()->get();
    }

    public function create(Ticket $ticket, array $data): Message
    {
        if ($ticket->status === TicketStatus::Closed) {
            throw new ConflictHttpException('В закрытую заявку нельзя добавлять сообщения.');
        }

        return DB::transaction(function () use ($ticket, $data) {
            $message = $ticket->messages()->create(Arr::except($data, ['attachments']));

            foreach ($data['attachments'] ?? [] as $file) {
                $size = $file->getSize();
                $mime = $file->getClientMimeType();

                $message->attachments()->create([
                    'ticket_id' => $ticket->id,
                    'original_name' => $file->getClientOriginalName(),
                    'path' => $file->store('attachments'),
                    'mime_type' => $mime,
                    'size' => $size,
                ]);
            }

            return $message->load(['author', 'attachments']);
        });
    }
}
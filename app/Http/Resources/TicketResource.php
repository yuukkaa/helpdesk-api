<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $authorUser = $this->relationLoaded('author')
            ? $this->author
            : ($this->relationLoaded('user') ? $this->user : null);

        $status = $this->status instanceof \BackedEnum ? $this->status->value : $this->status;
        if ($status === 'waiting_client') {
            $status = 'waiting_for_client';
        }

        $priority = $this->priority instanceof \BackedEnum ? $this->priority->value : $this->priority;

        return [
            'id' => $this->id,
            'subject' => $this->subject ?? $this->title ?? 'Без темы',
            'description' => $this->description,
            'status' => $status,
            'priority' => $priority,
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category'),
            'author' => $authorUser ? new UserResource($authorUser) : null,
            'user' => $authorUser ? new UserResource($authorUser) : null,
            'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee ? new UserResource($this->assignee) : null),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'messages' => MessageResource::collection($this->whenLoaded('messages')),
            'attachments' => AttachmentResource::collection($this->whenLoaded('attachments')),
            'messages_count' => $this->whenCounted('messages'),
            'resolved_at' => $this->resolved_at ? $this->resolved_at->toISOString() : null,
            'created_at' => $this->created_at ? $this->created_at->toISOString() : null,
            'updated_at' => $this->updated_at ? $this->updated_at->toISOString() : null,
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $authorUser = $this->relationLoaded('author') ? $this->author : ($this->relationLoaded('user') ? $this->user : null);

        return [
            'id' => $this->id,
            'subject' => $this->subject ?? $this->title ?? 'Без темы',
            'description' => $this->description,
            'status' => $this->status,
            'priority' => $this->priority,
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category'),
            'author' => $authorUser,
            'user' => $authorUser,
            'assignee' => $this->whenLoaded('assignee'),
            'tags' => $this->whenLoaded('tags'),
            'messages' => $this->whenLoaded('messages'),
            'messages_count' => $this->whenCounted('messages'),
            'resolved_at' => $this->resolved_at ? $this->resolved_at->toISOString() : null,
            'created_at' => $this->created_at ? $this->created_at->format('d.m.Y, H:i') : null,
            'updated_at' => $this->updated_at ? $this->updated_at->toISOString() : null,
        ];
    }
}
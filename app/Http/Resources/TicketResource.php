<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
public function toArray(Request $request): array
{
    return [
        'id' => $this->id,
        'subject' => $this->subject,
        'description' => $this->description,
        'status' => $this->status->value,
        'priority' => $this->priority->value,
        'resolved_at' => $this->resolved_at,
        'created_at' => $this->created_at,
        'updated_at' => $this->updated_at,
        'author' => new UserResource($this->whenLoaded('author')),
        'assignee' => $this->whenLoaded(
            'assignee',
            fn () => $this->assignee ? new UserResource($this->assignee) : null
        ),
        'category' => new CategoryResource($this->whenLoaded('category')),
        'messages' => MessageResource::collection($this->whenLoaded('messages')),
        'attachments' => AttachmentResource::collection($this->whenLoaded('attachments')),
        'tags' => TagResource::collection($this->whenLoaded('tags')),
    ];
}
}

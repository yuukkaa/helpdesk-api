<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;

class Ticket extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    public function statusValue(): string
    {
        $val = $this->status instanceof \BackedEnum ? $this->status->value : (string) $this->status;

        return $val === 'waiting_client' ? 'waiting_for_client' : $val;
    }

    public function priorityValue(): string
    {
        return $this->priority instanceof \BackedEnum ? $this->priority->value : (string) $this->priority;
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function client(): BelongsTo
    {
        return $this->author();
    }

    public function user(): BelongsTo
    {
        return $this->author();
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    public function tags(): BelongsToMany
    {
        $pivot = Schema::hasTable('tag_ticket') ? 'tag_ticket' : 'ticket_tag';

        return $this->belongsToMany(Tag::class, $pivot)->withTimestamps();
    }

    public function scopeFilter(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['status'] ?? null, fn (Builder $q, $status) => $q->where('status', $status))
            ->when($filters['priority'] ?? null, fn (Builder $q, $priority) => $q->where('priority', $priority))
            ->when($filters['category_id'] ?? null, fn (Builder $q, $catId) => $q->where('category_id', $catId))
            ->when($filters['assignee_id'] ?? null, fn (Builder $q, $assigneeId) => $q->where('assignee_id', $assigneeId))
            ->when($filters['user_id'] ?? null, fn (Builder $q, $userId) => $q->where('user_id', $userId))
            ->when($filters['date_from'] ?? null, fn (Builder $q, $from) => $q->whereDate('created_at', '>=', $from))
            ->when($filters['date_to'] ?? null, fn (Builder $q, $to) => $q->whereDate('created_at', '<=', $to));
    }

    public function scopeSearch(Builder $query, ?string $search): Builder
    {
        return $query->when($search, function (Builder $q, string $term) {
            $term = trim($term);
            $q->where(function (Builder $sub) use ($term) {
                $sub->where('subject', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%");
            });
        });
    }

    public function scopeSort(Builder $query, ?string $sort, ?string $order): Builder
    {
        $allowed = ['id', 'created_at', 'updated_at', 'priority', 'status', 'subject'];
        $field = in_array($sort, $allowed, true) ? $sort : 'id';
        $direction = strtolower((string) $order) === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($field, $direction);
    }
}

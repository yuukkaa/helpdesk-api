<?php

namespace App\Services;

use App\Models\Tag;
use Illuminate\Database\Eloquent\Collection;

class TagService
{
    public function all(): Collection
    {
        return Tag::withCount('tickets')->orderBy('name')->get();
    }

    public function create(array $data): Tag
    {
        return Tag::create($data);
    }

    public function delete(Tag $tag): void
    {
        // Связи в tag_ticket удаляются каскадом (политика cascadeOnDelete из ПР3)
        $tag->delete();
    }
}
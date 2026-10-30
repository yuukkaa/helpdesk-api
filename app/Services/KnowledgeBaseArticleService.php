<?php

namespace App\Services;

use App\Models\KnowledgeBaseArticle;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class KnowledgeBaseArticleService
{
    private const RELATIONS = ['author', 'category'];

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = min(max((int) ($filters['per_page'] ?? 15), 1), 100);

        $published = isset($filters['is_published'])
            ? filter_var($filters['is_published'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE)
            : null;

        return KnowledgeBaseArticle::query()
            ->with(self::RELATIONS)
            ->when($filters['category_id'] ?? null, fn ($q, $v) => $q->where('category_id', $v))
            ->when($published !== null, fn ($q) => $q->where('is_published', $published))
            ->when($filters['search'] ?? null, function ($q, $v) {
                $q->where(function ($q) use ($v) {
                    $q->where('title', 'like', "%{$v}%")
                        ->orWhere('content', 'like', "%{$v}%");
                });
            })
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function load(KnowledgeBaseArticle $article): KnowledgeBaseArticle
    {
        return $article->load(self::RELATIONS);
    }

    public function create(array $data): KnowledgeBaseArticle
    {
        return $this->load(KnowledgeBaseArticle::create($data));
    }

    public function update(KnowledgeBaseArticle $article, array $data): KnowledgeBaseArticle
    {
        $article->update($data);

        return $this->load($article);
    }

    public function delete(KnowledgeBaseArticle $article): void
    {
        $article->delete();
    }
}
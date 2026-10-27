<?php

namespace App\Services;

use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class CategoryService
{
    public function all(): Collection
    {
        return Category::withCount('tickets')->orderBy('name')->get();
    }

    public function create(array $data): Category
    {
        return Category::create($data);
    }

    public function update(Category $category, array $data): Category
    {
        $category->update($data);

        return $category;
    }

    public function delete(Category $category): void
    {
        if ($category->tickets()->exists()) {
            throw new ConflictHttpException(
                'Нельзя удалить категорию, в которой есть заявки.'
            );
        }

        $category->delete();
    }
}
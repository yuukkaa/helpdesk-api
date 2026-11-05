<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;

class CategoryService
{
    public function all(): Collection
    {
        return Category::withCount('tickets')->orderBy('name')->get();
    }

    public function create(array $data): Category
    {
        $category = Category::create($data);

        Log::info('Создана категория обращений', [
            'category_id' => $category->id,
            'name' => $category->name,
        ]);

        return $category;
    }

    public function update(Category $category, array $data): Category
    {
        $category->update($data);

        Log::info('Обновлена категория обращений', [
            'category_id' => $category->id,
            'name' => $category->name,
        ]);

        return $category;
    }

    public function delete(Category $category): void
    {
        if ($category->tickets()->exists()) {
            throw new BusinessException(
                'Нельзя удалить категорию, в которой есть заявки.',
                409
            );
        }

        $id = $category->id;
        $name = $category->name;
        $category->delete();

        Log::info('Удалена категория обращений', [
            'category_id' => $id,
            'name' => $name,
        ]);
    }
}

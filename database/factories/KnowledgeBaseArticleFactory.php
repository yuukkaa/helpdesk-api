<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class KnowledgeBaseArticleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->support(),
            'category_id' => Category::factory(),
            'title' => fake()->randomElement([
                'Как сбросить пароль', 'Что делать при двойном списании',
                'Настройка VPN-клиента', 'Типовые причины ошибки 500',
                'Как изменить адрес электронной почты', 'Как прикрепить файл к обращению',
                'Как выбрать приоритет обращения', 'Как отследить статус обращения',
            ]),
            'content' => fake()->realText(400),
            'is_published' => fake()->boolean(80),
        ];
    }
}
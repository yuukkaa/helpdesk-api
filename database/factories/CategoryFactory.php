<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
  public function definition(): array
{
    return [
        'name' => fake()->unique()->randomElement([
            'Доступ и пароли', 'Оплата и тарифы', 'Ошибки приложения',
            'Оборудование', 'Сеть и VPN', 'Почта', 'Отчёты', 'Прочее',
        ]),
        'description' => fake()->realText(120),
    ];
}
}

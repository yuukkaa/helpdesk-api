<?php

namespace Database\Factories;

use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TicketFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'assignee_id' => null,
            'category_id' => Category::factory(),
            'subject' => fake()->randomElement([
                'Не могу войти в личный кабинет',
                'Двойное списание за подписку',
                'Ошибка 500 при загрузке отчёта',
                'Не работает VPN-токен',
                'Запрос на смену email',
                'Не приходит письмо для сброса пароля',
                'Тормозит загрузка страницы заказов',
                'Не открывается файл во вложении',
                'Нужен доступ к разделу отчётов',
                'Неверно считается итоговая сумма',
            ]),
            'description' => fake()->realText(250),
            'status' => TicketStatus::New,
            'priority' => fake()->randomElement(TicketPriority::cases()),
            'resolved_at' => null,
        ];
    }
}
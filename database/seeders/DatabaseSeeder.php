<?php

namespace Database\Seeders;

use App\Enums\TicketStatus;
use App\Models\Attachment;
use App\Models\Category;
use App\Models\KnowledgeBaseArticle;
use App\Models\Message;
use App\Models\Tag;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Пользователи каждой роли, пароль у всех: password
        $admin = User::factory()->admin()->create([
            'name' => 'Администратор Системы',
            'email' => 'admin@helpdesk.test',
        ]);

        $supports = collect([
            ['Марат Сейтов', 'support1@helpdesk.test'],
            ['Айгерим Нурланова', 'support2@helpdesk.test'],
        ])->map(fn ($u) => User::factory()->support()->create([
            'name' => $u[0],
            'email' => $u[1],
        ]));

        $clients = collect([
            ['Данияр Касымов', 'client1@helpdesk.test'],
            ['Жанна Омарова', 'client2@helpdesk.test'],
        ])->map(fn ($u) => User::factory()->create([
            'name' => $u[0],
            'email' => $u[1],
        ]))->merge(User::factory()->count(4)->create());

        $staff = $supports->concat([$admin]);

        // Справочники
        $categories = Category::factory()->count(6)->create();
        $tags = Tag::factory()->count(8)->create();

        // Статьи базы знаний
        KnowledgeBaseArticle::factory()
            ->count(8)
            ->state(fn () => [
                'user_id' => $staff->random()->id,
                'category_id' => $categories->random()->id,
            ])
            ->create();

        // Тикеты, переписка, вложения и теги
        for ($i = 0; $i < 12; $i++) {
            $status = fake()->randomElement(TicketStatus::cases());
            $assignee = $status === TicketStatus::New ? null : $supports->random();
            $created = now()->subDays(rand(3, 30));
            $isDone = in_array($status, [TicketStatus::Resolved, TicketStatus::Closed]);

            $ticket = Ticket::factory()->create([
                'user_id' => $clients->random()->id,
                'category_id' => $categories->random()->id,
                'assignee_id' => $assignee?->id,
                'status' => $status,
                'resolved_at' => $isDone ? $created->copy()->addHours(rand(1, 48)) : null,
                'created_at' => $created,
            ]);

            $first = Message::factory()->create([
                'ticket_id' => $ticket->id,
                'user_id' => $ticket->user_id,
                'body' => $ticket->description,
            ]);

            if ($assignee) {
                Message::factory()->create([
                    'ticket_id' => $ticket->id,
                    'user_id' => $assignee->id,
                ]);
                Message::factory()->create([
                    'ticket_id' => $ticket->id,
                    'user_id' => $assignee->id,
                    'is_internal' => true,
                ]);
                Message::factory()->create([
                    'ticket_id' => $ticket->id,
                    'user_id' => $ticket->user_id,
                ]);
            }

            if (rand(0, 1)) {
                Attachment::factory()->create([
                    'ticket_id' => $ticket->id,
                    'message_id' => $first->id,
                ]);
            }

            $ticket->tags()->attach($tags->random(rand(1, 3))->pluck('id'));
        }
    }
}
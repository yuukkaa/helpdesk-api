<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Message;
use App\Models\Tag;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Throwable;

class TicketSeeder extends Seeder
{
    public function run(): void
    {
        Schema::disableForeignKeyConstraints();

        Message::query()->delete();
        try {
            DB::table('ticket_tag')->delete();
        } catch (Throwable) {
        }
        Ticket::query()->delete();

        Schema::enableForeignKeyConstraints();

        $support1 = User::where('role', 'support')->first() ?? User::first();
        $support2 = User::where('role', 'support')->skip(1)->first() ?? $support1;
        $client1 = User::where('role', 'client')->first() ?? User::first();
        $client2 = User::where('role', 'client')->skip(1)->first() ?? $client1;

        $catAccess = Category::where('name', 'like', '%Доступ%')->orWhere('name', 'like', '%парол%')->first() ?? Category::first();
        $catFinance = Category::where('name', 'like', '%Оплат%')->orWhere('name', 'like', '%счет%')->first() ?? Category::first();
        $catTech = Category::where('name', 'like', '%Технич%')->orWhere('name', 'like', '%ошибк%')->first() ?? Category::first();
        $catGeneral = Category::where('name', 'like', '%Общ%')->first() ?? Category::first();

        $tagAccount = Tag::where('name', 'like', '%аккаунт%')->first();
        $tagUrgent = Tag::where('name', 'like', '%срочн%')->first();
        $tagBug = Tag::where('name', 'like', '%баг%')->first();
        $tagBilling = Tag::where('name', 'like', '%бухгалт%')->first();

        $items = [
            [
                'subject' => 'Не могу войти в личный кабинет',
                'title' => 'Не могу войти в личный кабинет',
                'description' => 'Здравствуйте! При попытке авторизации в системе появляется сообщение «Неверный логин или пароль». Кнопка восстановления пароля не срабатывает, письмо не приходит на почту.',
                'status' => 'in_progress',
                'priority' => 'urgent',
                'category_id' => $catAccess->id,
                'author_id' => $client1->id,
                'client_id' => $client1->id,
                'user_id' => $client1->id,
                'assignee_id' => $support1->id,
                'tags' => array_filter([$tagAccount?->id, $tagUrgent?->id]),
                'messages' => [
                    ['author_id' => $client1->id, 'is_internal' => false, 'body' => 'Пробовал вводить пароль вручную и копировать из менеджера паролей — войти всё равно не удается.'],
                    ['author_id' => $support1->id, 'is_internal' => true, 'body' => 'Учетная запись была временно заблокирована из-за 5 неудачных попыток ввода. Сняла блокировку.'],
                    ['author_id' => $support1->id, 'is_internal' => false, 'body' => 'Здравствуйте! Мы разблокировали вашу учетную запись и выслали ссылку для сброса пароля. Пожалуйста, проверьте почту.'],
                ],
            ],
            [
                'subject' => 'Не приходит письмо для сброса пароля',
                'title' => 'Не приходит письмо для сброса пароля',
                'description' => 'Добрый день. Отправила запрос на сброс пароля 20 минут назад, но письмо на ящик так и не поступило. Папку со спамом проверяла.',
                'status' => 'in_progress',
                'priority' => 'high',
                'category_id' => $catAccess->id,
                'author_id' => $client1->id,
                'client_id' => $client1->id,
                'user_id' => $client1->id,
                'assignee_id' => $support1->id,
                'tags' => array_filter([$tagAccount?->id]),
                'messages' => [
                    ['author_id' => $support1->id, 'is_internal' => true, 'body' => 'Почтовый шлюз задержал письмо из-за фильтрации. Отправила повторно напрямую.'],
                    ['author_id' => $support1->id, 'is_internal' => false, 'body' => 'Здравствуйте! Мы повторно направили письмо со ссылкой на сброс пароля. Срок действия ссылки — 1 час.'],
                ],
            ],
            [
                'subject' => 'Запрос на смену email в учётной записи',
                'title' => 'Запрос на смену email в учётной записи',
                'description' => 'Прошу привязать к моему профилю новый рабочий email-адрес в связи со сменой домена компании.',
                'status' => 'waiting_client',
                'priority' => 'medium',
                'category_id' => $catAccess->id,
                'author_id' => $client1->id,
                'client_id' => $client1->id,
                'user_id' => $client1->id,
                'assignee_id' => $support2->id,
                'tags' => array_filter([$tagAccount?->id]),
                'messages' => [
                    ['author_id' => $support2->id, 'is_internal' => false, 'body' => 'Здравствуйте! Для подтверждения смены email сообщите, пожалуйста, ваш новый адрес электронной почты.'],
                ],
            ],
            [
                'subject' => 'Не открывается файл во вложении к отчёту',
                'title' => 'Не открывается файл во вложении к отчёту',
                'description' => 'При попытке открыть прикрепленный файл PDF появляется белый экран и ошибка загрузки. Другие файлы скачиваются без проблем.',
                'status' => 'resolved',
                'priority' => 'medium',
                'category_id' => $catTech->id,
                'author_id' => $client2->id,
                'client_id' => $client2->id,
                'user_id' => $client2->id,
                'assignee_id' => $support1->id,
                'resolved_at' => now(),
                'tags' => array_filter([$tagBug?->id]),
                'messages' => [
                    ['author_id' => $client2->id, 'is_internal' => false, 'body' => 'Проверял в Chrome и Edge — ошибка повторяется.'],
                    ['author_id' => $support1->id, 'is_internal' => true, 'body' => 'Перезалили поврежденный файл в хранилище storage.'],
                    ['author_id' => $support1->id, 'is_internal' => false, 'body' => 'Здравствуйте! Документ перезалит, файл проверен и открывается корректно. Пожалуйста, обновите страницу.'],
                ],
            ],
            [
                'subject' => 'Дублирование суммы в счёте за октябрь',
                'title' => 'Дублирование суммы в счёте за октябрь',
                'description' => 'В счёте за октябрь одна и та же услуга рассчитана два раза. Прошу скорректировать документ перед оплатой.',
                'status' => 'new',
                'priority' => 'high',
                'category_id' => $catFinance->id,
                'author_id' => $client2->id,
                'client_id' => $client2->id,
                'user_id' => $client2->id,
                'assignee_id' => $support2->id,
                'tags' => array_filter([$tagBilling?->id]),
                'messages' => [
                    ['author_id' => $client2->id, 'is_internal' => false, 'body' => 'Номер сформированного счёта: INV-2026-1042.'],
                ],
            ],
            [
                'subject' => 'Тормозит загрузка страницы заказов',
                'title' => 'Тормозит загрузка страницы заказов',
                'description' => 'При переходе во вкладку заказов таблица открывается больше 15 секунд при установке фильтра за текущий месяц.',
                'status' => 'in_progress',
                'priority' => 'medium',
                'category_id' => $catTech->id,
                'author_id' => $client2->id,
                'client_id' => $client2->id,
                'user_id' => $client2->id,
                'assignee_id' => $support2->id,
                'tags' => array_filter([$tagBug?->id]),
                'messages' => [
                    ['author_id' => $support2->id, 'is_internal' => true, 'body' => 'Добавили составной индекс по дате и статусу заказа в базе данных.'],
                    ['author_id' => $support2->id, 'is_internal' => false, 'body' => 'Здравствуйте! Запросы были оптимизированы, скорость загрузки раздела восстановлена.'],
                ],
            ],
        ];

        foreach ($items as $data) {
            $messages = $data['messages'];
            $tags = $data['tags'];
            unset($data['messages'], $data['tags']);

            $ticket = $this->createRecord(Ticket::class, $data);

            if (method_exists($ticket, 'tags')) {
                try {
                    $ticket->tags()->sync($tags);
                } catch (Throwable) {
                }
            }

            foreach ($messages as $msg) {
                try {
                    $this->createRecord(Message::class, [
                        'ticket_id' => $ticket->id,
                        'author_id' => $msg['author_id'],
                        'user_id' => $msg['author_id'],
                        'body' => $msg['body'],
                        'content' => $msg['body'],
                        'is_internal' => $msg['is_internal'],
                    ]);
                } catch (Throwable) {
                }
            }
        }
    }

    private function createRecord(string $modelClass, array $attributes)
    {
        $model = new $modelClass();
        $table = $model->getTable();
        $columns = Schema::getColumnListing($table);

        $filtered = [];
        foreach ($attributes as $key => $value) {
            if (in_array($key, $columns, true)) {
                $filtered[$key] = $value;
            }
        }

        if (in_array('slug', $columns, true) && empty($filtered['slug'])) {
            $source = (string) ($attributes['slug'] ?? $attributes['title'] ?? $attributes['subject'] ?? 'ticket');
            $slug = Str::slug($source, '-', 'ru');
            $filtered['slug'] = $slug !== '' ? $slug . '-' . Str::lower(Str::random(4)) : 'ticket-' . Str::lower(Str::random(6));
        }

        return $modelClass::query()->create($filtered);
    }
}
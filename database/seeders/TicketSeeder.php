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
        try {
            Message::query()->delete();
            DB::table('ticket_tag')->delete();
        } catch (Throwable) {}
        try {
            DB::table('tag_ticket')->delete();
        } catch (Throwable) {}
        Ticket::query()->delete();
        Schema::enableForeignKeyConstraints();

        $support1 = User::where('role', 'support')->first() ?? User::first();
        $support2 = User::where('role', 'support')->skip(1)->first() ?? $support1;
        $client1 = User::where('role', 'client')->first() ?? User::first();
        $client2 = User::where('role', 'client')->skip(1)->first() ?? $client1;

        $catAccess = Category::where('name', 'like', '%Доступ%')->first() ?? Category::first();
        $catFinance = Category::where('name', 'like', '%Оплат%')->first() ?? Category::first();
        $catTech = Category::where('name', 'like', '%Технич%')->first() ?? Category::first();

        $tagAccount = Tag::where('name', 'like', '%аккаунт%')->first();
        $tagUrgent = Tag::where('name', 'like', '%срочн%')->first();
        $tagBug = Tag::where('name', 'like', '%баг%')->first();
        $tagBilling = Tag::where('name', 'like', '%бухгалт%')->first();

        $items = [
            [
                'subject' => 'Не могу войти в личный кабинет',
                'title' => 'Не могу войти в личный кабинет',
                'description' => 'Здравствуйте! При попытке входа в систему появляется сообщение «Неверный логин или пароль». Кнопка восстановления пароля не срабатывает, письмо не приходит.',
                'status' => 'in_progress',
                'priority' => 'urgent',
                'category_id' => $catAccess?->id ?? 1,
                'author_id' => $client1?->id ?? 1,
                'client_id' => $client1?->id ?? 1,
                'user_id' => $client1?->id ?? 1,
                'assignee_id' => $support1?->id ?? 1,
                'tags' => array_filter([$tagAccount?->id, $tagUrgent?->id]),
                'messages' => [
                    ['author_id' => $client1?->id ?? 1, 'is_internal' => false, 'body' => 'Пробовал вводить пароль вручную и копировать — войти всё равно не удается.'],
                    ['author_id' => $support1?->id ?? 1, 'is_internal' => true, 'body' => 'Учетная запись была заблокирована из-за 5 неудачных попыток ввода. Сняла блокировку.'],
                    ['author_id' => $support1?->id ?? 1, 'is_internal' => false, 'body' => 'Здравствуйте! Мы разблокировали вашу учетную запись и выслали ссылку для смены пароля. Проверьте почту.'],
                ],
            ],
            [
                'subject' => 'Не приходит письмо для сброса пароля',
                'title' => 'Не приходит письмо для сброса пароля',
                'description' => 'Добрый день. Отправила запрос на сброс пароля 20 минут назад, но письмо на ящик так и не поступило. Папку со спамом проверяла.',
                'status' => 'in_progress',
                'priority' => 'high',
                'category_id' => $catAccess?->id ?? 1,
                'author_id' => $client1?->id ?? 1,
                'client_id' => $client1?->id ?? 1,
                'user_id' => $client1?->id ?? 1,
                'assignee_id' => $support1?->id ?? 1,
                'tags' => array_filter([$tagAccount?->id]),
                'messages' => [
                    ['author_id' => $support1?->id ?? 1, 'is_internal' => true, 'body' => 'Почтовый шлюз задержал письмо из-за фильтрации. Отправила повторно напрямую.'],
                    ['author_id' => $support1?->id ?? 1, 'is_internal' => false, 'body' => 'Здравствуйте! Мы повторно направили письмо со ссылкой на сброс пароля. Срок действия ссылки — 1 час.'],
                ],
            ],
            [
                'subject' => 'Запрос на смену email в учётной записи',
                'title' => 'Запрос на смену email в учётной записи',
                'description' => 'Прошу привязать к моему профилю новый рабочий email-адрес в связи со сменой почтового сервера компании.',
                'status' => 'waiting_for_client',
                'priority' => 'medium',
                'category_id' => $catAccess?->id ?? 1,
                'author_id' => $client1?->id ?? 1,
                'client_id' => $client1?->id ?? 1,
                'user_id' => $client1?->id ?? 1,
                'assignee_id' => $support2?->id ?? 1,
                'tags' => array_filter([$tagAccount?->id]),
                'messages' => [
                    ['author_id' => $support2?->id ?? 1, 'is_internal' => false, 'body' => 'Здравствуйте! Для подтверждения смены email сообщите, пожалуйста, ваш новый адрес электронной почты.'],
                ],
            ],
            [
                'subject' => 'Не открывается файл во вложении к отчёту',
                'title' => 'Не открывается файл во вложении к отчёту',
                'description' => 'При попытке открыть прикрепленный файл PDF появляется белый экран и ошибка загрузки. Другие файлы скачиваются без проблем.',
                'status' => 'resolved',
                'priority' => 'medium',
                'category_id' => $catTech?->id ?? 1,
                'author_id' => $client2?->id ?? 1,
                'client_id' => $client2?->id ?? 1,
                'user_id' => $client2?->id ?? 1,
                'assignee_id' => $support1?->id ?? 1,
                'resolved_at' => now(),
                'tags' => array_filter([$tagBug?->id]),
                'messages' => [
                    ['author_id' => $client2?->id ?? 1, 'is_internal' => false, 'body' => 'Проверял в Chrome и Edge — ошибка повторяется.'],
                    ['author_id' => $support1?->id ?? 1, 'is_internal' => true, 'body' => 'Перезалили поврежденный файл в хранилище storage.'],
                    ['author_id' => $support1?->id ?? 1, 'is_internal' => false, 'body' => 'Здравствуйте! Документ перезалит, файл проверен и открывается корректно. Пожалуйста, обновите страницу.'],
                ],
            ],
            [
                'subject' => 'Дублирование суммы в счёте за октябрь',
                'title' => 'Дублирование суммы в счёте за октябрь',
                'description' => 'В счёте за октябрь одна и та же услуга рассчитана два раза. Прошу скорректировать документ перед оплатой.',
                'status' => 'new',
                'priority' => 'high',
                'category_id' => $catFinance?->id ?? 1,
                'author_id' => $client2?->id ?? 1,
                'client_id' => $client2?->id ?? 1,
                'user_id' => $client2?->id ?? 1,
                'assignee_id' => $support2?->id ?? 1,
                'tags' => array_filter([$tagBilling?->id]),
                'messages' => [
                    ['author_id' => $client2?->id ?? 1, 'is_internal' => false, 'body' => 'Номер сформированного счёта: INV-2026-1042.'],
                ],
            ],
            [
                'subject' => 'Ошибка 500 при выгрузке отчёта в Excel',
                'title' => 'Ошибка 500 при выгрузке отчёта в Excel',
                'description' => 'При нажатии кнопки «Экспорт в XLSX» за квартал страница зависает и выдает ошибку сервера 500. Выгрузка за один день работает нормально.',
                'status' => 'in_progress',
                'priority' => 'urgent',
                'category_id' => $catTech?->id ?? 1,
                'author_id' => $client1?->id ?? 1,
                'client_id' => $client1?->id ?? 1,
                'user_id' => $client1?->id ?? 1,
                'assignee_id' => $support1?->id ?? 1,
                'tags' => array_filter([$tagBug?->id, $tagUrgent?->id]),
                'messages' => [
                    ['author_id' => $support1?->id ?? 1, 'is_internal' => true, 'body' => 'Увеличили лимит памяти PHP для генерации XLSX и добавили пакетную обработку строк.'],
                    ['author_id' => $support1?->id ?? 1, 'is_internal' => false, 'body' => 'Здравствуйте! Мы оптимизировали формирование больших отчетов. Пожалуйста, проверьте выгрузку за квартал сейчас.'],
                ],
            ],
        ];

        $ticketCols = Schema::getColumnListing('tickets');
        $msgCols = Schema::getColumnListing('messages');

        foreach ($items as $data) {
            $messages = $data['messages'];
            $tags = $data['tags'];
            unset($data['messages'], $data['tags']);

            $filtered = [];
            foreach ($data as $k => $v) {
                if (in_array($k, $ticketCols, true)) {
                    $filtered[$k] = $v;
                }
            }

            if (in_array('slug', $ticketCols, true) && empty($filtered['slug'])) {
                $filtered['slug'] = 'ticket-' . Str::lower(Str::random(8));
            }

            $ticket = Ticket::create($filtered);

            if (!empty($tags)) {
                try {
                    $ticket->tags()->sync($tags);
                } catch (Throwable) {}
            }

            foreach ($messages as $msg) {
                $fMsg = [];
                $msg['ticket_id'] = $ticket->id;
                $msg['user_id'] = $msg['author_id'];
                $msg['content'] = $msg['body'];

                foreach ($msg as $mk => $mv) {
                    if (in_array($mk, $msgCols, true)) {
                        $fMsg[$mk] = $mv;
                    }
                }
                try {
                    Message::create($fMsg);
                } catch (Throwable) {}
            }
        }
    }
}
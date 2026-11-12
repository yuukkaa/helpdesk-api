<?php

namespace Database\Seeders;

use App\Models\Attachment;
use App\Models\Category;
use App\Models\Message;
use App\Models\Tag;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class TicketSeeder extends Seeder
{
    public function run(): void
    {
        Schema::disableForeignKeyConstraints();
        try {
            Attachment::query()->delete();
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
        $catGeneral = Category::where('name', 'like', '%Общ%')->first() ?? Category::first();

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
                    ['author_id' => $client1?->id ?? 1, 'is_internal' => false, 'body' => 'Пробовала вводить пароль вручную и копировать — войти всё равно не удается. Прикладываю скриншот ошибки.'],
                    ['author_id' => $support1?->id ?? 1, 'is_internal' => true, 'body' => 'Учетная запись была заблокирована из-за 5 неудачных попыток ввода. Сняла блокировку в панели.'],
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
                'resolved_at' => now()->subHours(3),
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
                'author_id' => $client1?->id ?? 1,
                'client_id' => $client1?->id ?? 1,
                'user_id' => $client1?->id ?? 1,
                'assignee_id' => null,
                'tags' => array_filter([$tagBilling?->id]),
                'messages' => [
                    ['author_id' => $client1?->id ?? 1, 'is_internal' => false, 'body' => 'Номер сформированного счёта: INV-2026-1042.'],
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
            [
                'subject' => 'Настройка двухфакторной аутентификации для нового сотрудника',
                'title' => 'Настройка двухфакторной аутентификации для нового сотрудника',
                'description' => 'Подскажите, как сбросить привязку Google Authenticator при замене рабочего смартфона сотрудника.',
                'status' => 'new',
                'priority' => 'low',
                'category_id' => $catAccess?->id ?? 1,
                'author_id' => $client2?->id ?? 1,
                'client_id' => $client2?->id ?? 1,
                'user_id' => $client2?->id ?? 1,
                'assignee_id' => null,
                'tags' => array_filter([$tagAccount?->id]),
                'messages' => [],
            ],
            [
                'subject' => 'Запрос закрывающих документов (акт сверки за 3 квартал)',
                'title' => 'Запрос закрывающих документов (акт сверки за 3 квартал)',
                'description' => 'Добрый день! Просим направить подписанный акт сверки взаиморасчётов за 3 квартал в формате PDF с ЭЦП.',
                'status' => 'closed',
                'priority' => 'low',
                'category_id' => $catFinance?->id ?? 1,
                'author_id' => $client1?->id ?? 1,
                'client_id' => $client1?->id ?? 1,
                'user_id' => $client1?->id ?? 1,
                'assignee_id' => $support2?->id ?? 1,
                'resolved_at' => now()->subDays(2),
                'tags' => array_filter([$tagBilling?->id]),
                'messages' => [
                    ['author_id' => $support2?->id ?? 1, 'is_internal' => false, 'body' => 'Акт сверки сформирован и загружен в раздел «Финансы -> Документы». Заявка закрыта.'],
                ],
            ],
            [
                'subject' => 'Сбой синхронизации справочника контрагентов по API',
                'title' => 'Сбой синхронизации справочника контрагентов по API',
                'description' => 'При отправке вебхука обновления карточки контрагента возвращается код 502 Bad Gateway.',
                'status' => 'waiting_for_client',
                'priority' => 'high',
                'category_id' => $catTech?->id ?? 1,
                'author_id' => $client2?->id ?? 1,
                'client_id' => $client2?->id ?? 1,
                'user_id' => $client2?->id ?? 1,
                'assignee_id' => $support1?->id ?? 1,
                'tags' => array_filter([$tagBug?->id]),
                'messages' => [
                    ['author_id' => $support1?->id ?? 1, 'is_internal' => false, 'body' => 'Уточните, пожалуйста, точное время последнего запроса и IP-адрес вашего сервера.'],
                ],
            ],
            [
                'subject' => 'Консультация по регламенту SLA для критических инцидентов',
                'title' => 'Консультация по регламенту SLA для критических инцидентов',
                'description' => 'Прошу уточнить нормативное время реакции на заявки со статусом «Срочный» в выходные и праздничные дни.',
                'status' => 'resolved',
                'priority' => 'low',
                'category_id' => $catGeneral?->id ?? 1,
                'author_id' => $client1?->id ?? 1,
                'client_id' => $client1?->id ?? 1,
                'user_id' => $client1?->id ?? 1,
                'assignee_id' => $support2?->id ?? 1,
                'resolved_at' => now()->subHours(10),
                'tags' => [],
                'messages' => [
                    ['author_id' => $support2?->id ?? 1, 'is_internal' => false, 'body' => 'Для заявок с приоритетом «Срочный» время первичной реакции составляет 15 минут круглосуточно 24/7.'],
                ],
            ],
            [
                'subject' => 'Не отображаются новые уведомления в верхнем меню',
                'title' => 'Не отображаются новые уведомления в верхнем меню',
                'description' => 'Счётчик непрочитанных ответов не обновляется без перезагрузки вкладки браузера.',
                'status' => 'new',
                'priority' => 'medium',
                'category_id' => $catTech?->id ?? 1,
                'author_id' => $client1?->id ?? 1,
                'client_id' => $client1?->id ?? 1,
                'user_id' => $client1?->id ?? 1,
                'assignee_id' => null,
                'tags' => array_filter([$tagBug?->id]),
                'messages' => [],
            ],
            [
                'subject' => 'Добавление дополнительного пользователя от организации',
                'title' => 'Добавление дополнительного пользователя от организации',
                'description' => 'Необходимо подключить нового бухгалтера к порталу поддержки с правами клиента.',
                'status' => 'new',
                'priority' => 'medium',
                'category_id' => $catGeneral?->id ?? 1,
                'author_id' => $client2?->id ?? 1,
                'client_id' => $client2?->id ?? 1,
                'user_id' => $client2?->id ?? 1,
                'assignee_id' => null,
                'tags' => array_filter([$tagAccount?->id]),
                'messages' => [],
            ],
        ];

        $ticketCols = Schema::getColumnListing('tickets');
        $msgCols = Schema::getColumnListing('messages');

        $firstTicket = null;

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
            if ($firstTicket === null) {
                $firstTicket = $ticket;
            }

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

        // Создаём демонстрационный скриншот ошибки в хранилище public для первой заявки
        if ($firstTicket) {
            try {
                $relativePath = 'attachments/demo-login-error.png';
                $pngData = $this->generateDemoPng();
                Storage::disk('public')->put($relativePath, $pngData);

                Attachment::create([
                    'ticket_id' => $firstTicket->id,
                    'message_id' => null,
                    'original_name' => 'screenshot-login-error.png',
                    'path' => $relativePath,
                    'mime_type' => 'image/png',
                    'size' => strlen($pngData),
                ]);
            } catch (Throwable) {}
        }
    }

    private function generateDemoPng(): string
    {
        if (function_exists('imagecreatetruecolor')) {
            $im = imagecreatetruecolor(480, 180);
            $bg = imagecolorallocate($im, 254, 242, 242);
            $border = imagecolorallocate($im, 239, 68, 68);
            $textDark = imagecolorallocate($im, 153, 27, 27);
            $textMuted = imagecolorallocate($im, 185, 28, 28);

            imagefilledrectangle($im, 0, 0, 479, 179, $bg);
            imagerectangle($im, 4, 4, 475, 175, $border);
            imagestring($im, 5, 24, 35, 'AUTH ERROR 401: Invalid credentials', $textDark);
            imagestring($im, 4, 24, 70, 'Account: zhanna@client.local', $textMuted);
            imagestring($im, 3, 24, 105, 'Status: Temporarily locked after 5 failed attempts', $textMuted);
            imagestring($im, 2, 24, 140, 'Help Desk Screenshot Attachment (Storage/public)', $textMuted);

            ob_start();
            imagepng($im);
            $bytes = (string) ob_get_clean();
            imagedestroy($im);
            if ($bytes !== '') {
                return $bytes;
            }
        }

        return base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        );
    }
}
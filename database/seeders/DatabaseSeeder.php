<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\KnowledgeBaseArticle;
use App\Models\Message;
use App\Models\Tag;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Throwable;

class DatabaseSeeder extends Seeder
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
        KnowledgeBaseArticle::query()->delete();
        Category::query()->delete();
        Tag::query()->delete();
        User::query()->delete();

        Schema::enableForeignKeyConstraints();

        // 1. Пользователи
        $admin = $this->createRecord(User::class, [
            'name' => 'Администратор Системы',
            'email' => 'admin@helpdesk.local',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        $support1 = $this->createRecord(User::class, [
            'name' => 'Айгерим Нурланова',
            'email' => 'aigerim@helpdesk.local',
            'password' => bcrypt('password'),
            'role' => 'support',
        ]);

        $support2 = $this->createRecord(User::class, [
            'name' => 'Марат Сейтов',
            'email' => 'marat@helpdesk.local',
            'password' => bcrypt('password'),
            'role' => 'support',
        ]);

        $client1 = $this->createRecord(User::class, [
            'name' => 'Жанна Омарова',
            'email' => 'zhanna@client.local',
            'password' => bcrypt('password'),
            'role' => 'client',
        ]);

        $client2 = $this->createRecord(User::class, [
            'name' => 'Данияр Касымов',
            'email' => 'daniyar@client.local',
            'password' => bcrypt('password'),
            'role' => 'client',
        ]);

        // 2. Категории
        $catAccess = $this->createRecord(Category::class, [
            'name' => 'Доступ и пароли',
            'slug' => 'access-and-passwords',
            'description' => 'Восстановление пароля, смена почты и настройка 2FA',
        ]);

        $catFinance = $this->createRecord(Category::class, [
            'name' => 'Оплата и счета',
            'slug' => 'billing-and-invoices',
            'description' => 'Счета на оплату, акты сверки и закрывающие документы',
        ]);

        $catTech = $this->createRecord(Category::class, [
            'name' => 'Технические ошибки',
            'slug' => 'technical-issues',
            'description' => 'Ошибки при работе с файлами, отчетами и системой',
        ]);

        $catGeneral = $this->createRecord(Category::class, [
            'name' => 'Общие вопросы',
            'slug' => 'general-questions',
            'description' => 'Консультации по регламенту и работе личного кабинета',
        ]);

        // 3. Теги
        $tagBug = $this->createRecord(Tag::class, ['name' => 'баг', 'slug' => 'bug']);
        $tagUrgent = $this->createRecord(Tag::class, ['name' => 'срочно', 'slug' => 'urgent']);
        $tagAccount = $this->createRecord(Tag::class, ['name' => 'аккаунт', 'slug' => 'account']);
        $tagBilling = $this->createRecord(Tag::class, ['name' => 'бухгалтерия', 'slug' => 'billing']);

        // 4. Статьи Базы знаний
        $articles = [
            [
                'title' => 'Как сбросить пароль от учётной записи',
                'slug' => 'kak-sbrosit-parol',
                'category_id' => $catAccess->id,
                'author_id' => $admin->id,
                'user_id' => $admin->id,
                'content' => "Для восстановления доступа к аккаунту:\n1. Перейдите на страницу входа и нажмите «Забыли пароль?».\n2. Введите ваш корпоративный email.\n3. Откройте письмо и перейдите по ссылке для установки нового пароля (не менее 8 символов).\nЕсли письмо не пришло в течение 5 минут, проверьте папку «Спам».",
                'body' => "Для восстановления доступа к аккаунту:\n1. Перейдите на страницу входа и нажмите «Забыли пароль?».\n2. Введите ваш корпоративный email.\n3. Откройте письмо и перейдите по ссылке для установки нового пароля (не менее 8 символов).\nЕсли письмо не пришло в течение 5 минут, проверьте папку «Спам».",
                'is_published' => true,
                'published' => true,
            ],
            [
                'title' => 'Порядок смены email-адреса в профиле',
                'slug' => 'poryadok-smeny-email',
                'category_id' => $catAccess->id,
                'author_id' => $admin->id,
                'user_id' => $admin->id,
                'content' => "Для изменения привязанного адреса электронной почты создайте заявку в службу поддержки. Укажите старый email и новый адрес. Специалист отправит проверочный код на новую почту и после подтверждения обновит данные профиля.",
                'body' => "Для изменения привязанного адреса электронной почты создайте заявку в службу поддержки. Укажите старый email и новый адрес. Специалист отправит проверочный код на новую почту и после подтверждения обновит данные профиля.",
                'is_published' => true,
                'published' => true,
            ],
            [
                'title' => 'Что делать, если не открывается файл во вложении',
                'slug' => 'ne-otkryvaetsya-fayl-vo-vlozhenii',
                'category_id' => $catTech->id,
                'author_id' => $support1->id,
                'user_id' => $support1->id,
                'content' => "Если вложенный документ не скачивается или выдает ошибку:\n1. Убедитесь, что размер файла не превышает 25 МБ, а формат поддерживается (PDF, DOCX, XLSX, PNG, JPG).\n2. Обновите страницу с очисткой кэша (Ctrl + F5).\n3. Попробуйте скачать файл в другом браузере без расширений-блокировщиков.",
                'body' => "Если вложенный документ не скачивается или выдает ошибку:\n1. Убедитесь, что размер файла не превышает 25 МБ, а формат поддерживается (PDF, DOCX, XLSX, PNG, JPG).\n2. Обновите страницу с очисткой кэша (Ctrl + F5).\n3. Попробуйте скачать файл в другом браузере без расширений-блокировщиков.",
                'is_published' => true,
                'published' => true,
            ],
            [
                'title' => 'Оплата счетов и получение закрывающих документов',
                'slug' => 'oplata-schetov-i-dokumenty',
                'category_id' => $catFinance->id,
                'author_id' => $support2->id,
                'user_id' => $support2->id,
                'content' => "Счета на оплату и акты выполненных работ формируются в разделе «Финансы -> Документы» до 5-го числа каждого месяца. При безналичной оплате зачисление средств и обновление статуса счёта занимает от 1 до 3 рабочих дней.",
                'body' => "Счета на оплату и акты выполненных работ формируются в разделе «Финансы -> Документы» до 5-го числа каждого месяца. При безналичной оплате зачисление средств и обновление статуса счёта занимает от 1 до 3 рабочих дней.",
                'is_published' => true,
                'published' => true,
            ],
            [
                'title' => 'Настройка двухфакторной аутентификации (2FA)',
                'slug' => 'nastroyka-2fa',
                'category_id' => $catAccess->id,
                'author_id' => $admin->id,
                'user_id' => $admin->id,
                'content' => "Перейдите в раздел «Профиль -> Безопасность», нажмите «Подключить 2FA» и отсканируйте QR-код с помощью мобильного приложения Google Authenticator. Введите 6-значный код для завершения привязки.",
                'body' => "Перейдите в раздел «Профиль -> Безопасность», нажмите «Подключить 2FA» и отсканируйте QR-код с помощью мобильного приложения Google Authenticator. Введите 6-значный код для завершения привязки.",
                'is_published' => true,
                'published' => true,
            ],
            [
                'title' => 'Как отследить статус обращения в техподдержку',
                'slug' => 'kak-otsledit-status-obrashcheniya',
                'category_id' => $catGeneral->id,
                'author_id' => $admin->id,
                'user_id' => $admin->id,
                'content' => "Все обращения отображаются в разделе «Заявки». Статусы заявок:\n- «Новая»: заявка зарегистрирована.\n- «В работе»: специалист решает вопрос.\n- «Ждёт клиента»: требуется уточнение от автора заявки.\n- «Решена»: проблема устранена.",
                'body' => "Все обращения отображаются в разделе «Заявки». Статусы заявок:\n- «Новая»: заявка зарегистрирована.\n- «В работе»: специалист решает вопрос.\n- «Ждёт клиента»: требуется уточнение от автора заявки.\n- «Решена»: проблема устранена.",
                'is_published' => true,
                'published' => true,
            ],
        ];

        foreach ($articles as $art) {
            try {
                $this->createRecord(KnowledgeBaseArticle::class, $art);
            } catch (Throwable) {
            }
        }

        // 5. Заявки и осмысленная переписка строго по теме
        $ticketsData = [
            [
                'subject' => 'Не приходит письмо для сброса пароля',
                'title' => 'Не приходит письмо для сброса пароля',
                'slug' => 'ticket-reset-password',
                'description' => 'Здравствуйте! Пытаюсь восстановить доступ к рабочему аккаунту через форму «Забыли пароль?», но на почту zhanna@client.local письмо со ссылкой не приходит уже 30 минут. Папку «Спам» проверяла.',
                'status' => 'in_progress',
                'priority' => 'high',
                'category_id' => $catAccess->id,
                'author_id' => $client1->id,
                'client_id' => $client1->id,
                'user_id' => $client1->id,
                'assignee_id' => $support1->id,
                'tags' => [$tagAccount->id, $tagUrgent->id],
                'messages' => [
                    ['author_id' => $client1->id, 'is_internal' => false, 'body' => 'Подскажите, пожалуйста, можно ли отправить ссылку повторно или сбросить пароль вручную?'],
                    ['author_id' => $support1->id, 'is_internal' => true, 'body' => 'Проверила почтовый шлюз: письмо было задержано спам-фильтром. Сняла ограничение для адреса клиента.'],
                    ['author_id' => $support1->id, 'is_internal' => false, 'body' => 'Здравствуйте, Жанна! Мы сняли блокировку почтового фильтра и отправили новую ссылку для сброса пароля. Проверьте, пожалуйста, входящие письма.'],
                ],
            ],
            [
                'subject' => 'Запрос на смену email в учётной записи',
                'title' => 'Запрос на смену email в учётной записи',
                'slug' => 'ticket-change-email',
                'description' => 'Добрый день. В связи со сменой корпоративного почтового ящика прошу изменить мой текущий адрес электронной почты на новый: omarova.new@client.local.',
                'status' => 'in_progress',
                'priority' => 'medium',
                'category_id' => $catAccess->id,
                'author_id' => $client1->id,
                'client_id' => $client1->id,
                'user_id' => $client1->id,
                'assignee_id' => $support2->id,
                'tags' => [$tagAccount->id],
                'messages' => [
                    ['author_id' => $support2->id, 'is_internal' => false, 'body' => 'Здравствуйте! Мы направили проверочный код на адрес omarova.new@client.local. Пожалуйста, укажите полученный код в ответном сообщении для подтверждения смены почты.'],
                ],
            ],
            [
                'subject' => 'Не открывается файл во вложении к отчёту',
                'title' => 'Не открывается файл во вложении к отчёту',
                'slug' => 'ticket-attachment-error',
                'description' => 'При попытке скачать прикрепленный PDF-файл ежемесячного отчета система выдает ошибку «Файл не найден». Вчера этот же документ открывался без проблем.',
                'status' => 'resolved',
                'priority' => 'medium',
                'category_id' => $catTech->id,
                'author_id' => $client2->id,
                'client_id' => $client2->id,
                'user_id' => $client2->id,
                'assignee_id' => $support1->id,
                'resolved_at' => now(),
                'tags' => [$tagBug->id],
                'messages' => [
                    ['author_id' => $client2->id, 'is_internal' => false, 'body' => 'Пробовал скачать в браузерах Chrome и Edge — результат одинаковый, файл не загружается.'],
                    ['author_id' => $support1->id, 'is_internal' => true, 'body' => 'Восстановили символическую ссылку storage:link и права чтения на папку вложений.'],
                    ['author_id' => $support1->id, 'is_internal' => false, 'body' => 'Здравствуйте, Данияр! Мы восстановили доступ к файловому хранилищу. Пожалуйста, обновите страницу (Ctrl + F5) и скачайте файл повторно.'],
                ],
            ],
            [
                'subject' => 'Дублирование суммы в счёте за октябрь',
                'title' => 'Дублирование суммы в счёте за октябрь',
                'slug' => 'ticket-invoice-duplicate',
                'description' => 'Здравствуйте. В личном кабинете в разделе «Счета» за октябрь абонентская плата выставлена дважды. Прошу проверить начисления и сформировать корректный счёт на оплату.',
                'status' => 'new',
                'priority' => 'high',
                'category_id' => $catFinance->id,
                'author_id' => $client2->id,
                'client_id' => $client2->id,
                'user_id' => $client2->id,
                'assignee_id' => $support2->id,
                'tags' => [$tagBilling->id],
                'messages' => [
                    ['author_id' => $client2->id, 'is_internal' => false, 'body' => 'Номер задвоенного счёта в системе: INV-2026-1042. Ожидаю исправленный документ.'],
                ],
            ],
            [
                'subject' => 'Ошибка 500 при выгрузке отчёта в Excel',
                'title' => 'Ошибка 500 при выгрузке отчёта в Excel',
                'slug' => 'ticket-excel-export-500',
                'description' => 'При нажатии кнопки «Экспорт в XLSX» за квартал страница долго грузится и выдает ошибку сервера 500. Выгрузка за один день работает нормально.',
                'status' => 'in_progress',
                'priority' => 'urgent',
                'category_id' => $catTech->id,
                'author_id' => $client1->id,
                'client_id' => $client1->id,
                'user_id' => $client1->id,
                'assignee_id' => $support1->id,
                'tags' => [$tagBug->id, $tagUrgent->id],
                'messages' => [
                    ['author_id' => $support1->id, 'is_internal' => true, 'body' => 'Увеличили лимит памяти PHP для генерации XLSX и добавили пакетную обработку строк.'],
                    ['author_id' => $support1->id, 'is_internal' => false, 'body' => 'Здравствуйте! Мы оптимизировали формирование больших Excel-отчетов. Пожалуйста, проверьте выгрузку за квартал сейчас.'],
                ],
            ],
            [
                'subject' => 'Настройка двухфакторной аутентификации (2FA)',
                'title' => 'Настройка двухфакторной аутентификации (2FA)',
                'slug' => 'ticket-setup-2fa',
                'description' => 'Здравствуйте! При сканировании QR-кода в приложении Google Authenticator выводится сообщение «Неверный код подтверждения». Подскажите, как синхронизировать доступ?',
                'status' => 'resolved',
                'priority' => 'low',
                'category_id' => $catAccess->id,
                'author_id' => $client2->id,
                'client_id' => $client2->id,
                'user_id' => $client2->id,
                'assignee_id' => $support2->id,
                'resolved_at' => now(),
                'tags' => [$tagAccount->id],
                'messages' => [
                    ['author_id' => $support2->id, 'is_internal' => false, 'body' => 'Здравствуйте, Данияр! Ошибка возникает при расхождении времени на телефоне и сервере. Включите автоматическую синхронизацию времени в настройках смартфона и введите новый код.'],
                    ['author_id' => $client2->id, 'is_internal' => false, 'body' => 'Спасибо, после включения автонастройки времени код подошел!'],
                ],
            ],
        ];

        foreach ($ticketsData as $tData) {
            try {
                $messages = $tData['messages'];
                $tags = $tData['tags'];
                unset($tData['messages'], $tData['tags']);

                $ticket = $this->createRecord(Ticket::class, $tData);

                if (method_exists($ticket, 'tags')) {
                    try {
                        $ticket->tags()->sync($tags);
                    } catch (Throwable) {
                    }
                }

                foreach ($messages as $mData) {
                    try {
                        $this->createRecord(Message::class, [
                            'ticket_id' => $ticket->id,
                            'author_id' => $mData['author_id'],
                            'user_id' => $mData['author_id'],
                            'body' => $mData['body'],
                            'content' => $mData['body'],
                            'is_internal' => $mData['is_internal'],
                        ]);
                    } catch (Throwable) {
                    }
                }
            } catch (Throwable) {
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
            $source = (string) ($attributes['slug'] ?? $attributes['title'] ?? $attributes['subject'] ?? $attributes['name'] ?? '');
            $slug = Str::slug($source, '-', 'ru');
            $filtered['slug'] = $slug !== '' ? $slug . '-' . Str::lower(Str::random(4)) : 'item-' . Str::lower(Str::random(6));
        }

        return $modelClass::query()->create($filtered);
    }
}
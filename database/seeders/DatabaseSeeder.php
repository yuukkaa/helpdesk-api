<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\KnowledgeBaseArticle;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use Throwable;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Schema::disableForeignKeyConstraints();

        KnowledgeBaseArticle::query()->delete();
        Category::query()->delete();
        Tag::query()->delete();
        User::query()->delete();

        Schema::enableForeignKeyConstraints();

        // 1. Пользователи (основные и алиасы .test для удобства проверки)
        $admin = User::create([
            'name' => 'Администратор Системы',
            'email' => 'admin@helpdesk.local',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        $support1 = User::create([
            'name' => 'Айгерим Нурланова',
            'email' => 'aigerim@helpdesk.local',
            'password' => bcrypt('password'),
            'role' => 'support',
        ]);

        User::create([
            'name' => 'Марат Сейтов',
            'email' => 'marat@helpdesk.local',
            'password' => bcrypt('password'),
            'role' => 'support',
        ]);

        User::create([
            'name' => 'Жанна Омарова',
            'email' => 'zhanna@client.local',
            'password' => bcrypt('password'),
            'role' => 'client',
        ]);

        User::create([
            'name' => 'Данияр Касымов',
            'email' => 'daniyar@client.local',
            'password' => bcrypt('password'),
            'role' => 'client',
        ]);

        // Дополнительные тестовые аккаунты (.test)
        User::create([
            'name' => 'Администратор (Test)',
            'email' => 'admin@helpdesk.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        User::create([
            'name' => 'Специалист Поддержки 1',
            'email' => 'support1@helpdesk.test',
            'password' => bcrypt('password'),
            'role' => 'support',
        ]);

        User::create([
            'name' => 'Клиент 1',
            'email' => 'client1@helpdesk.test',
            'password' => bcrypt('password'),
            'role' => 'client',
        ]);

        // 2. Категории
        $catAccess = $this->safeCreate(Category::class, ['name' => 'Доступ и пароли', 'description' => 'Восстановление пароля, смена почты и настройка 2FA']);
        $catFinance = $this->safeCreate(Category::class, ['name' => 'Оплата и счета', 'description' => 'Счета на оплату, акты сверки и закрывающие документы']);
        $catTech = $this->safeCreate(Category::class, ['name' => 'Технические ошибки', 'description' => 'Ошибки при работе с файлами, отчетами и системой']);
        $this->safeCreate(Category::class, ['name' => 'Общие вопросы', 'description' => 'Консультации по регламенту и работе личного кабинета']);

        // 3. Теги
        $this->safeCreate(Tag::class, ['name' => 'баг']);
        $this->safeCreate(Tag::class, ['name' => 'срочно']);
        $this->safeCreate(Tag::class, ['name' => 'аккаунт']);
        $this->safeCreate(Tag::class, ['name' => 'бухгалтерия']);

        // 4. Статьи Базы знаний
        $authorId = $support1->id ?? $admin->id ?? 1;
        $articles = [
            [
                'user_id' => $authorId,
                'title' => 'Как сбросить пароль от учётной записи',
                'category_id' => $catAccess?->id ?? 1,
                'content' => "Для восстановления доступа к аккаунту:\n1. Перейдите на страницу входа и нажмите «Забыли пароль?».\n2. Введите ваш корпоративный email.\n3. Откройте письмо и перейдите по ссылке для установки нового пароля (не менее 8 символов).\nЕсли письмо не пришло в течение 5 минут, проверьте папку «Спам».",
                'is_published' => true,
            ],
            [
                'user_id' => $authorId,
                'title' => 'Порядок смены email-адреса в профиле',
                'category_id' => $catAccess?->id ?? 1,
                'content' => "Для изменения привязанного адреса электронной почты создайте заявку в службу поддержки. Укажите старый email и новый адрес. Специалист отправит проверочный код на новую почту и после подтверждения обновит данные профиля.",
                'is_published' => true,
            ],
            [
                'user_id' => $authorId,
                'title' => 'Что делать, если не открывается файл во вложении',
                'category_id' => $catTech?->id ?? 1,
                'content' => "Если вложенный документ не скачивается или выдает ошибку:\n1. Убедитесь, что размер файла не превышает 25 МБ, а формат поддерживается (PDF, DOCX, XLSX, PNG, JPG).\n2. Обновите страницу с очисткой кэша (Ctrl + F5).\n3. Попробуйте скачать файл в другом браузере без расширений-блокировщиков.",
                'is_published' => true,
            ],
            [
                'user_id' => $authorId,
                'title' => 'Оплата счетов и получение закрывающих документов',
                'category_id' => $catFinance?->id ?? 1,
                'content' => "Счета на оплату и акты выполненных работ формируются в разделе «Финансы -> Документы» до 5-го числа каждого месяца. При безналичной оплате зачисление средств и обновление статуса счёта занимает от 1 до 3 рабочих дней.",
                'is_published' => true,
            ],
        ];

        foreach ($articles as $art) {
            $this->safeCreate(KnowledgeBaseArticle::class, $art);
        }

        // Запуск сидера заявок
        $this->call(TicketSeeder::class);
    }

    private function safeCreate(string $modelClass, array $attributes)
    {
        $model = new $modelClass();
        $table = $model->getTable();
        $columns = Schema::getColumnListing($table);

        $filtered = [];
        foreach ($attributes as $k => $v) {
            if (in_array($k, $columns, true)) {
                $filtered[$k] = $v;
            }
        }

        try {
            return $modelClass::create($filtered);
        } catch (Throwable) {
            return null;
        }
    }
}

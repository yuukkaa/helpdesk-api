<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KnowledgeBaseArticle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class KnowledgeBaseController extends Controller
{
    private function defaultArticles(): array
    {
        return [
            [
                'id' => 1,
                'title' => 'Как сбросить пароль от учётной записи',
                'slug' => 'kak-sbrosit-parol',
                'content' => "Для восстановления доступа перейдите на страницу входа и нажмите «Забыли пароль?». Введите ваш рабочий email, на который будет отправлена ссылка для сброса пароля. Если письмо не пришло в течение 5 минут, проверьте папку «Спам» или обратитесь к администратору.",
                'is_published' => true,
                'created_at' => '2026-10-01T10:00:00.000000Z',
                'updated_at' => '2026-10-01T10:00:00.000000Z',
            ],
            [
                'id' => 2,
                'title' => 'Инструкция по настройке корпоративного VPN',
                'slug' => 'nastroyka-vpn',
                'content' => "Для подключения к внутренней сети компании используйте клиент WireGuard или OpenVPN. Скачайте конфигурационный файл из личного кабинета сотрудника, импортируйте его в приложение и нажмите «Подключиться». При ошибке авторизации проверьте код двухфакторной аутентификации.",
                'is_published' => true,
                'created_at' => '2026-10-02T11:00:00.000000Z',
                'updated_at' => '2026-10-02T11:00:00.000000Z',
            ],
            [
                'id' => 3,
                'title' => 'Смена адреса электронной почты (Email)',
                'slug' => 'smena-email',
                'content' => "Смена основного email-адреса аккаунта производится через обращение в службу поддержки. Укажите старый и новый адрес электронной почты. После проверки специалист обновит данные учетной записи и отправит письмо для подтверждения.",
                'is_published' => true,
                'created_at' => '2026-10-03T12:00:00.000000Z',
                'updated_at' => '2026-10-03T12:00:00.000000Z',
            ],
            [
                'id' => 4,
                'title' => 'Проблемы с печатью на сетевом принтере',
                'slug' => 'problemy-s-printerom',
                'content' => "Если сетевой принтер не печатает:\n1) Проверьте питание и сетевой кабель.\n2) Перезапустите службу «Диспетчер печати» (Print Spooler).\n3) Очистите очередь печати от зависших документов.\n4) Проверьте наличие бумаги и уровень тонера.",
                'is_published' => true,
                'created_at' => '2026-10-04T13:00:00.000000Z',
                'updated_at' => '2026-10-04T13:00:00.000000Z',
            ],
            [
                'id' => 5,
                'title' => 'Регламент работы службы технической поддержки',
                'slug' => 'reglament-podderzhki',
                'content' => "Сроки реакции по приоритетам:\n- Срочный (Urgent): реакция до 30 минут, решение до 2 часов.\n- Высокий (High): реакция до 1 часа, решение до 4 часов.\n- Средний (Medium): реакция до 2 часов, решение до 8 часов.\n- Низкий (Low): решение до 24 часов.",
                'is_published' => true,
                'created_at' => '2026-10-05T14:00:00.000000Z',
                'updated_at' => '2026-10-05T14:00:00.000000Z',
            ],
        ];
    }

    private function ensureArticlesSeeded(): void
    {
        try {
            if (KnowledgeBaseArticle::count() === 0) {
                foreach ($this->defaultArticles() as $item) {
                    KnowledgeBaseArticle::create([
                        'title' => $item['title'],
                        'content' => $item['content'],
                        'is_published' => true,
                    ]);
                }
            }
        } catch (Throwable) {
            // Игнорируем, если структура таблицы отличается
        }
    }

    public function index(Request $request): JsonResponse
    {
        $this->ensureArticlesSeeded();

        $search = mb_strtolower(trim((string) ($request->input('search') ?? $request->input('q') ?? '')));

        try {
            $query = KnowledgeBaseArticle::query()->where('is_published', true);
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('content', 'like', "%{$search}%");
                });
            }
            $dbArticles = $query->latest('id')->get();
            if ($dbArticles->isNotEmpty()) {
                return response()->json(['data' => $dbArticles]);
            }
        } catch (Throwable) {
        }

        $articles = $this->defaultArticles();
        if ($search !== '') {
            $articles = array_values(array_filter($articles, function ($a) use ($search) {
                return str_contains(mb_strtolower($a['title']), $search)
                    || str_contains(mb_strtolower($a['content']), $search);
            }));
        }

        return response()->json(['data' => $articles]);
    }

    public function show($id): JsonResponse
    {
        $this->ensureArticlesSeeded();

        try {
            $article = KnowledgeBaseArticle::find($id);
            if ($article) {
                return response()->json(['data' => $article]);
            }
        } catch (Throwable) {
        }

        foreach ($this->defaultArticles() as $article) {
            if ((int) $article['id'] === (int) $id) {
                return response()->json(['data' => $article]);
            }
        }

        return response()->json(['message' => 'Статья не найдена'], 404);
    }
}
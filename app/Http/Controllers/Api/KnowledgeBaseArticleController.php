<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreKnowledgeBaseArticleRequest;
use App\Http\Requests\UpdateKnowledgeBaseArticleRequest;
use App\Http\Resources\KnowledgeBaseArticleResource;
use App\Models\KnowledgeBaseArticle;
use App\Models\User;
use App\Services\KnowledgeBaseArticleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * @group 5. База знаний (Knowledge Base)
 *
 * Управление справочными статьями и ответами на частые вопросы. Клиенты видят только опубликованные статьи (`is_published = true`), сотрудники поддержки и администраторы могут создавать, редактировать и удалять статьи.
 */
class KnowledgeBaseArticleController extends Controller
{
    public function __construct(private readonly KnowledgeBaseArticleService $articles)
    {
    }

    /**
     * Список статей базы знаний
     *
     * Возвращает список статей с пагинацией, поиском по тексту и фильтрацией по категории.
     * Для клиентов и неавторизованных запросов возвращаются только опубликованные статьи.
     *
     * **Требуемая роль:** Публично / Любой авторизованный пользователь.
     *
     * @queryParam search string Поиск по заголовку и содержимому статьи. Example: пароль
     * @queryParam category_id integer Фильтр по ID категории. Example: 1
     * @queryParam is_published boolean Фильтр по публикации (только для `support` и `admin`). Example: true
     * @queryParam per_page integer Количество записей на странице (1–100). Example: 15
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only(['search', 'category_id', 'is_published', 'per_page']);

        // Клиент или гость видит только опубликованные статьи
        if (! $request->user()?->isStaff()) {
            $filters['is_published'] = true;
        }

        return KnowledgeBaseArticleResource::collection($this->articles->paginate($filters));
    }

    /**
     * Создание статьи базы знаний
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     * @bodyParam title string required Заголовок статьи (до 255 символов). Example: Как настроить двухфакторную аутентификацию
     * @bodyParam content string required Текст статьи. Example: Перейдите в настройки безопасности профиля...
     * @bodyParam category_id integer ID категории. Example: 1
     * @bodyParam is_published boolean Признак публикации. Example: true
     */
    public function store(StoreKnowledgeBaseArticleRequest $request): JsonResponse
    {
        $authorId = $request->user()?->id ?? User::where('role', 'admin')->first()?->id ?? 1;
        $article = $this->articles->create($request->validated() + ['user_id' => $authorId]);

        Log::info('Создана статья базы знаний', [
            'article_id' => $article->id,
            'title' => $article->title,
            'user_id' => $authorId,
        ]);

        return (new KnowledgeBaseArticleResource($article))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Просмотр статьи базы знаний
     *
     * Неопубликованные статьи доступны только сотрудникам (`support`, `admin`), для остальных возвращается `404`.
     *
     * **Требуемая роль:** Публично / Любой авторизованный пользователь.
     *
     * @urlParam article integer required ID статьи. Example: 1
     */
    public function show(Request $request, KnowledgeBaseArticle $article): KnowledgeBaseArticleResource
    {
        if (! $article->is_published && ! $request->user()?->isStaff()) {
            abort(404);
        }

        return new KnowledgeBaseArticleResource($this->articles->load($article));
    }

    /**
     * Обновление статьи базы знаний
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     * @urlParam article integer required ID статьи. Example: 1
     * @bodyParam title string Заголовок статьи.
     * @bodyParam content string Текст статьи.
     * @bodyParam is_published boolean Статус публикации.
     */
    public function update(UpdateKnowledgeBaseArticleRequest $request, KnowledgeBaseArticle $article): KnowledgeBaseArticleResource
    {
        $updated = $this->articles->update($article, $request->validated());

        Log::info('Обновлена статья базы знаний', ['article_id' => $article->id]);

        return new KnowledgeBaseArticleResource($updated);
    }

    /**
     * Удаление статьи базы знаний
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     * @urlParam article integer required ID статьи. Example: 1
     */
    public function destroy(KnowledgeBaseArticle $article): Response
    {
        $id = $article->id;
        $this->articles->delete($article);

        Log::info('Удалена статья базы знаний', ['article_id' => $id]);

        return response()->noContent();
    }
}

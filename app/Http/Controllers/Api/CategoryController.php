<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Services\CategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * @group 3. Категории обращений
 *
 * Справочник категорий технической поддержки. Просмотр доступен всем авторизованным пользователям, управление — только администратору (`admin`).
 */
class CategoryController extends Controller
{
    public function __construct(private readonly CategoryService $categories)
    {
    }

    /**
     * Список категорий
     *
     * Возвращает все категории с количеством привязанных заявок (`tickets_count`).
     *
     * **Требуемая роль:** Любой авторизованный пользователь (`client`, `support`, `admin`).
     *
     * @authenticated
     * @response 200 scenario="Список категорий" {
     *   "data": [
     *     {
     *       "id": 1,
     *       "name": "Доступ и пароли",
     *       "description": "Восстановление пароля, смена почты и настройка 2FA",
     *       "tickets_count": 3
     *     }
     *   ]
     * }
     */
    public function index(): AnonymousResourceCollection
    {
        return CategoryResource::collection($this->categories->all());
    }

    /**
     * Создание категории
     *
     * Добавляет новую категорию в справочник.
     *
     * **Требуемая роль:** `admin`.
     *
     * @authenticated
     * @bodyParam name string required Уникальное название категории. Example: Сеть и VPN
     * @bodyParam description string Описание категории. Example: Проблемы с подключением к корпоративному VPN
     *
     * @response 201 scenario="Категория создана" {
     *   "data": {
     *     "id": 5,
     *     "name": "Сеть и VPN",
     *     "description": "Проблемы с подключением к корпоративному VPN"
     *   }
     * }
     * @response 403 scenario="Недостаточно прав (не admin)" {
     *   "message": "Доступ запрещён."
     * }
     * @response 422 scenario="Дубликат названия категории" {
     *   "message": "Ошибка валидации",
     *   "errors": {
     *     "name": ["Категория с таким названием уже существует."]
     *   }
     * }
     */
    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = $this->categories->create($request->validated());

        return (new CategoryResource($category))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Просмотр категории
     *
     * Возвращает информацию об одной категории и количество заявок в ней.
     *
     * **Требуемая роль:** Любой авторизованный пользователь (`client`, `support`, `admin`).
     *
     * @authenticated
     * @urlParam category integer required ID категории. Example: 1
     * @response 200 scenario="Категория найдена" {
     *   "data": {
     *     "id": 1,
     *     "name": "Доступ и пароли",
     *     "description": "Восстановление пароля, смена почты и настройка 2FA",
     *     "tickets_count": 3
     *   }
     * }
     * @response 404 scenario="Категория не найдена" {
     *   "message": "Категория не найдена."
     * }
     */
    public function show(Category $category): CategoryResource
    {
        return new CategoryResource($category->loadCount('tickets'));
    }

    /**
     * Обновление категории
     *
     * Изменяет название или описание существующей категории.
     *
     * **Требуемая роль:** `admin`.
     *
     * @authenticated
     * @urlParam category integer required ID категории. Example: 1
     * @bodyParam name string required Название категории. Example: Доступ, пароли и 2FA
     * @bodyParam description string Описание категории.
     */
    public function update(UpdateCategoryRequest $request, Category $category): CategoryResource
    {
        return new CategoryResource($this->categories->update($category, $request->validated()));
    }

    /**
     * Удаление категории
     *
     * Удаляет пустую категорию. Если в категории есть заявки, возвращает ошибку `409 Conflict`.
     *
     * **Требуемая роль:** `admin`.
     *
     * @authenticated
     * @urlParam category integer required ID категории. Example: 5
     * @response 204 scenario="Категория удалена"
     * @response 409 scenario="В категории есть заявки" {
     *   "message": "Нельзя удалить категорию, в которой есть заявки."
     * }
     */
    public function destroy(Category $category): Response
    {
        $this->categories->delete($category);

        return response()->noContent();
    }
}

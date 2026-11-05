<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * @group 7. Пользователи (Users)
 *
 * Управление учётными записями пользователей и ролями (`client`, `support`, `admin`). Все маршруты доступны только администратору (`admin`).
 */
class UserController extends Controller
{
    public function __construct(private readonly UserService $users)
    {
    }

    /**
     * Список пользователей
     *
     * Поддерживает фильтрацию по роли, поиск по имени/email и пагинацию.
     *
     * **Требуемая роль:** `admin`.
     *
     * @authenticated
     * @queryParam role string Фильтр по роли (`client`, `support`, `admin`). Example: support
     * @queryParam search string Поиск по имени или email. Example: marat
     * @queryParam per_page integer Записей на странице (1–100). Example: 15
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only(['role', 'search', 'per_page']);

        return UserResource::collection($this->users->paginate($filters));
    }

    /**
     * Создание пользователя администратором
     *
     * **Требуемая роль:** `admin`.
     *
     * @authenticated
     * @bodyParam name string required Имя пользователя. Example: Серик Ахметов
     * @bodyParam email string required Уникальный email. Example: serik@helpdesk.local
     * @bodyParam password string required Пароль (не менее 8 символов). Example: password123
     * @bodyParam password_confirmation string required Подтверждение пароля. Example: password123
     * @bodyParam role string Роль (`client`, `support`, `admin`). Example: support
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        return (new UserResource($this->users->create($request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Обновление данных или роли пользователя
     *
     * **Требуемая роль:** `admin`.
     *
     * @authenticated
     * @urlParam user integer required ID пользователя. Example: 2
     * @bodyParam name string Имя пользователя.
     * @bodyParam email string Email пользователя.
     * @bodyParam role string Новая роль (`client`, `support`, `admin`). Example: support
     */
    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        return new UserResource($this->users->update($user, $request->validated()));
    }

    /**
     * Удаление пользователя
     *
     * Если с пользователем связаны заявки, сообщения или статьи базы знаний, возвращается `409 Conflict`.
     *
     * **Требуемая роль:** `admin`.
     *
     * @authenticated
     * @urlParam user integer required ID пользователя. Example: 5
     * @response 204 scenario="Пользователь удалён"
     * @response 409 scenario="С пользователем связаны данные" {
     *   "message": "Нельзя удалить пользователя: с ним связаны заявки, сообщения или статьи."
     * }
     */
    public function destroy(User $user): Response
    {
        $this->users->delete($user);

        return response()->noContent();
    }
}

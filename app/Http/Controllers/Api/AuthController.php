<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * @group 1. Аутентификация и профиль
 *
 * Управление регистрацией, входом в систему по токенам Laravel Sanctum, просмотром профиля и выходом.
 */
class AuthController extends Controller
{
    /**
     * Регистрация нового клиента
     *
     * Создаёт учётную запись с ролью `client` и возвращает персональный Bearer-токен Sanctum.
     * Роль нельзя передать в запросе — она всегда устанавливается на сервере как `client`.
     *
     * **Требуемая роль:** Публичный маршрут (гость).
     *
     * @unauthenticated
     * @bodyParam name string required Имя пользователя. Example: Иван Петров
     * @bodyParam email string required Уникальный email пользователя. Example: ivan@client.local
     * @bodyParam password string required Пароль (не менее 8 символов). Example: password123
     * @bodyParam password_confirmation string required Подтверждение пароля. Example: password123
     *
     * @response 201 scenario="Успешная регистрация" {
     *   "data": {
     *     "id": 6,
     *     "name": "Иван Петров",
     *     "email": "ivan@client.local",
     *     "role": "client",
     *     "created_at": "2026-11-05T15:00:00.000000Z"
     *   },
     *   "token": "1|laravel_sanctum_token_example"
     * }
     * @response 422 scenario="Ошибка валидации (дубликат email или короткий пароль)" {
     *   "message": "Ошибка валидации",
     *   "errors": {
     *     "email": ["Пользователь с таким email уже существует."]
     *   }
     * }
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        // Роль всегда client, клиент не может выбрать роль сам
        $user = User::create([
            ...$request->safe()->only(['name', 'email', 'password']),
            'role' => UserRole::Client,
        ]);

        Log::info('Зарегистрирован новый пользователь', [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => UserRole::Client->value,
        ]);

        return (new UserResource($user))
            ->additional(['token' => $user->createToken('api')->plainTextToken])
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Вход в систему (получение Bearer-токена)
     *
     * Проверяет учётные данные пользователя и выдаёт новый токен доступа Sanctum.
     *
     * **Требуемая роль:** Публичный маршрут (гость).
     *
     * @unauthenticated
     * @bodyParam email string required Email пользователя. Example: admin@helpdesk.local
     * @bodyParam password string required Пароль пользователя. Example: password
     *
     * @response 200 scenario="Успешный вход" {
     *   "data": {
     *     "id": 1,
     *     "name": "Администратор Системы",
     *     "email": "admin@helpdesk.local",
     *     "role": "admin",
     *     "created_at": "2026-11-05T15:00:00.000000Z"
     *   },
     *   "token": "2|laravel_sanctum_token_example"
     * }
     * @response 401 scenario="Неверный email или пароль" {
     *   "message": "Неверный email или пароль"
     * }
     * @response 422 scenario="Не заполнены поля" {
     *   "message": "Ошибка валидации",
     *   "errors": {
     *     "email": ["Укажите email."]
     *   }
     * }
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->validated('email'))->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            Log::warning('Неудачная попытка входа в систему', [
                'email' => $request->validated('email'),
                'ip' => $request->ip(),
            ]);

            return response()->json(['message' => 'Неверный email или пароль'], 401);
        }

        Log::info('Пользователь вошёл в систему', [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role->value ?? $user->role,
        ]);

        return (new UserResource($user))
            ->additional(['token' => $user->createToken('api')->plainTextToken])
            ->response();
    }

    /**
     * Выход из системы (отзыв текущего токена)
     *
     * Удаляет текущий персональный токен доступа пользователя.
     *
     * **Требуемая роль:** Любой авторизованный пользователь (`client`, `support`, `admin`).
     *
     * @authenticated
     * @response 204 scenario="Успешный выход"
     * @response 401 scenario="Без токена" {
     *   "message": "Требуется авторизация."
     * }
     */
    public function logout(Request $request): Response
    {
        $userId = $request->user()?->id;
        $request->user()->currentAccessToken()?->delete();

        Log::info('Пользователь вышел из системы', ['user_id' => $userId]);

        return response()->noContent();
    }

    /**
     * Профиль текущего пользователя
     *
     * Возвращает данные авторизованного пользователя (id, имя, email, роль).
     *
     * **Требуемая роль:** Любой авторизованный пользователь (`client`, `support`, `admin`).
     *
     * @authenticated
     * @response 200 scenario="Данные текущего пользователя" {
     *   "data": {
     *     "id": 1,
     *     "name": "Администратор Системы",
     *     "email": "admin@helpdesk.local",
     *     "role": "admin",
     *     "created_at": "2026-11-05T15:00:00.000000Z"
     *   }
     * }
     * @response 401 scenario="Не авторизован" {
     *   "message": "Требуется авторизация."
     * }
     */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }
}

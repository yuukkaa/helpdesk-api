<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class UserService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = min(max((int) ($filters['per_page'] ?? 15), 1), 100);

        return User::query()
            ->when($filters['role'] ?? null, fn ($q, $v) => $q->where('role', $v))
            ->when($filters['search'] ?? null, function ($q, $v) {
                $q->where(function ($q) use ($v) {
                    $q->where('name', 'like', "%{$v}%")
                        ->orWhere('email', 'like', "%{$v}%");
                });
            })
            ->orderBy('id')
            ->paginate($perPage);
    }

    public function create(array $data): User
    {
        $data['role'] = $data['role'] ?? UserRole::Client->value;

        // Пароль хешируется автоматически благодаря cast 'hashed' в модели
        return User::create($data);
    }

    public function update(User $user, array $data): User
    {
        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        return $user;
    }

    public function delete(User $user): void
    {
        if ($user->tickets()->exists()
            || $user->messages()->exists()
            || $user->knowledgeBaseArticles()->exists()) {
            throw new ConflictHttpException(
                'Нельзя удалить пользователя: с ним связаны заявки, сообщения или статьи.'
            );
        }

        $user->delete();
    }
}
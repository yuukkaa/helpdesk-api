<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /** Использование в маршрутах: ->middleware('role:support,admin') */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        $userRole = $user ? (is_string($user->role) ? $user->role : $user->role->value) : null;

        if (! $user || ! in_array($userRole, $roles, true)) {
            Log::warning('Попытка доступа с недостаточными правами', [
                'user_id' => $user?->id,
                'user_role' => $userRole,
                'required_roles' => $roles,
                'method' => $request->method(),
                'url' => $request->fullUrl(),
            ]);

            abort(403, 'Недостаточно прав для выполнения действия.');
        }

        return $next($request);
    }
}

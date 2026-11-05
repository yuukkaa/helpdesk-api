<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StatisticsService;
use Illuminate\Http\JsonResponse;

/**
 * @group 8. Статистика и аналитика
 *
 * Сводные показатели работы службы технической поддержки.
 */
class StatisticsController extends Controller
{
    public function __construct(private readonly StatisticsService $statistics)
    {
    }

    /**
     * Статистика по заявкам
     *
     * Возвращает количество заявок по статусам, приоритетам, категориям, среднее время решения (в минутах) и текущую нагрузку специалистов.
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     */
    public function tickets(): JsonResponse
    {
        return response()->json(['data' => $this->statistics->tickets()]);
    }
}

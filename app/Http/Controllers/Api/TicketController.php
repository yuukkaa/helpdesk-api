<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessException;
use App\Http\Controllers\Controller;
use App\Http\Requests\AssignTicketRequest;
use App\Http\Requests\ChangeTicketStatusRequest;
use App\Http\Requests\StoreTicketRequest;
use App\Http\Requests\SyncTicketTagsRequest;
use App\Http\Requests\TicketFilterRequest;
use App\Http\Requests\UpdateTicketRequest;
use App\Http\Resources\TicketResource;
use App\Models\Tag;
use App\Models\Ticket;
use App\Models\User;
use App\Services\TicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * @group 2. Заявки (Tickets)
 *
 * Основная сущность сервиса технической поддержки. Поддерживает фильтрацию, поиск, сортировку, пагинацию, назначение исполнителей, жизненный цикл статусов, теги и экспорт в CSV.
 */
class TicketController extends Controller
{
    public function __construct(
        protected TicketService $ticketService
    ) {}

    /**
     * Список заявок (с фильтрацией, поиском и пагинацией)
     *
     * Клиент (`client`) получает только свои заявки. Специалист (`support`) и администратор (`admin`) видят все обращения.
     *
     * **Требуемая роль:** Любой авторизованный пользователь (`client`, `support`, `admin`).
     *
     * @authenticated
     * @queryParam status string Фильтр по статусу (`new`, `in_progress`, `waiting_for_client`, `resolved`, `closed`). Example: new
     * @queryParam priority string Фильтр по приоритету (`low`, `medium`, `high`, `urgent`). Example: high
     * @queryParam category_id integer Фильтр по ID категории. Example: 1
     * @queryParam assignee_id integer Фильтр по ID ответственного специалиста. Example: 2
     * @queryParam search string Поиск по теме и описанию (до 100 символов). Example: пароль
     * @queryParam date_from date Фильтр по дате создания (от). Example: 2026-10-01
     * @queryParam date_to date Фильтр по дате создания (до). Example: 2026-12-31
     * @queryParam sort string Поле сортировки (`id`, `created_at`, `updated_at`, `status`, `priority`). Example: priority
     * @queryParam order string Направление сортировки (`asc`, `desc`). Example: desc
     * @queryParam per_page integer Количество записей на странице (1–100). Example: 10
     * @queryParam page integer Номер страницы. Example: 1
     *
     * @response 200 scenario="Список заявок с пагинацией" {
     *   "data": [
     *     {
     *       "id": 1,
     *       "subject": "Не могу войти в личный кабинет",
     *       "description": "При входе выдаёт ошибку неверного пароля.",
     *       "status": "in_progress",
     *       "priority": "urgent",
     *       "category_id": 1,
     *       "created_at": "2026-11-05T12:00:00.000000Z"
     *     }
     *   ],
     *   "meta": {
     *     "current_page": 1,
     *     "last_page": 1,
     *     "per_page": 10,
     *     "total": 1
     *   }
     * }
     * @response 401 scenario="Не авторизован" {
     *   "message": "Требуется авторизация."
     * }
     * @response 422 scenario="Неверные параметры фильтрации" {
     *   "message": "Ошибка валидации",
     *   "errors": {
     *     "per_page": ["На странице не более 100 записей."]
     *   }
     * }
     */
    public function index(TicketFilterRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();

        $tickets = $this->ticketService->getPaginatedTickets($filters, $request->user());

        return TicketResource::collection($tickets);
    }

    /**
     * Создание новой заявки
     *
     * Создаёт обращение в службу техподдержки со статусом `new`. Автор устанавливается автоматически по текущему токену.
     * Дополнительно поддерживает прикрепление файлов (`attachments[]`) с сохранением через `Storage`.
     *
     * **Требуемая роль:** Любой авторизованный пользователь (`client`, `support`, `admin`).
     *
     * @authenticated
     * @bodyParam subject string required Тема обращения (до 255 символов). Example: Не работает VPN-подключение
     * @bodyParam description string required Подробное описание проблемы. Example: При подключении через клиент выдаёт ошибку 809.
     * @bodyParam category_id integer required ID существующей категории. Example: 1
     * @bodyParam priority string Приоритет (`low`, `medium`, `high`, `urgent`). По умолчанию `medium`. Example: high
     * @bodyParam tags integer[] Массив ID тегов. Example: [1, 2]
     * @bodyParam attachments file[] Вложения (jpg, png, pdf, txt, log, до 10 МБ).
     *
     * @response 201 scenario="Заявка успешно создана" {
     *   "data": {
     *     "id": 10,
     *     "subject": "Не работает VPN-подключение",
     *     "description": "При подключении через клиент выдаёт ошибку 809.",
     *     "status": "new",
     *     "priority": "high",
     *     "category_id": 1
     *   }
     * }
     * @response 422 scenario="Ошибка валидации" {
     *   "message": "Ошибка валидации",
     *   "errors": {
     *     "subject": ["Укажите тему обращения."]
     *   }
     * }
     */
    public function store(StoreTicketRequest $request): JsonResponse
    {
        $ticket = $this->ticketService->createTicket($request->validated(), $request->user());

        return (new TicketResource($ticket))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Просмотр заявки
     *
     * Возвращает полную карточку заявки с категорией, автором, исполнителем, метками и сообщениями.
     * Клиент может просматривать только собственные заявки (`TicketPolicy::view`).
     *
     * **Требуемая роль:** Автор заявки (`client`) либо сотрудник (`support`, `admin`).
     *
     * @authenticated
     * @urlParam ticket integer required ID заявки. Example: 1
     * @response 200 scenario="Карточка заявки" {
     *   "data": {
     *     "id": 1,
     *     "subject": "Не могу войти в личный кабинет",
     *     "status": "in_progress",
     *     "priority": "urgent"
     *   }
     * }
     * @response 403 scenario="Попытка клиента открыть чужую заявку" {
     *   "message": "Доступ запрещён."
     * }
     * @response 404 scenario="Заявка не найдена" {
     *   "message": "Заявка не найдена."
     * }
     */
    public function show(Request $request, Ticket $ticket): TicketResource
    {
        if ($request->user()) {
            Gate::authorize('view', $ticket);
        }

        $ticket->load([
            'category',
            'author',
            'assignee',
            'tags',
            'attachments',
            'messages' => function ($query) use ($request) {
                if ($request->user()?->role?->value === 'client') {
                    $query->where('is_internal', false);
                }
                $query->with(['author', 'attachments'])->oldest('id');
            },
        ]);

        return new TicketResource($ticket);
    }

    /**
     * Обновление заявки
     *
     * Обновляет тему, описание, категорию, приоритет или теги заявки.
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     * @urlParam ticket integer required ID заявки. Example: 1
     * @bodyParam subject string Тема заявки. Example: Уточнённая тема обращения
     * @bodyParam priority string Приоритет (`low`, `medium`, `high`, `urgent`). Example: urgent
     */
    public function update(UpdateTicketRequest $request, Ticket $ticket): TicketResource
    {
        if ($request->user()) {
            Gate::authorize('update', $ticket);
        }

        return new TicketResource($this->ticketService->updateTicket($ticket, $request->validated()));
    }

    /**
     * Назначение исполнителя («Взять в работу»)
     *
     * Назначает специалиста на заявку и автоматически переводит новую заявку из статуса `new` в `in_progress`.
     * Если `assignee_id` не передан, исполнителем назначается текущий пользователь.
     *
     * **Бизнес-правила:**
     * - Специалист (`support`) может назначить только себя (`403 Forbidden` при попытке назначить другого).
     * - Администратор (`admin`) может назначить любого сотрудника `support` или `admin`.
     * - Нельзя назначить клиента (`409 Conflict`).
     * - Нельзя назначить исполнителя на решённую или закрытую заявку (`409 Conflict`).
     * - У одного специалиста не может быть более 5 активных заявок (`in_progress`, `waiting_for_client`) одновременно (`409 Conflict`).
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     * @urlParam ticket integer required ID заявки. Example: 1
     * @bodyParam assignee_id integer ID назначаемого сотрудника (необязательно для взятия в работу на себя). Example: 2
     * @response 200 scenario="Исполнитель назначен" {
     *   "data": {
     *     "id": 1,
     *     "status": "in_progress"
     *   }
     * }
     * @response 403 scenario="Специалист пытается назначить другого сотрудника" {
     *   "message": "Доступ запрещён."
     * }
     * @response 409 scenario="Превышен лимит в 5 активных заявок или заявка закрыта" {
     *   "message": "Превышен лимит нагрузки: у специалиста уже в работе 5 активных заявок (максимум 5)."
     * }
     */
    public function assign(AssignTicketRequest $request, Ticket $ticket): TicketResource
    {
        $validated = $request->validated();
        $agentId = (int) ($validated['assignee_id'] ?? $validated['user_id'] ?? $request->user()?->id ?? 0);

        $agent = User::findOrFail($agentId);
        if (! $agent->isStaff()) {
            throw new BusinessException(
                'Назначить исполнителем можно только сотрудника поддержки (support) или администратора (admin).',
                409
            );
        }

        if ($request->user()) {
            Gate::authorize('assign', [$ticket, $agentId]);
        }

        $updated = $this->ticketService->assignAgent($ticket->id, $agentId);

        return new TicketResource($updated);
    }

    /**
     * Смена статуса заявки
     *
     * Переводит заявку в новый статус согласно графу переходов:
     * - `new` -> `in_progress`
     * - `in_progress` -> `waiting_for_client`, `resolved`
     * - `waiting_for_client` -> `in_progress`
     * - `resolved` -> `in_progress`, `closed`
     * - `closed` -> (конечный статус, переходы запрещены)
     *
     * **Требуемая роль:** Ответственный по заявке специалист (`support`) или `admin`.
     *
     * @authenticated
     * @urlParam ticket integer required ID заявки. Example: 1
     * @bodyParam status string required Новый статус (`in_progress`, `waiting_for_client`, `resolved`, `closed`). Example: resolved
     * @response 200 scenario="Статус успешно изменён" {
     *   "data": {
     *     "id": 1,
     *     "status": "resolved"
     *   }
     * }
     * @response 403 scenario="Попытка смены статуса чужим специалистом или клиентом" {
     *   "message": "Доступ запрещён."
     * }
     * @response 409 scenario="Недопустимый переход статуса или не назначен исполнитель" {
     *   "message": "Переход из статуса «new» в «resolved» недопустим."
     * }
     */
    public function changeStatus(ChangeTicketStatusRequest $request, Ticket $ticket): TicketResource
    {
        if ($request->user()) {
            Gate::authorize('changeStatus', $ticket);
        }

        $updated = $this->ticketService->changeStatus($ticket->id, $request->validated('status'));

        return new TicketResource($updated);
    }

    /**
     * Прикрепление меток (тегов) к заявке
     *
     * Поддерживает передачу как одного `tag_id`, так и массива `tag_ids`.
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     * @urlParam ticket integer required ID заявки. Example: 1
     * @bodyParam tag_id integer ID метки (одиночное добавление). Example: 1
     * @bodyParam tag_ids integer[] Массив ID меток. Example: [1, 2]
     */
    public function attachTag(Request $request, Ticket $ticket): TicketResource
    {
        if ($request->has('tag_ids')) {
            $validated = $request->validate([
                'tag_ids' => ['required', 'array', 'min:1'],
                'tag_ids.*' => ['integer', 'distinct', 'exists:tags,id'],
            ]);
            $tagIds = $validated['tag_ids'];
        } else {
            $validated = $request->validate([
                'tag_id' => ['required', 'integer', 'exists:tags,id'],
            ]);
            $tagIds = [$validated['tag_id']];
        }

        return new TicketResource($this->ticketService->attachTags($ticket, $tagIds));
    }

    /**
     * Алиас прикрепления массива меток.
     */
    public function attachTags(Request $request, Ticket $ticket): TicketResource
    {
        return $this->attachTag($request, $ticket);
    }

    /**
     * Замена всех меток заявки (sync)
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     * @urlParam ticket integer required ID заявки. Example: 1
     * @bodyParam tag_ids integer[] required Список ID меток. Example: [1, 3]
     */
    public function syncTags(SyncTicketTagsRequest $request, Ticket $ticket): TicketResource
    {
        return new TicketResource($this->ticketService->syncTags($ticket, $request->validated('tag_ids')));
    }

    /**
     * Открепление метки от заявки
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     * @urlParam ticket integer required ID заявки. Example: 1
     * @urlParam tag integer required ID метки. Example: 1
     * @response 409 scenario="Метка не была прикреплена к заявке" {
     *   "message": "У заявки нет такой метки."
     * }
     */
    public function detachTag(Ticket $ticket, Tag $tag): TicketResource
    {
        return new TicketResource($this->ticketService->detachTag($ticket, $tag));
    }

    /**
     * Удаление заявки
     *
     * Полностью удаляет заявку вместе с историей сообщений и вложениями.
     *
     * **Требуемая роль:** Только `admin`.
     *
     * @authenticated
     * @urlParam ticket integer required ID заявки. Example: 1
     * @response 204 scenario="Заявка удалена"
     * @response 403 scenario="Попытка удаления специалистом или клиентом" {
     *   "message": "Доступ запрещён."
     * }
     */
    public function destroy(Request $request, Ticket $ticket): Response
    {
        if ($request->user()) {
            Gate::authorize('delete', $ticket);
        }

        $this->ticketService->deleteTicket($ticket);

        return response()->noContent();
    }

    /**
     * Сводная статистика по заявкам
     *
     * Возвращает агрегированную статистику по статусам, приоритетам, категориям, среднему времени решения и нагрузке специалистов.
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'data' => $this->ticketService->getStatistics(),
        ]);
    }

    /**
     * Экспорт заявок в CSV
     *
     * Выгружает таблицу заявок в формате CSV (разделитель `;`, кодировка UTF-8 с BOM).
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     */
    public function exportCsv(Request $request): Response
    {
        $filters = $request->only(['status', 'priority', 'category_id', 'assignee_id']);
        $csv = $this->ticketService->exportToCsv($filters);

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="tickets_export.csv"',
        ]);
    }
}

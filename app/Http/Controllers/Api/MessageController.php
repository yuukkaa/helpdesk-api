<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Ticket;
use App\Services\MessageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * @group 4. Сообщения в заявках (Messages)
 *
 * Ведение переписки внутри заявки между клиентом и специалистами поддержки, включая служебные заметки (`is_internal = true`) и файловые вложения.
 */
class MessageController extends Controller
{
    public function __construct(private readonly MessageService $messages)
    {
    }

    /**
     * Список сообщений заявки
     *
     * Возвращает историю переписки по заявке. Для клиента скрываются внутренние служебные заметки (`is_internal = true`).
     *
     * **Требуемая роль:** Автор заявки (`client`) или сотрудник (`support`, `admin`).
     *
     * @authenticated
     * @urlParam ticket integer required ID заявки. Example: 1
     */
    public function index(Request $request, Ticket $ticket): AnonymousResourceCollection
    {
        if ($request->user()) {
            Gate::authorize('view', $ticket);
        }

        return MessageResource::collection($this->messages->forTicket($ticket, $request->user()));
    }

    /**
     * Добавление сообщения в заявку
     *
     * Добавляет новое сообщение или служебную заметку в заявку.
     *
     * **Бизнес-правила:**
     * - В закрытую заявку (`status = closed`) нельзя добавлять сообщения (`409 Conflict`).
     * - Клиент не может создавать служебные заметки (`is_internal = true` -> `422 Unprocessable Entity`).
     * - Писать в заявку может только её автор или сотрудник поддержки (`403 Forbidden`).
     *
     * **Требуемая роль:** Автор заявки (`client`) или сотрудник (`support`, `admin`).
     *
     * @authenticated
     * @urlParam ticket integer required ID заявки. Example: 1
     * @bodyParam body string required Текст сообщения. Example: Здравствуйте! Проблема воспроизводится в браузере Chrome.
     * @bodyParam is_internal boolean Признак внутренней заметки (только для `support`, `admin`). Example: false
     * @bodyParam attachments file[] Вложения к сообщению (до 5 файлов, не более 10 МБ).
     */
    public function store(StoreMessageRequest $request, Ticket $ticket): JsonResponse
    {
        if ($request->user()) {
            Gate::authorize('addMessage', $ticket);
        }

        $message = $this->messages->create($ticket, $request->user(), $request->validated());

        return (new MessageResource($message))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }
}

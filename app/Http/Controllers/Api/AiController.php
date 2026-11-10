<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Ticket;
use App\Services\AiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * @group 9. ИИ-ассистент (Gemini AI)
 *
 * Интеллектуальная классификация обращений и формирование черновиков ответов на основе базы знаний (RAG).
 */
class AiController extends Controller
{
    /**
     * Определение категории и приоритета обращения с помощью ИИ
     *
     * Анализирует тему и описание обращения и предлагает подходящую категорию из справочника и уровень приоритета.
     *
     * **Требуемая роль:** Любой авторизованный пользователь (`client`, `support`, `admin`).
     *
     * @authenticated
     * @bodyParam subject string required Тема обращения. Example: Не могу войти в аккаунт
     * @bodyParam description string required Описание проблемы. Example: Система не принимает пароль после обновления.
     */
    public function suggest(Request $request, AiService $aiService): JsonResponse
    {
        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
        ]);

        $subject = trim($validated['subject']);
        $description = trim($validated['description']);

        $categories = Category::all();

        try {
            $result = $aiService->suggestForTicket($subject, $description, $categories);
        } catch (Throwable $e) {
            Log::error('Ошибка вызова ИИ при классификации заявки, использован fallback', [
                'error' => $e->getMessage(),
            ]);
            $result = $aiService->fallbackClassify($subject, $description, $categories);
        }

        return response()->json([
            'category_id' => $result['category_id'],
            'priority' => $result['priority'],
            'reason' => $result['reason'],
            'data' => $result,
        ], 200);
    }

    /**
     * Генерация черновика ответа специалиста (RAG по базе знаний)
     *
     * Подбирает релевантные статьи базы знаний и формирует вежливый черновик ответа клиенту по заявке.
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     * @urlParam ticket integer required ID заявки. Example: 1
     */
    public function draftReply(Ticket $ticket, AiService $aiService): JsonResponse
    {
        try {
            $result = $aiService->draftReply($ticket);
        } catch (Throwable $e) {
            Log::error('Ошибка вызова ИИ при генерации черновика ответа, использован fallback', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);
            $result = $aiService->fallbackDraft($ticket);
        }

        return response()->json([
            'draft' => $result['draft'],
            'reply' => $result['draft'],
            'sources' => $result['sources'],
            'data' => $result,
        ], 200);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTagRequest;
use App\Http\Resources\TagResource;
use App\Models\Tag;
use App\Services\TagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * @group 6. Метки (Tags)
 *
 * Справочник тегов для классификации заявок. Доступен сотрудникам поддержки и администраторам.
 */
class TagController extends Controller
{
    public function __construct(private readonly TagService $tags)
    {
    }

    /**
     * Список меток
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     */
    public function index(): AnonymousResourceCollection
    {
        return TagResource::collection($this->tags->all());
    }

    /**
     * Создание метки
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     * @bodyParam name string required Уникальное название метки. Example: срочно
     */
    public function store(StoreTagRequest $request): JsonResponse
    {
        $tag = $this->tags->create($request->validated());

        Log::info('Создана метка', ['tag_id' => $tag->id, 'name' => $tag->name]);

        return (new TagResource($tag))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Удаление метки
     *
     * **Требуемая роль:** `support`, `admin`.
     *
     * @authenticated
     * @urlParam tag integer required ID метки. Example: 1
     */
    public function destroy(Tag $tag): Response
    {
        $id = $tag->id;
        $this->tags->delete($tag);

        Log::info('Удалена метка', ['tag_id' => $id]);

        return response()->noContent();
    }
}

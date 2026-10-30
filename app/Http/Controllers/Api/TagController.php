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

class TagController extends Controller
{
    public function __construct(private readonly TagService $tags)
    {
    }

    public function index(): AnonymousResourceCollection
    {
        return TagResource::collection($this->tags->all());
    }

    public function store(StoreTagRequest $request): JsonResponse
    {
        return (new TagResource($this->tags->create($request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function destroy(Tag $tag): Response
    {
        $this->tags->delete($tag);

        return response()->noContent();
    }
}
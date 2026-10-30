<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreKnowledgeBaseArticleRequest;
use App\Http\Requests\UpdateKnowledgeBaseArticleRequest;
use App\Http\Resources\KnowledgeBaseArticleResource;
use App\Models\KnowledgeBaseArticle;
use App\Services\KnowledgeBaseArticleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class KnowledgeBaseArticleController extends Controller
{
    public function __construct(private readonly KnowledgeBaseArticleService $articles)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only(['search', 'category_id', 'is_published', 'per_page']);

        return KnowledgeBaseArticleResource::collection($this->articles->paginate($filters));
    }

    public function store(StoreKnowledgeBaseArticleRequest $request): JsonResponse
    {
        $article = $this->articles->create($request->validated());

        return (new KnowledgeBaseArticleResource($article))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(KnowledgeBaseArticle $article): KnowledgeBaseArticleResource
    {
        return new KnowledgeBaseArticleResource($this->articles->load($article));
    }

    public function update(UpdateKnowledgeBaseArticleRequest $request, KnowledgeBaseArticle $article): KnowledgeBaseArticleResource
    {
        return new KnowledgeBaseArticleResource(
            $this->articles->update($article, $request->validated())
        );
    }

    public function destroy(KnowledgeBaseArticle $article): Response
    {
        $this->articles->delete($article);

        return response()->noContent();
    }
}
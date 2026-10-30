<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class UserController extends Controller
{
    public function __construct(private readonly UserService $users)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only(['role', 'search', 'per_page']);

        return UserResource::collection($this->users->paginate($filters));
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        return (new UserResource($this->users->create($request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        return new UserResource($this->users->update($user, $request->validated()));
    }

    public function destroy(User $user): Response
    {
        $this->users->delete($user);

        return response()->noContent();
    }
}
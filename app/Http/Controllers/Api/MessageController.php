<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Ticket;
use App\Services\MessageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class MessageController extends Controller
{
    public function __construct(private readonly MessageService $messages)
    {
    }

    public function index(Ticket $ticket): AnonymousResourceCollection
    {
        return MessageResource::collection($this->messages->forTicket($ticket));
    }

    public function store(StoreMessageRequest $request, Ticket $ticket): JsonResponse
    {
        $message = $this->messages->create($ticket, $request->validated());

        return (new MessageResource($message))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }
}
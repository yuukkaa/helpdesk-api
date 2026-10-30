<?php

namespace App\Http\Controllers\Api;

use App\Enums\TicketStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\AssignTicketRequest;
use App\Http\Requests\ChangeTicketStatusRequest;
use App\Http\Requests\StoreTicketRequest;
use App\Http\Requests\UpdateTicketRequest;
use App\Http\Resources\TicketResource;
use App\Models\Ticket;
use App\Services\TicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use App\Http\Requests\AttachTicketTagsRequest;
use App\Http\Requests\SyncTicketTagsRequest;
use App\Models\Tag;

class TicketController extends Controller
{
    public function __construct(private readonly TicketService $tickets)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only([
            'status', 'priority', 'category_id', 'assignee_id', 'search', 'per_page',
        ]);

        return TicketResource::collection($this->tickets->paginate($filters));
    }

    public function store(StoreTicketRequest $request): JsonResponse
    {
        $ticket = $this->tickets->create($request->validated());

        return (new TicketResource($ticket))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Ticket $ticket): TicketResource
    {
        return new TicketResource($this->tickets->loadFull($ticket));
    }

    public function update(UpdateTicketRequest $request, Ticket $ticket): TicketResource
    {
        return new TicketResource($this->tickets->update($ticket, $request->validated()));
    }

    public function destroy(Ticket $ticket): Response
    {
        $this->tickets->delete($ticket);

        return response()->noContent();
    }

    public function assign(AssignTicketRequest $request, Ticket $ticket): TicketResource
    {
        return new TicketResource(
            $this->tickets->assign($ticket, (int) $request->validated('assignee_id'))
        );
    }

    public function changeStatus(ChangeTicketStatusRequest $request, Ticket $ticket): TicketResource
    {
        $status = TicketStatus::from($request->validated('status'));

        return new TicketResource($this->tickets->changeStatus($ticket, $status));
    }

        public function attachTags(AttachTicketTagsRequest $request, Ticket $ticket): TicketResource
    {
        return new TicketResource(
            $this->tickets->attachTags($ticket, $request->validated('tag_ids'))
        );
    }

    public function detachTag(Ticket $ticket, Tag $tag): TicketResource
    {
        return new TicketResource($this->tickets->detachTag($ticket, $tag));
    }

    public function syncTags(SyncTicketTagsRequest $request, Ticket $ticket): TicketResource
    {
        return new TicketResource(
            $this->tickets->syncTags($ticket, $request->validated('tag_ids'))
        );
    }
}
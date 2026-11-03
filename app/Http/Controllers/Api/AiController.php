<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Ticket;
use App\Services\AiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiController extends Controller
{
    public function suggest(Request $request, AiService $aiService): JsonResponse
    {
        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
        ]);

        $categories = Category::all();

        $result = $aiService->suggestForTicket(
            $validated['subject'],
            $validated['description'],
            $categories
        );

        return response()->json([
            'category_id' => $result['category_id'],
            'priority' => $result['priority'],
            'reason' => $result['reason'],
            'data' => $result,
        ]);
    }

    public function draftReply(Ticket $ticket, AiService $aiService): JsonResponse
    {
        $result = $aiService->draftReply($ticket);

        return response()->json([
            'draft' => $result['draft'],
            'reply' => $result['draft'],
            'sources' => $result['sources'],
            'data' => $result,
        ]);
    }
}
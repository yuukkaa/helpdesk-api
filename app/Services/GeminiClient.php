<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class GeminiClient
{
    private string $apiKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey = (string) config('services.gemini.key', env('GEMINI_API_KEY', ''));
        $this->baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    }

    public function generateJson(string $system, string $prompt): array
    {
        if (empty($this->apiKey)) {
            return [];
        }

        try {
            $response = Http::withoutVerifying()
                ->timeout(5)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post("{$this->baseUrl}?key={$this->apiKey}", [
                    'system_instruction' => [
                        'parts' => [['text' => $system]],
                    ],
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [['text' => $prompt]],
                        ],
                    ],
                    'generationConfig' => [
                        'response_mime_type' => 'application/json',
                        'temperature' => 0.2,
                    ],
                ]);

            if ($response->failed()) {
                Log::warning('Gemini API JSON Error: ' . $response->status());
                return [];
            }

            $data = $response->json();
            $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '{}';

            return json_decode($text, true) ?: [];
        } catch (Throwable $e) {
            Log::error('Gemini JSON Exception: ' . $e->getMessage());
            return [];
        }
    }

    public function generateText(string $system, string $prompt): string
    {
        if (empty($this->apiKey)) {
            return '';
        }

        try {
            $response = Http::withoutVerifying()
                ->timeout(6)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post("{$this->baseUrl}?key={$this->apiKey}", [
                    'system_instruction' => [
                        'parts' => [['text' => $system]],
                    ],
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [['text' => $prompt]],
                        ],
                    ],
                    'generationConfig' => [
                        'temperature' => 0.4,
                    ],
                ]);

            if ($response->failed()) {
                Log::warning('Gemini API Text Error: ' . $response->status());
                return '';
            }

            $data = $response->json();
            return trim($data['candidates'][0]['content']['parts'][0]['text'] ?? '');
        } catch (Throwable $e) {
            Log::error('Gemini Text Exception: ' . $e->getMessage());
            return '';
        }
    }
}
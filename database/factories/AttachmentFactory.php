<?php

namespace Database\Factories;

use App\Models\Ticket;
use Illuminate\Database\Eloquent\Factories\Factory;

class AttachmentFactory extends Factory
{
    public function definition(): array
    {
        [$name, $mime] = fake()->randomElement([
            ['screenshot.png', 'image/png'],
            ['bank_statement.pdf', 'application/pdf'],
            ['receipt.jpg', 'image/jpeg'],
            ['error_log.txt', 'text/plain'],
        ]);

        return [
            'ticket_id' => Ticket::factory(),
            'message_id' => null,
            'original_name' => $name,
            'path' => 'attachments/'.fake()->uuid().'_'.$name,
            'mime_type' => $mime,
            'size' => fake()->numberBetween(10_000, 5_000_000),
        ];
    }
}
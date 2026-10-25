<?php

namespace App\Http\Requests;

use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'subject' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'category_id' => ['sometimes', 'required', 'integer', 'exists:categories,id'],
            'status' => ['sometimes', Rule::enum(TicketStatus::class)],
            'priority' => ['sometimes', Rule::enum(TicketPriority::class)],
            'assignee_id' => [
                'nullable', 'integer',
                Rule::exists('users', 'id')->whereIn('role', ['support', 'admin']),
            ],
            'resolved_at' => ['nullable', 'date'],
        ];

        $ticket = $this->route('ticket');
        if ($ticket instanceof \App\Models\Ticket) {
            $rules['resolved_at'][] = 'after_or_equal:'.$ticket->created_at->toDateTimeString();
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'subject.max' => 'Тема не должна быть длиннее 255 символов.',
            'category_id.exists' => 'Выбранная категория не существует.',
            'status.enum' => 'Недопустимый статус.',
            'priority.enum' => 'Недопустимый приоритет.',
            'assignee_id.exists' => 'Ответственным может быть только специалист или администратор.',
            'resolved_at.date' => 'Укажите корректную дату решения.',
            'resolved_at.after_or_equal' => 'Дата решения не может быть раньше даты создания.',
        ];
    }
}
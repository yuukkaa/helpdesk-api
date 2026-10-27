<?php

namespace App\Http\Requests;

use App\Enums\TicketPriority;
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
        return [
            'subject' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'category_id' => ['sometimes', 'required', 'integer', 'exists:categories,id'],
            'priority' => ['sometimes', Rule::enum(TicketPriority::class)],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['integer', 'exists:tags,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'subject.max' => 'Тема не должна быть длиннее 255 символов.',
            'category_id.exists' => 'Выбранная категория не существует.',
            'priority.enum' => 'Недопустимый приоритет.',
            'tags.*.exists' => 'Выбранная метка не существует.',
        ];
    }
}
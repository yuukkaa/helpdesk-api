<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssignTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'assignee_id' => ['nullable', 'integer', 'exists:users,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'assignee_id.exists' => 'Указанный пользователь не существует.',
            'user_id.exists' => 'Указанный пользователь не существует.',
        ];
    }
}

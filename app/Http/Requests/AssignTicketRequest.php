<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'assignee_id' => [
                'required', 'integer',
                Rule::exists('users', 'id')->whereIn('role', ['support', 'admin']),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'assignee_id.required' => 'Укажите ответственного.',
            'assignee_id.exists' => 'Ответственным может быть только специалист или администратор.',
        ];
    }
}
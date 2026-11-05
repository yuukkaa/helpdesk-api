<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SuggestTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'subject.required' => 'Укажите тему обращения.',
            'description.required' => 'Опишите проблему.',
            'description.max' => 'Описание не должно быть длиннее 5000 символов.',
        ];
    }
}

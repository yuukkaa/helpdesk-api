<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

class StoreMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string'],
            'is_internal' => [
                'sometimes', 'boolean',
                function (string $attribute, mixed $value, Closure $fail) {
                    if (filter_var($value, FILTER_VALIDATE_BOOLEAN) && $this->user()?->role === UserRole::Client) {
                        $fail('Служебную заметку может создать только специалист или администратор.');
                    }
                },
            ],
            'attachments' => ['sometimes', 'array', 'max:5'],
            'attachments.*' => ['file', 'max:10240', 'mimes:jpg,jpeg,png,pdf,txt,log'],
        ];
    }

    public function messages(): array
    {
        return [
            'body.required' => 'Введите текст сообщения.',
            'attachments.*.max' => 'Размер файла не должен превышать 10 МБ.',
        ];
    }
}
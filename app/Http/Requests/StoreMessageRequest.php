<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Models\User;
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
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'body' => ['required', 'string'],
            'is_internal' => [
                'sometimes', 'boolean',
                function (string $attribute, mixed $value, Closure $fail) {
                    $author = User::find($this->input('user_id'));

                    if (filter_var($value, FILTER_VALIDATE_BOOLEAN) && $author?->role === UserRole::Client) {
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
            'user_id.required' => 'Укажите автора сообщения.',
            'user_id.exists' => 'Указанный пользователь не существует.',
            'body.required' => 'Введите текст сообщения.',
            'attachments.*.max' => 'Размер файла не должен превышать 10 МБ.',
        ];
    }
}
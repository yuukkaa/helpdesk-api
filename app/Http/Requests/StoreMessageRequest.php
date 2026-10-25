<?php

namespace App\Http\Requests;

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
            'is_internal' => ['sometimes', 'boolean'],
            'attachments' => ['sometimes', 'array', 'max:5'],
            'attachments.*' => ['file', 'max:10240', 'mimes:jpg,jpeg,png,pdf,txt,log'],
        ];
    }

    public function messages(): array
    {
        return [
            'body.required' => 'Введите текст сообщения.',
            'is_internal.boolean' => 'Признак служебной заметки должен быть true или false.',
            'attachments.*.max' => 'Размер файла не должен превышать 10 МБ.',
        ];
    }
}
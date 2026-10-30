<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreKnowledgeBaseArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.required' => 'Укажите автора статьи.',
            'user_id.exists' => 'Указанный пользователь не существует.',
            'title.required' => 'Укажите заголовок статьи.',
            'title.max' => 'Заголовок не должен быть длиннее 255 символов.',
            'content.required' => 'Введите текст статьи.',
            'category_id.exists' => 'Выбранная категория не существует.',
            'is_published.boolean' => 'Признак публикации должен быть true или false.',
        ];
    }
}
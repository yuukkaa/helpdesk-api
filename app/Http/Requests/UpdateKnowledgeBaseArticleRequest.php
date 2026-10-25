<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateKnowledgeBaseArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'content' => ['sometimes', 'required', 'string'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.max' => 'Заголовок не должен быть длиннее 255 символов.',
            'category_id.exists' => 'Выбранная категория не существует.',
            'is_published.boolean' => 'Признак публикации должен быть true или false.',
        ];
    }
}
<?php

namespace App\Http\Requests;

use App\Enums\TicketPriority;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'priority' => ['sometimes', Rule::enum(TicketPriority::class)],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['integer', 'exists:tags,id'],
            'attachments' => ['sometimes', 'array', 'max:5'],
            'attachments.*' => ['file', 'max:10240', 'mimes:jpg,jpeg,png,pdf,txt,log'],
        ];
    }

    public function messages(): array
    {
        return [
            'subject.required' => 'Укажите тему обращения.',
            'subject.max' => 'Тема не должна быть длиннее 255 символов.',
            'description.required' => 'Опишите проблему.',
            'category_id.required' => 'Выберите категорию.',
            'category_id.exists' => 'Выбранная категория не существует.',
            'priority.enum' => 'Недопустимый приоритет.',
            'tags.*.exists' => 'Выбранная метка не существует.',
            'attachments.max' => 'Можно прикрепить не более 5 файлов.',
            'attachments.*.max' => 'Размер файла не должен превышать 10 МБ.',
            'attachments.*.mimes' => 'Допустимые типы файлов: jpg, png, pdf, txt, log.',
        ];
    }
}
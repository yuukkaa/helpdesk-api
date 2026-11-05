<?php

namespace App\Http\Requests;

use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TicketFilterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['sometimes', Rule::enum(TicketStatus::class)],
            'priority' => ['sometimes', Rule::enum(TicketPriority::class)],
            'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'assignee_id' => ['sometimes', 'integer', 'exists:users,id'],
            'search' => ['sometimes', 'string', 'max:100'],
            'date_from' => ['sometimes', 'date'],
            'date_to' => ['sometimes', 'date', 'after_or_equal:date_from'],
            'sort' => ['sometimes', Rule::in(['id', 'created_at', 'updated_at', 'status', 'priority'])],
            'order' => ['sometimes', Rule::in(['asc', 'desc'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'status.enum' => 'Недопустимый статус.',
            'priority.enum' => 'Недопустимый приоритет.',
            'category_id.exists' => 'Категория не существует.',
            'assignee_id.exists' => 'Пользователь не существует.',
            'search.max' => 'Строка поиска не должна быть длиннее 100 символов.',
            'date_from.date' => 'Укажите корректную начальную дату.',
            'date_to.date' => 'Укажите корректную конечную дату.',
            'date_to.after_or_equal' => 'Конечная дата не может быть раньше начальной.',
            'sort.in' => 'Сортировка допустима по полям: id, created_at, updated_at, status, priority.',
            'order.in' => 'Направление сортировки: asc или desc.',
            'per_page.max' => 'На странице не более 100 записей.',
            'per_page.min' => 'На странице не менее одной записи.',
        ];
    }
}
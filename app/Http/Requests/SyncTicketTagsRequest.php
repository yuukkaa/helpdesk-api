<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SyncTicketTagsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tag_ids' => ['present', 'array'],
            'tag_ids.*' => ['integer', 'distinct', 'exists:tags,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'tag_ids.present' => 'Передайте список меток (пустой список снимет все метки).',
            'tag_ids.*.exists' => 'Выбранная метка не существует.',
        ];
    }
}
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttachTicketTagsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tag_ids' => ['required', 'array', 'min:1'],
            'tag_ids.*' => ['integer', 'distinct', 'exists:tags,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'tag_ids.required' => 'Укажите метки.',
            'tag_ids.min' => 'Укажите хотя бы одну метку.',
            'tag_ids.*.exists' => 'Выбранная метка не существует.',
        ];
    }
}
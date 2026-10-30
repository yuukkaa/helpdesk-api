<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:tags,name'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Укажите название метки.',
            'name.unique' => 'Метка с таким названием уже существует.',
            'name.max' => 'Название не должно быть длиннее 255 символов.',
        ];
    }
}
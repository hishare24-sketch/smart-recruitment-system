<?php

namespace Modules\Marketplace\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CreateOpportunityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'company' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'salary' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'skills' => 'nullable|array',
            'skills.*' => 'string|max:255',
        ];
    }
}

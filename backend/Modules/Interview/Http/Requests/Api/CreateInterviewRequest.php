<?php

namespace Modules\Interview\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CreateInterviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'track' => 'required|string|in:tech,management,design,data,support',
            'status' => 'nullable|string|max:40',
            'score' => 'nullable|numeric',
            'integrity' => 'nullable|array',
        ];
    }
}

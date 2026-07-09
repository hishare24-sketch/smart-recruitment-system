<?php

namespace Modules\Survey\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CreateSurveyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'state' => 'nullable|string|in:draft,pending,active,paused,closed,archived',
            'pointsPool' => 'nullable|integer|min:0',
            'targeting' => 'nullable|array',
            'questions' => 'nullable|array',
        ];
    }
}

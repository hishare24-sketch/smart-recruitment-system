<?php

namespace Modules\Interviewer\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CreateBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'day' => 'required|string|max:40',
            'slot' => 'required|string|max:40',
            'type' => 'nullable|string|max:255',
            'elements' => 'nullable|array',
            'elements.*' => 'string|max:255',
        ];
    }
}

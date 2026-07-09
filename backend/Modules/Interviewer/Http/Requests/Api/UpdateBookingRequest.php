<?php

namespace Modules\Interviewer\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'sometimes|string|in:pending,accepted,rejected,completed',
            'report' => 'sometimes|nullable|array',
        ];
    }
}

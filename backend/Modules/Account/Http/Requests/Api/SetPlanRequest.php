<?php

namespace Modules\Account\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class SetPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tier' => 'required|string|in:free,pro,elite',
        ];
    }
}

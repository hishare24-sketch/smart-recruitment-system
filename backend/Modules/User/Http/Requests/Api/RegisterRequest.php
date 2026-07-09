<?php

namespace Modules\User\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string|max:30',
            'role' => 'nullable|string|in:seeker,company,endorser,interviewer,coach,trainer,consultant',
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => __('This email is already registered'),
        ];
    }
}

<?php

namespace Modules\User\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\User\Http\Requests\Api\LoginRequest;
use Modules\User\Http\Requests\Api\RegisterRequest;
use Modules\User\Http\Resources\Api\AuthUserResource;
use Modules\User\Services\AuthService;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService) {}

    public function register(RegisterRequest $request)
    {
        $session = $this->authService->register($request->validated());

        return response()->json($this->dataResponse($this->present($session)), 201);
    }

    public function login(LoginRequest $request)
    {
        $session = $this->authService->login($request->validated());

        if ($session === null) {
            return $this->errorResponse(__('The provided credentials are incorrect'), 401);
        }

        return $this->dataResponse($this->present($session));
    }

    public function me(Request $request)
    {
        return $this->dataResponse(AuthUserResource::make($request->user()));
    }

    public function logout(Request $request)
    {
        $this->authService->logout($request->user());

        return $this->updatedResponse(message: __('Logged out successfully'));
    }

    /** جلسة مطابقة للعقد: { token, user }. */
    private function present(array $session): array
    {
        return [
            'token' => $session['token'],
            'user' => AuthUserResource::make($session['user']),
        ];
    }
}

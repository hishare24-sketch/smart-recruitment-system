<?php

namespace Modules\User\Services;

use Illuminate\Support\Facades\Hash;
use Modules\User\Entities\User;

class AuthService
{
    public function register(array $data): array
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'] ?? 'seeker',
        ]);

        return $this->sessionFor($user);
    }

    /** يعيد الجلسة أو null عند فشل بيانات الاعتماد. */
    public function login(array $data): ?array
    {
        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return null;
        }

        return $this->sessionFor($user);
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }

    private function sessionFor(User $user): array
    {
        return [
            'user' => $user,
            'token' => $user->createToken('api')->plainTextToken,
        ];
    }
}

<?php

namespace Modules\Account\Services;

use Illuminate\Support\Carbon;
use Modules\Account\Entities\Wallet;
use Modules\User\Entities\User;

class AccountService
{
    /** سعر كل باقة — الترقية تدفع الفرق من المحفظة، التخفيض مجّانيّ. */
    private const PLAN_PRICE = ['free' => 0, 'pro' => 50, 'elite' => 150];

    /** محفظة المستخدم — تُنشأ برصيد ترحيبيّ عند أول وصول. */
    public function getWallet(int $userId): Wallet
    {
        return Wallet::firstOrCreate(
            ['user_id' => $userId],
            [
                'balance' => 100,
                'transactions' => [[
                    'id' => 1,
                    'amount' => 100,
                    'label' => __('Welcome balance'),
                    'at' => Carbon::now()->toISOString(),
                ]],
            ],
        );
    }

    public function getPlan(int $userId): array
    {
        return ['tier' => User::find($userId)?->tier ?? 'free'];
    }

    /** ترقية/تخفيض الباقة — الترقية تخصم الفرق من المحفظة (402 عند نقص الرصيد). */
    public function setPlan(int $userId, string $tier): array
    {
        $user = User::findOrFail($userId);
        $current = $user->tier ?? 'free';
        $cost = max(0, self::PLAN_PRICE[$tier] - self::PLAN_PRICE[$current]);

        if ($cost > 0) {
            $wallet = $this->getWallet($userId);
            if ($wallet->balance < $cost) {
                abort(402, __('Insufficient funds to upgrade plan'));
            }

            $transactions = $wallet->transactions ?? [];
            $transactions[] = [
                'id' => $this->nextId($transactions),
                'amount' => -$cost,
                'label' => __('Plan upgrade to :tier', ['tier' => $tier]),
                'at' => Carbon::now()->toISOString(),
            ];
            $wallet->balance = $wallet->balance - $cost;
            $wallet->transactions = $transactions;
            $wallet->save();
        }

        $user->tier = $tier;
        $user->save();

        return ['tier' => $tier, 'balance' => (float) $this->getWallet($userId)->balance];
    }

    private function nextId(array $items): int
    {
        return (int) (collect($items)->max('id') ?? 0) + 1;
    }
}

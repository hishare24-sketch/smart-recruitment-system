<?php

namespace Tests\Feature\Api\Account;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\User\Entities\User;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AccountTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    private function actingAsUser(): User
    {
        $user = User::create([
            'name' => 'Payer',
            'email' => 'payer'.uniqid().'@rec.test',
            'password' => 'secret123',
        ]);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_wallet_created_with_welcome_balance(): void
    {
        $this->actingAsUser();

        $this->getJson('/api/v1/wallet')
            ->assertOk()
            ->assertJsonPath('data.balance', 100)
            ->assertJsonPath('data.transactions.0.amount', 100);
    }

    public function test_plan_defaults_to_free(): void
    {
        $this->actingAsUser();

        $this->getJson('/api/v1/account/plan')->assertOk()->assertJsonPath('data.tier', 'free');
    }

    public function test_upgrade_deducts_difference_from_wallet(): void
    {
        $this->actingAsUser();

        $this->putJson('/api/v1/account/plan', ['tier' => 'pro'])
            ->assertOk()
            ->assertJsonPath('data.tier', 'pro')
            ->assertJsonPath('data.balance', 50);

        $this->getJson('/api/v1/account/plan')->assertJsonPath('data.tier', 'pro');
    }

    public function test_upgrade_with_insufficient_funds_returns_402(): void
    {
        $this->actingAsUser();

        // free→elite = 150 > 100 (رصيد ترحيبيّ)
        $this->putJson('/api/v1/account/plan', ['tier' => 'elite'])
            ->assertStatus(402)
            ->assertJsonStructure(['message']);
    }

    public function test_downgrade_is_free(): void
    {
        $this->actingAsUser();
        $this->putJson('/api/v1/account/plan', ['tier' => 'pro']); // balance → 50

        $this->putJson('/api/v1/account/plan', ['tier' => 'free'])
            ->assertOk()
            ->assertJsonPath('data.tier', 'free')
            ->assertJsonPath('data.balance', 50); // بلا خصم
    }

    public function test_setplan_validates_tier(): void
    {
        $this->actingAsUser();

        $this->assertApiValidation($this->putJson('/api/v1/account/plan', ['tier' => 'gold']), 'tier');
    }
}

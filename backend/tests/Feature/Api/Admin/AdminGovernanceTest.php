<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Governance\Database\Seeders\ModerationSeeder;
use Modules\Governance\Entities\ModerationItem;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminGovernanceTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'Reviewer', 'email' => 'gv'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_list_and_filter_queue(): void
    {
        $this->admin();
        $this->seed(ModerationSeeder::class);

        $this->getJson('/api/admin/moderation')->assertOk()->assertJsonStructure(['data' => [['type', 'subject', 'status']], 'meta']);
        $this->getJson('/api/admin/moderation?type=content_report')->assertOk()->assertJsonPath('meta.total', 2);
    }

    public function test_stats_shape(): void
    {
        $this->admin();
        $this->seed(ModerationSeeder::class);

        $this->getJson('/api/admin/moderation/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total', 'pending', 'approved', 'rejected', 'byType', 'byStatus', 'series']])
            ->assertJsonPath('data.pending', 7);
    }

    public function test_resolve_sets_decision_and_guards_double_review(): void
    {
        $reviewer = $this->admin();
        $item = ModerationItem::create(['type' => 'expert_application', 'subject' => 'X', 'status' => 'pending']);

        $this->postJson("/api/admin/moderation/{$item->id}/resolve", ['decision' => 'approved'])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.resolver', $reviewer->name);

        // مراجعة مكرّرة → 405
        $this->postJson("/api/admin/moderation/{$item->id}/resolve", ['decision' => 'rejected'])->assertStatus(405);

        // قرار غير صالح → 422
        $item2 = ModerationItem::create(['type' => 'content_report', 'subject' => 'Y', 'status' => 'pending']);
        $this->postJson("/api/admin/moderation/{$item2->id}/resolve", ['decision' => 'bogus'])->assertStatus(422);
    }

    public function test_non_admin_cannot_view_queue(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'gv'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/moderation')->assertStatus(403);
    }
}

<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Compliance\Database\Seeders\ComplianceDemoSeeder;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminComplianceTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'C', 'email' => 'c'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_overview_reports_totals_and_ai_oversight(): void
    {
        $this->admin();
        $this->seed(ComplianceDemoSeeder::class);

        $this->getJson('/api/admin/compliance/overview')
            ->assertOk()
            ->assertJsonStructure(['data' => ['totals' => ['applicants', 'hired', 'hireRate'], 'dimensions', 'adverseFlags', 'compliant', 'aiOversight' => ['weights', 'aiActive', 'boostEffective', 'governed']]]);
    }

    public function test_adverse_impact_flags_low_selection_group(): void
    {
        $this->admin();
        $this->seed(ComplianceDemoSeeder::class);

        $res = $this->getJson('/api/admin/compliance/adverse-impact?dimension=tier')
            ->assertOk()
            ->assertJsonStructure(['data' => ['dimension', 'groups' => [['group', 'applicants', 'hired', 'selectionRate', 'impactRatio', 'adverse']], 'adverseFlags', 'compliant']])
            ->json('data');

        // الباقة المجّانيّة مُهندَسة لتوظيف منخفض → أثر تمييزيّ
        $free = collect($res['groups'])->firstWhere('group', 'free');
        $this->assertTrue($free['adverse']);
        $this->assertFalse($res['compliant']);
        $this->assertGreaterThanOrEqual(1, $res['adverseFlags']);
    }

    public function test_funnel_groups_by_stage(): void
    {
        $this->admin();
        $this->seed(ComplianceDemoSeeder::class);

        $this->getJson('/api/admin/compliance/funnel?dimension=category')
            ->assertOk()
            ->assertJsonStructure(['data' => ['dimension', 'stages', 'groups' => [['group', 'total', 'stages']], 'representation']]);
    }

    public function test_ai_oversight_reflects_match_governance(): void
    {
        $this->admin();

        $this->getJson('/api/admin/compliance/ai-oversight')
            ->assertOk()
            ->assertJsonStructure(['data' => ['weights' => ['skills', 'experience', 'category'], 'threshold', 'aiBoost', 'aiActive', 'boostEffective', 'governed']]);
    }

    public function test_audit_trail_returns_decision_actions(): void
    {
        $this->admin();

        $this->getJson('/api/admin/compliance/audit-trail')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_non_admin_forbidden(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'u'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/compliance/overview')->assertStatus(403);
    }
}

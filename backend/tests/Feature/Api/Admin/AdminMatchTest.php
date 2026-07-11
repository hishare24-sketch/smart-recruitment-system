<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Ai\Database\Seeders\AiSeeder;
use Modules\Ai\Entities\AiCapability;
use Modules\Marketplace\Entities\Application;
use Modules\Marketplace\Entities\Opportunity;
use Modules\Profile\Entities\Profile;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminMatchTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'A', 'email' => 'mt'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    private function seedMatchData(): Opportunity
    {
        $employer = User::create(['name' => 'Emp', 'email' => 'e'.uniqid().'@rec.test', 'password' => 'secret123']);
        $opp = Opportunity::create(['user_id' => $employer->id, 'title' => 'مطوّر واجهات', 'company' => 'أفق', 'location' => 'عن بُعد', 'salary' => '—', 'category' => 'tech', 'skills' => ['Vue', 'TypeScript']]);

        // مرشّح قويّ (كل المهارات) وضعيف (بلا مهارات)
        $strong = User::create(['name' => 'قويّ', 'email' => 'st'.uniqid().'@rec.test', 'password' => 'secret123']);
        Profile::create(['user_id' => $strong->id, 'skills' => ['Vue', 'TypeScript'], 'experiences' => [['t' => 'a'], ['t' => 'b'], ['t' => 'c']], 'prefs' => ['interestedSectors' => ['tech']]]);
        Application::create(['user_id' => $strong->id, 'opportunity_id' => $opp->id]);

        $weak = User::create(['name' => 'ضعيف', 'email' => 'wk'.uniqid().'@rec.test', 'password' => 'secret123']);
        Application::create(['user_id' => $weak->id, 'opportunity_id' => $opp->id]);

        return $opp;
    }

    public function test_settings_returns_weights_and_ai_state(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);

        $this->getJson('/api/admin/matching/settings')
            ->assertOk()
            ->assertJsonStructure(['data' => ['settings' => ['skillsWeight', 'experienceWeight', 'categoryWeight', 'threshold', 'aiBoost'], 'aiActive']])
            ->assertJsonPath('data.aiActive', true);
    }

    public function test_admin_can_update_weights(): void
    {
        $this->admin();
        $this->putJson('/api/admin/matching/settings', ['skills_weight' => 80, 'threshold' => 70])
            ->assertOk()
            ->assertJsonPath('data.skillsWeight', 80)
            ->assertJsonPath('data.threshold', 70);
        $this->assertDatabaseHas('match_settings', ['skills_weight' => 80]);
    }

    public function test_shortlist_ranks_strong_candidate_first(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);
        $opp = $this->seedMatchData();

        $res = $this->getJson('/api/admin/matching/shortlist?opportunity_id='.$opp->id)
            ->assertOk()
            ->assertJsonStructure(['data' => ['opportunity', 'aiActive', 'threshold', 'shortlist' => [['candidate', 'score', 'breakdown', 'matchedSkills']]]]);

        $list = $res->json('data.shortlist');
        $this->assertSame('قويّ', $list[0]['candidate']);
        $this->assertGreaterThan($list[1]['score'], $list[0]['score']);
        $this->assertContains('vue', $list[0]['matchedSkills']);
    }

    public function test_disabling_matching_capability_turns_off_ai_boost(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);
        AiCapability::where('key', 'candidate_matching')->update(['enabled' => false]);

        $this->getJson('/api/admin/matching/settings')->assertOk()->assertJsonPath('data.aiActive', false);
    }

    public function test_non_admin_cannot_access_matching(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'mt'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/matching/settings')->assertStatus(403);
    }
}

<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminQualityCiTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
        Cache::flush();
        config(['quality.github.repo' => 'owner/repo', 'quality.github.token' => 'x']);
    }

    private function admin(): void
    {
        $admin = User::create(['name' => 'Q', 'email' => 'q'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);
    }

    public function test_ci_maps_github_runs_and_summary(): void
    {
        Http::fake(['api.github.com/*' => Http::response([
            'workflow_runs' => [
                ['id' => 2, 'name' => 'CI', 'head_branch' => 'main', 'event' => 'push', 'status' => 'completed', 'conclusion' => 'success', 'run_number' => 42, 'html_url' => 'https://x/2', 'head_commit' => ['message' => 'green'], 'created_at' => '2026-07-13T00:00:00Z', 'updated_at' => '2026-07-13T00:05:00Z'],
                ['id' => 1, 'name' => 'CI', 'head_branch' => 'main', 'event' => 'push', 'status' => 'completed', 'conclusion' => 'failure', 'run_number' => 41, 'html_url' => 'https://x/1', 'head_commit' => ['message' => 'red'], 'created_at' => '2026-07-12T00:00:00Z', 'updated_at' => '2026-07-12T00:05:00Z'],
            ],
        ], 200)]);

        $this->admin();

        $res = $this->getJson('/api/admin/quality/ci')
            ->assertOk()
            ->assertJsonPath('data.available', true)
            ->assertJsonStructure(['data' => ['repo', 'runs' => [['id', 'name', 'branch', 'status', 'conclusion', 'url']], 'summary' => ['total', 'passRate', 'lastConclusion']]]);

        $this->assertSame(2, $res->json('data.summary.total'));
        $this->assertEquals(50.0, $res->json('data.summary.passRate')); // 1 من 2 ناجح
        $this->assertSame('success', $res->json('data.summary.lastConclusion'));
    }

    public function test_ci_degrades_gracefully_on_github_error(): void
    {
        Http::fake(['api.github.com/*' => Http::response('nope', 500)]);
        $this->admin();

        $this->getJson('/api/admin/quality/ci')
            ->assertOk()
            ->assertJsonPath('data.available', false);
    }

    public function test_ci_unavailable_without_repo(): void
    {
        config(['quality.github.repo' => null]);
        $this->admin();

        $this->getJson('/api/admin/quality/ci')
            ->assertOk()
            ->assertJsonPath('data.available', false)
            ->assertJsonPath('data.reason', 'no_repo');
    }

    public function test_non_admin_cannot_view_ci(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'u'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/quality/ci')->assertStatus(403);
    }
}

<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Interviewer\Entities\Interviewer;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminInterviewerTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'A', 'email' => 'iv'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_list_and_filter_interviewers(): void
    {
        $this->admin();
        Interviewer::create(['name' => 'X', 'specialty' => 'tech', 'status' => 'pending']);
        Interviewer::create(['name' => 'Y', 'specialty' => 'data', 'status' => 'approved']);

        $this->getJson('/api/admin/interviewers')->assertOk()->assertJsonStructure(['data', 'meta'])->assertJsonPath('meta.total', 2);
        $this->getJson('/api/admin/interviewers?status=pending')->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_admin_can_approve_and_reject_interviewer(): void
    {
        $this->admin();
        $interviewer = Interviewer::create(['name' => 'X', 'specialty' => 'tech', 'status' => 'pending']);

        $this->postJson("/api/admin/interviewers/{$interviewer->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->postJson("/api/admin/interviewers/{$interviewer->id}/reject")
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');

        $this->deleteJson("/api/admin/interviewers/{$interviewer->id}")->assertOk();
        $this->assertDatabaseMissing('interviewers', ['id' => $interviewer->id]);
    }

    public function test_admin_can_create_interviewer_and_read_stats(): void
    {
        $this->admin();

        $this->postJson('/api/admin/interviewers', ['name' => 'مقيّم جديد', 'specialty' => 'tech', 'rating' => 4.7, 'price_from' => 200])
            ->assertStatus(201)
            ->assertJsonPath('data.name', 'مقيّم جديد')
            ->assertJsonPath('data.status', 'approved');

        $this->getJson('/api/admin/interviewers/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total', 'approved', 'pending', 'avgRating', 'byStatus', 'bySpecialty']])
            ->assertJsonPath('data.total', 1);
    }

    public function test_non_admin_cannot_list_interviewers(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'iv'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/interviewers')->assertStatus(403);
    }
}

<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

/**
 * فجوات إدارة المستخدمين (DOC/TEST_CASES.md ADM-004..027): التحقّق 422، الصلاحيّات
 * الدقيقة 403 (create_users/update_roles)، 404، والبحث/الفلترة/الفرز الآمن.
 * المسار السعيد مُغطّى في AdminAccessTest.
 */
class AdminUserTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function user(): User
    {
        return User::create(['name' => 'U', 'email' => 'u'.uniqid().'@rec.test', 'password' => 'secret123']);
    }

    private function superAdmin(): User
    {
        $a = $this->user();
        $a->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($a);

        return $a;
    }

    /** أدمن بصلاحيّات محدّدة فقط (لاختبار البوّابات الدقيقة). */
    private function adminWith(array $perms): User
    {
        $a = $this->user();
        $role = Role::create(['name' => 'ltd_'.uniqid(), 'guard_name' => 'admin']);
        $role->givePermissionTo($perms);
        $a->assignRole($role);
        Sanctum::actingAs($a);

        return $a;
    }

    // ── store: التحقّق والصلاحيّة ──
    public function test_store_requires_name_email_password(): void // ADM-010
    {
        $this->superAdmin();
        $this->assertApiValidation($this->postJson('/api/admin/users', []), 'name');
        $this->assertApiValidation($this->postJson('/api/admin/users', ['name' => 'X']), 'email');
        $this->assertApiValidation($this->postJson('/api/admin/users', ['name' => 'X', 'email' => 'x@y.z']), 'password');
    }

    public function test_store_rejects_duplicate_email(): void // ADM-011
    {
        $this->superAdmin();
        $existing = $this->user();
        $this->assertApiValidation(
            $this->postJson('/api/admin/users', ['name' => 'X', 'email' => $existing->email, 'password' => 'secret123']),
            'email',
        );
    }

    public function test_store_rejects_short_password_and_bad_enums(): void // ADM-012/013
    {
        $this->superAdmin();
        $this->assertApiValidation($this->postJson('/api/admin/users', ['name' => 'X', 'email' => 'a'.uniqid().'@t.co', 'password' => '123']), 'password');
        $this->assertApiValidation($this->postJson('/api/admin/users', ['name' => 'X', 'email' => 'b'.uniqid().'@t.co', 'password' => 'secret123', 'tier' => 'gold']), 'tier');
        $this->assertApiValidation($this->postJson('/api/admin/users', ['name' => 'X', 'email' => 'c'.uniqid().'@t.co', 'password' => 'secret123', 'kind' => 'alien']), 'kind');
    }

    public function test_store_applies_defaults(): void // ADM-014
    {
        $this->superAdmin();
        $email = 'd'.uniqid().'@t.co';
        $this->postJson('/api/admin/users', ['name' => 'X', 'email' => $email, 'password' => 'secret123'])->assertCreated();
        $this->assertDatabaseHas('users', ['email' => $email, 'role' => 'seeker', 'tier' => 'free', 'kind' => 'individual']);
    }

    public function test_store_forbidden_without_create_users(): void // ADM-015
    {
        $this->adminWith(['view_users']); // يمرّ الحارس لكن authorize(create_users) يرفض
        $this->postJson('/api/admin/users', ['name' => 'X', 'email' => 'e'.uniqid().'@t.co', 'password' => 'secret123'])
            ->assertStatus(403);
    }

    // ── show/update ──
    public function test_show_missing_user_returns_404(): void // ADM-017
    {
        $this->superAdmin();
        $this->getJson('/api/admin/users/999999')->assertStatus(404);
    }

    public function test_update_ignores_own_email_on_unique(): void // ADM-019
    {
        $admin = $this->superAdmin();
        $this->patchJson("/api/admin/users/{$admin->id}", ['email' => $admin->email, 'name' => 'محدَّث'])
            ->assertOk()->assertJsonPath('data.name', 'محدَّث');
    }

    public function test_activate_restores_status(): void // ADM-023
    {
        $this->superAdmin();
        $target = $this->user();
        $target->update(['status' => 'suspended']);
        $this->postJson("/api/admin/users/{$target->id}/activate")->assertOk();
        $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => 'active']);
    }

    // ── admin-role ──
    public function test_set_admin_role_rejects_unknown_role(): void // ADM-026
    {
        $this->superAdmin();
        $target = $this->user();
        $this->assertApiValidation($this->putJson("/api/admin/users/{$target->id}/admin-role", ['role' => 'wizard']), 'role');
    }

    public function test_set_admin_role_forbidden_without_update_roles(): void // ADM-027
    {
        $this->adminWith(['view_users', 'update_users']); // بلا update_roles
        $target = $this->user();
        $this->putJson("/api/admin/users/{$target->id}/admin-role", ['role' => 'admin'])->assertStatus(403);
    }

    // ── list: بحث/فلترة/فرز ──
    public function test_index_search_matches_name_email(): void // ADM-004
    {
        $this->superAdmin();
        User::create(['name' => 'زهرة الفريدة', 'email' => 'zahra-unique@t.co', 'password' => 'secret123']);
        $res = $this->getJson('/api/admin/users?q=zahra-unique')->assertOk();
        $emails = collect($res->json('data'))->pluck('email');
        $this->assertTrue($emails->contains('zahra-unique@t.co'));
    }

    public function test_index_filters_by_role(): void // ADM-005
    {
        $this->superAdmin();
        User::create(['name' => 'C', 'email' => 'co'.uniqid().'@t.co', 'password' => 'secret123', 'role' => 'company']);
        $res = $this->getJson('/api/admin/users?role=company')->assertOk();
        $this->assertNotEmpty($res->json('data'));
        foreach ($res->json('data') as $row) {
            $this->assertSame('company', $row['role']);
        }
    }

    public function test_index_ignores_unsafe_sort_column(): void // ADM-006/007
    {
        $this->superAdmin();
        // عمود غير مسموح (حقن) لا يكسر — يسقط للافتراضيّ ويعيد 200
        $this->getJson('/api/admin/users?sort=password')->assertOk()->assertJsonStructure(['data', 'meta']);
        $this->getJson('/api/admin/users?sort=-created_at')->assertOk();
    }
}

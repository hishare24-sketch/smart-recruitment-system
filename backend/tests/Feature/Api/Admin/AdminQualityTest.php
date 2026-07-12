<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Quality\Entities\TestCase as TestCaseAtom;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminQualityTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'Q', 'email' => 'q'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_import_populates_atoms_from_registry(): void
    {
        $this->artisan('quality:import')->assertSuccessful();

        // السجلّ الحقيقيّ يحوي مئات الحالات عبر الطبقتين
        $this->assertGreaterThan(300, TestCaseAtom::count());
        $this->assertGreaterThan(0, TestCaseAtom::where('status', 'automated')->count());
        $this->assertGreaterThan(0, TestCaseAtom::where('status', 'gap')->count());
        $this->assertContains('backend', TestCaseAtom::distinct()->pluck('layer')->all());
        $this->assertContains('frontend', TestCaseAtom::distinct()->pluck('layer')->all());
    }

    public function test_import_is_idempotent(): void
    {
        $this->artisan('quality:import')->assertSuccessful();
        $first = TestCaseAtom::count();
        $this->artisan('quality:import')->assertSuccessful();

        $this->assertSame($first, TestCaseAtom::count());
    }

    public function test_overview_returns_counters_breakdowns_and_series(): void
    {
        $this->admin();
        $this->artisan('quality:import');

        $res = $this->getJson('/api/admin/quality/overview')
            ->assertOk()
            ->assertJsonStructure(['data' => [
                'total', 'automated', 'gap', 'failing', 'critical', 'criticalGaps', 'coverage',
                'byLayer' => [['key', 'count']],
                'byStatus' => [['key', 'count']],
                'topGapSections',
                'series' => [['date', 'coverage', 'total', 'automated']],
            ]]);

        $this->assertGreaterThan(0, $res->json('data.total'));
        // التغطية = مؤتمَت / الإجمالي × 100 (تناسق)
        $data = $res->json('data');
        $expected = round($data['automated'] / $data['total'] * 100, 1);
        $this->assertSame($expected, $data['coverage']);
    }

    public function test_atoms_list_paginates_and_filters(): void
    {
        $this->admin();
        $this->artisan('quality:import');

        // بلا فلتر → صفحة + meta
        $this->getJson('/api/admin/quality/atoms')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['caseId', 'title', 'layer', 'section', 'type', 'priority', 'status']],
                'meta' => ['current_page', 'last_page', 'itemPerPage', 'total'],
            ]);

        // فلتر layer=backend & status=gap → كلّ الصفوف مطابقة
        $rows = $this->getJson('/api/admin/quality/atoms?layer=backend&status=gap&perPage=50')
            ->assertOk()->json('data');

        $this->assertNotEmpty($rows);
        foreach ($rows as $row) {
            $this->assertSame('backend', $row['layer']);
            $this->assertSame('gap', $row['status']);
        }
    }

    public function test_atoms_search_matches_case_id(): void
    {
        $this->admin();
        $this->artisan('quality:import');

        $rows = $this->getJson('/api/admin/quality/atoms?q=AUTH-01')
            ->assertOk()->json('data');

        $this->assertNotEmpty($rows);
        $this->assertStringContainsString('AUTH', $rows[0]['caseId']);
    }

    public function test_non_admin_cannot_view_quality(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'u'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/quality/overview')->assertStatus(403);
        $this->getJson('/api/admin/quality/atoms')->assertStatus(403);
    }
}

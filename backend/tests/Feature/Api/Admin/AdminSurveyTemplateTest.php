<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Survey\Database\Seeders\SurveyTemplateSeeder;
use Modules\Survey\Entities\Survey;
use Modules\Survey\Entities\SurveyTemplate;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminSurveyTemplateTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'A', 'email' => 'st'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_list_and_filter_templates(): void
    {
        $this->admin();
        $this->seed(SurveyTemplateSeeder::class);

        $this->getJson('/api/admin/survey-templates')->assertOk()->assertJsonStructure(['data', 'meta'])->assertJsonPath('meta.total', 5);
        $this->getJson('/api/admin/survey-templates?category=nps')->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_admin_can_create_template_with_questions(): void
    {
        $this->admin();

        $this->postJson('/api/admin/survey-templates', [
            'name' => 'نموذج مخصّص',
            'category' => 'custom',
            'questions' => [
                ['text' => 'سؤالك؟', 'type' => 'single', 'options' => ['نعم', 'لا']],
                ['text' => 'رأيك؟', 'type' => 'longtext'],
            ],
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.questionsCount', 2)
            ->assertJsonPath('data.is_system', false);

        // نوع سؤال غير صالح → 422
        $this->postJson('/api/admin/survey-templates', ['name' => 'x', 'category' => 'poll', 'questions' => [['text' => 'q', 'type' => 'bogus']]])
            ->assertStatus(422);
    }

    public function test_delete_guards_system_templates(): void
    {
        $this->admin();
        $this->seed(SurveyTemplateSeeder::class);

        $system = SurveyTemplate::where('is_system', true)->first();
        $this->deleteJson("/api/admin/survey-templates/{$system->id}")->assertStatus(405);

        $custom = SurveyTemplate::create(['name' => 'c', 'category' => 'custom', 'is_system' => false]);
        $this->deleteJson("/api/admin/survey-templates/{$custom->id}")->assertOk();
        $this->assertDatabaseMissing('survey_templates', ['id' => $custom->id]);
    }

    public function test_templates_stats_shape(): void
    {
        $this->admin();
        $this->seed(SurveyTemplateSeeder::class);

        $this->getJson('/api/admin/survey-templates/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total', 'active', 'system', 'custom', 'distribution']])
            ->assertJsonPath('data.system', 5);
    }

    public function test_survey_stats_shape(): void
    {
        $owner = $this->admin();
        Survey::create(['user_id' => $owner->id, 'title' => 'S', 'state' => 'active', 'responses' => [['a' => 1], ['a' => 2]]]);

        $this->getJson('/api/admin/surveys/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total', 'active', 'responses', 'avgResponses', 'distribution', 'series']])
            ->assertJsonPath('data.responses', 2);
    }

    public function test_non_admin_cannot_list_templates(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'st'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/survey-templates')->assertStatus(403);
    }
}

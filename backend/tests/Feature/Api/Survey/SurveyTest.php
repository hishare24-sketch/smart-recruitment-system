<?php

namespace Tests\Feature\Api\Survey;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Survey\Entities\Survey;
use Modules\User\Entities\User;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class SurveyTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    private function actingAsUser(string $tier = 'free'): User
    {
        $user = User::create([
            'name' => 'Owner',
            'email' => 'sv'.uniqid().'@rec.test',
            'password' => 'secret123',
            'tier' => $tier,
        ]);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_create_survey_returns_201(): void
    {
        $this->actingAsUser('pro');

        $this->postJson('/api/v1/surveys', ['title' => 'NPS', 'pointsPool' => 10])
            ->assertStatus(201)
            ->assertJsonPath('data.title', 'NPS')
            ->assertJsonPath('data.state', 'draft')
            ->assertJsonPath('data.pointsPool', 10);
    }

    public function test_free_tier_limited_to_one_survey(): void
    {
        $this->actingAsUser('free');
        $this->postJson('/api/v1/surveys', ['title' => 'First'])->assertStatus(201);

        $this->postJson('/api/v1/surveys', ['title' => 'Second'])
            ->assertStatus(403)
            ->assertJsonStructure(['message']);
    }

    public function test_list_returns_my_surveys_desc(): void
    {
        $user = $this->actingAsUser('pro');
        $this->postJson('/api/v1/surveys', ['title' => 'A']);
        $this->postJson('/api/v1/surveys', ['title' => 'B']);

        $this->getJson('/api/v1/surveys')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'B')
            ->assertJsonPath('data.1.title', 'A');
    }

    public function test_response_spends_a_point_from_pool(): void
    {
        $user = $this->actingAsUser('pro');
        $this->postJson('/api/v1/surveys', ['title' => 'Poll', 'pointsPool' => 3]);
        $survey = Survey::first();

        $this->postJson("/api/v1/surveys/{$survey->id}/responses", ['q1' => 'yes'])
            ->assertStatus(201);

        $this->assertSame(2, $survey->fresh()->points_pool);
        $this->assertCount(1, $survey->fresh()->responses);
    }

    public function test_create_validates_title(): void
    {
        $this->actingAsUser('pro');

        $this->assertApiValidation($this->postJson('/api/v1/surveys', ['pointsPool' => 5]), 'title');
    }
}

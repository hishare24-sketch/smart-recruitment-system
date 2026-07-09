<?php

namespace Tests\Support\Api;

use Illuminate\Testing\TestResponse;

trait AssertsApiJson
{
    protected function assertApiSuccess(TestResponse $response, int $status = 200): void
    {
        $response->assertStatus($status)->assertJsonStructure(['data']);
    }

    protected function assertApiUpdated(TestResponse $response, int $status = 200): void
    {
        $response->assertStatus($status)->assertJsonStructure(['message']);
    }

    protected function assertApiForbidden(TestResponse $response, ?string $message = null): void
    {
        $response->assertStatus(405)->assertJsonStructure(['data', 'message']);
        if ($message !== null) {
            $response->assertJsonPath('message', $message);
        }
    }

    protected function assertApiValidation(TestResponse $response, array|string $keys): void
    {
        $response->assertStatus(422)->assertJsonValidationErrors((array) $keys);
    }

    protected function assertApiUnauthenticated(TestResponse $response): void
    {
        $response->assertStatus(401)->assertJsonPath('message', 'Unauthenticated.');
    }
}

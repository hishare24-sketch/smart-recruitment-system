<?php

namespace Tests\Unit\Quality;

use Modules\Quality\Entities\RuntimeError;
use Modules\Quality\Services\QualityAgentService;
use PHPUnit\Framework\TestCase;

class QualityAgentTriageTest extends TestCase
{
    private function triage(array $attrs): array
    {
        return (new QualityAgentService)->triage(new RuntimeError(array_merge([
            'type' => 'api_5xx', 'severity' => 'high', 'count' => 1, 'message' => 'x', 'scope' => null,
        ], $attrs)));
    }

    public function test_routes_5xx_to_backend(): void
    {
        $t = $this->triage(['type' => 'api_5xx', 'severity' => 'high', 'count' => 1]);
        $this->assertSame('backend', $t['department']);
        $this->assertSame('diagnose', $t['action']); // high + count<5
    }

    public function test_critical_escalates_and_render_goes_frontend(): void
    {
        $t = $this->triage(['type' => 'render', 'severity' => 'critical']);
        $this->assertSame('frontend', $t['department']);
        $this->assertSame('escalate', $t['action']);
    }

    public function test_high_recurring_escalates(): void
    {
        $t = $this->triage(['type' => 'api_5xx', 'severity' => 'high', 'count' => 9]);
        $this->assertSame('escalate', $t['action']); // count>=5
    }

    public function test_slow_goes_ops_and_warning_tracks(): void
    {
        $t = $this->triage(['type' => 'slow', 'severity' => 'warning']);
        $this->assertSame('ops', $t['department']);
        $this->assertSame('track', $t['action']);
    }

    public function test_filter_message_routes_to_filters(): void
    {
        $t = $this->triage(['type' => 'console', 'severity' => 'warning', 'message' => 'filter facet crashed']);
        $this->assertSame('filters', $t['department']);
    }

    public function test_info_is_ignored(): void
    {
        $t = $this->triage(['type' => 'api_4xx', 'severity' => 'info']);
        $this->assertSame('ignore', $t['action']);
    }
}

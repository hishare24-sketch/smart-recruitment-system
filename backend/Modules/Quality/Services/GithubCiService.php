<?php

namespace Modules\Quality\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * حالة CI حيًّا من GitHub Actions (ف4). يُخزَّن مؤقتًا 60ث لتفادي حدود المعدّل.
 * يتدهور بلطف: بلا مستودع/توكن أو عند فشل الطلب → available=false.
 */
class GithubCiService
{
    public function latest(int $limit = 15): array
    {
        $repo = config('quality.github.repo');
        $token = config('quality.github.token');

        if (! $repo) {
            return ['available' => false, 'reason' => 'no_repo'];
        }

        return Cache::remember("quality:ci:{$repo}:{$limit}", 60, function () use ($repo, $token, $limit) {
            try {
                $req = Http::acceptJson()->withHeaders(['X-GitHub-Api-Version' => '2022-11-28'])->timeout(8);
                if ($token) {
                    $req = $req->withToken($token);
                }
                $res = $req->get("https://api.github.com/repos/{$repo}/actions/runs", ['per_page' => $limit]);

                if (! $res->successful()) {
                    return ['available' => false, 'reason' => 'http_'.$res->status(), 'repo' => $repo];
                }

                $runs = collect($res->json('workflow_runs', []))->map(fn ($r) => [
                    'id' => $r['id'] ?? null,
                    'name' => $r['name'] ?? $r['display_title'] ?? '—',
                    'branch' => $r['head_branch'] ?? null,
                    'event' => $r['event'] ?? null,
                    'status' => $r['status'] ?? null,          // queued|in_progress|completed
                    'conclusion' => $r['conclusion'] ?? null,  // success|failure|cancelled|null
                    'runNumber' => $r['run_number'] ?? null,
                    'url' => $r['html_url'] ?? null,
                    'commit' => mb_substr((string) ($r['head_commit']['message'] ?? ''), 0, 80),
                    'createdAt' => $r['created_at'] ?? null,
                    'updatedAt' => $r['updated_at'] ?? null,
                ])->values();

                $completed = $runs->where('status', 'completed');
                $passed = $completed->where('conclusion', 'success')->count();

                return [
                    'available' => true,
                    'repo' => $repo,
                    'runs' => $runs->all(),
                    'summary' => [
                        'total' => $runs->count(),
                        'passRate' => $completed->count() > 0 ? round($passed / $completed->count() * 100, 1) : null,
                        'lastConclusion' => $runs->first()['conclusion'] ?? null,
                    ],
                ];
            } catch (\Throwable) {
                return ['available' => false, 'reason' => 'exception', 'repo' => $repo];
            }
        });
    }
}

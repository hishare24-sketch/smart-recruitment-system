<?php

namespace Modules\Governance\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Modules\Governance\Entities\ModerationItem;
use Modules\Governance\Http\Resources\Admin\AdminModerationResource;

class AdminModerationController extends Controller
{
    private const SORTABLE = ['id', 'type', 'status', 'created_at'];
    private const DECISIONS = ['approved', 'rejected', 'resolved'];

    /** طابور المراجعة — بحث + فلترة نوع/حالة + فرز + ترقيم. */
    public function index(Request $request)
    {
        $this->authorize('view_governance');

        $query = ModerationItem::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('subject', 'like', "%{$q}%")->orWhere('submitter_name', 'like', "%{$q}%");
            });
        }
        foreach (['type', 'status'] as $filter) {
            if ($v = $request->query($filter)) {
                $query->where($filter, $v);
            }
        }

        [$column, $dir] = $this->parseSort((string) $request->query('sort', '-id'), self::SORTABLE);
        $query->orderBy($column, $dir);

        $items = $query->paginate((int) $request->query('perPage', 15));
        $items->setCollection(
            $items->getCollection()->map(fn (ModerationItem $m) => (new AdminModerationResource($m))->resolve())
        );

        return $this->dashboardResponse($items);
    }

    /** إحصاءات الطابور — المعلّق + التوزيع بالنوع والحالة + سلسلة. */
    public function stats()
    {
        $this->authorize('view_governance');

        $all = ModerationItem::get(['type', 'status', 'created_at']);
        $byType = $all->groupBy('type')->map->count()->map(fn ($c, $x) => ['label' => $x, 'value' => (int) $c])->values();
        $byStatus = $all->groupBy('status')->map->count()->map(fn ($c, $x) => ['label' => $x, 'value' => (int) $c])->values();

        $raw = ModerationItem::where('created_at', '>=', Carbon::now()->subDays(13)->startOfDay())
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')->groupBy('d')->pluck('c', 'd');
        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->toDateString();
            $series[] = ['date' => $date, 'value' => (int) ($raw[$date] ?? 0)];
        }

        return $this->dataResponse([
            'total' => $all->count(),
            'pending' => (int) $all->where('status', 'pending')->count(),
            'approved' => (int) $all->where('status', 'approved')->count(),
            'rejected' => (int) $all->where('status', 'rejected')->count(),
            'byType' => $byType,
            'byStatus' => $byStatus,
            'series' => $series,
        ]);
    }

    /** بتّ عنصر — approved | rejected | resolved (المعلّق فقط). */
    public function resolve(Request $request, ModerationItem $item)
    {
        $this->authorize('manage_governance');

        $data = $request->validate([
            'decision' => ['required', 'in:'.implode(',', self::DECISIONS)],
        ]);

        if ($item->status !== 'pending') {
            return $this->forbiddenResponse(__('This item has already been reviewed.'));
        }

        $user = current_user();
        $item->update([
            'status' => $data['decision'],
            'resolved_by' => $user?->id,
            'resolver_name' => $user?->name,
            'resolved_at' => Carbon::now(),
        ]);

        return $this->updatedResponse((new AdminModerationResource($item->fresh()))->resolve());
    }
}

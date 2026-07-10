<?php

namespace Modules\Interviewer\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Interviewer\Entities\Interviewer;
use Modules\Interviewer\Http\Resources\Admin\AdminInterviewerResource;

class AdminInterviewerController extends Controller
{
    private const SORTABLE = ['id', 'name', 'specialty', 'status', 'rating', 'price_from', 'created_at'];

    /** قائمة المقيّمين — بحث بالاسم/التخصّص + فلترة حالة/تخصّص + فرز + ترقيم. */
    public function index(Request $request)
    {
        $this->authorize('view_interviewers');

        $query = Interviewer::with('user');

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('name', 'like', "%{$q}%")->orWhere('specialty', 'like', "%{$q}%");
            });
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($specialty = $request->query('specialty')) {
            $query->where('specialty', $specialty);
        }

        [$column, $dir] = $this->parseSort((string) $request->query('sort', '-rating'), self::SORTABLE);
        $query->orderBy($column, $dir);

        $items = $query->paginate((int) $request->query('perPage', 15));
        $items->setCollection(
            $items->getCollection()->map(fn (Interviewer $i) => (new AdminInterviewerResource($i))->resolve())
        );

        return $this->dashboardResponse($items);
    }

    /** اعتماد مقيّم (يظهر في السوق العامّ). */
    public function approve(Interviewer $interviewer)
    {
        $this->authorize('approve_interviewers');
        $interviewer->update(['status' => 'approved']);

        return $this->updatedResponse((new AdminInterviewerResource($interviewer->load('user')))->resolve());
    }

    /** رفض مقيّم (يُخفى من السوق العامّ). */
    public function reject(Interviewer $interviewer)
    {
        $this->authorize('reject_interviewers');
        $interviewer->update(['status' => 'rejected']);

        return $this->updatedResponse((new AdminInterviewerResource($interviewer->load('user')))->resolve());
    }

    /** حذف مقيّم. */
    public function destroy(Interviewer $interviewer)
    {
        $this->authorize('update_interviewers');
        $interviewer->delete();

        return $this->updatedResponse(null, __('Deleted successfully'));
    }
}

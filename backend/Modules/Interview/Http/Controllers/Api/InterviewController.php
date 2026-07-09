<?php

namespace Modules\Interview\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Interview\Http\Requests\Api\CreateInterviewRequest;
use Modules\Interview\Http\Resources\Api\InterviewResource;
use Modules\Interview\Services\InterviewService;

class InterviewController extends Controller
{
    public function __construct(private readonly InterviewService $service) {}

    public function index(Request $request)
    {
        return $this->dataResponse(InterviewResource::collection($this->service->list($request->user()->id)));
    }

    public function store(CreateInterviewRequest $request)
    {
        $interview = $this->service->create($request->user()->id, $request->validated());

        return response()->json($this->dataResponse(InterviewResource::make($interview)), 201);
    }
}

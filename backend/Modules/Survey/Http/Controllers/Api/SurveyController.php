<?php

namespace Modules\Survey\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Survey\Http\Requests\Api\CreateSurveyRequest;
use Modules\Survey\Http\Resources\Api\SurveyResource;
use Modules\Survey\Services\SurveyService;

class SurveyController extends Controller
{
    public function __construct(private readonly SurveyService $service) {}

    public function index(Request $request)
    {
        return $this->dataResponse(SurveyResource::collection($this->service->list($request->user()->id)));
    }

    public function store(CreateSurveyRequest $request)
    {
        $survey = $this->service->create($request->user()->id, $request->validated());

        return response()->json($this->dataResponse(SurveyResource::make($survey)), 201);
    }

    public function respond(Request $request, int $id)
    {
        $this->service->addResponse($id, $request->all());

        return response()->json(['message' => __('Response recorded')], 201);
    }
}

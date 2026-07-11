<?php

namespace Modules\Marketplace\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Marketplace\Http\Requests\Api\CreateOpportunityRequest;
use Modules\Marketplace\Http\Resources\Api\MarketRequestResource;
use Modules\Marketplace\Http\Resources\Api\OpportunityResource;
use Modules\Marketplace\Services\MarketplaceService;

class MarketplaceController extends Controller
{
    public function __construct(private readonly MarketplaceService $service) {}

    public function opportunities(Request $request)
    {
        $page = $this->service->listOpportunities($request->query('q'), $request->query('category'), $this->perPage($request));

        return $this->paginatedResource($page, OpportunityResource::class);
    }

    public function storeOpportunity(CreateOpportunityRequest $request)
    {
        $opp = $this->service->createOpportunity($request->user()->id, $request->validated());

        return response()->json($this->dataResponse(OpportunityResource::make($opp)), 201);
    }

    public function apply(Request $request, int $id)
    {
        $this->service->apply($request->user()->id, $id);

        return response()->json(['message' => __('Application submitted')], 201);
    }

    public function requests(Request $request)
    {
        $page = $this->service->listRequests($request->query('type'), $this->perPage($request));

        return $this->paginatedResource($page, MarketRequestResource::class);
    }

    public function myRequests(Request $request)
    {
        $page = $this->service->listMyRequests($request->user()->id, $this->perPage($request));

        return $this->paginatedResource($page, MarketRequestResource::class);
    }
}

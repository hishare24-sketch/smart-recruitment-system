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
        $items = $this->service->listOpportunities($request->query('q'), $request->query('category'));

        return $this->dataResponse(OpportunityResource::collection($items));
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
        $items = $this->service->listRequests($request->query('type'));

        return $this->dataResponse(MarketRequestResource::collection($items));
    }

    public function myRequests(Request $request)
    {
        return $this->dataResponse(MarketRequestResource::collection($this->service->listMyRequests($request->user()->id)));
    }
}

<?php

namespace Modules\Account\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Account\Http\Requests\Api\SetPlanRequest;
use Modules\Account\Http\Resources\Api\WalletResource;
use Modules\Account\Services\AccountService;

class AccountController extends Controller
{
    public function __construct(private readonly AccountService $service) {}

    public function wallet(Request $request)
    {
        return $this->dataResponse(WalletResource::make($this->service->getWallet($request->user()->id)));
    }

    public function plan(Request $request)
    {
        return $this->dataResponse($this->service->getPlan($request->user()->id));
    }

    public function setPlan(SetPlanRequest $request)
    {
        return $this->dataResponse($this->service->setPlan($request->user()->id, $request->validated()['tier']));
    }
}
